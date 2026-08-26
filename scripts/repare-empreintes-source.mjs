/**
 * repare-empreintes-source.mjs — recalcule `SceneSegment.sourceTextHash` pour
 * que le Studio cesse d'annoncer les Visites comme périmées.
 *
 * Ce que la certification a trouvé : les 3 810 empreintes semées le 2026-08-23
 * ont été calculées par une copie de `hashSourceText` qui joignait le texte et
 * le titre par une ESPACE, là où l'application les joint par un caractère NUL
 * (`src/types/studio.ts`, octet nul littéral, invisible à la relecture). Aucune
 * empreinte stockée ne peut donc être retrouvée par `isSegmentStale` : le
 * Studio affiche les 101 Visites « à retraduire », dans les cinq langues.
 *
 * Ce script ne touche QUE `sourceTextHash`. Ni le texte, ni les titres, ni
 * l'audio, ni les langues vendues : la retraduction elle-même est saine, seule
 * sa marque de fraîcheur est fausse.
 *
 * L'empreinte vient de `source-hash.cjs` — implémentation unique, épinglée à
 * celle de l'application par une épreuve Jest. C'est la condition pour que
 * cette réparation ne rejoue pas le défaut qu'elle répare.
 *
 * Idempotent : relancer n'écrit rien. Simulation par défaut.
 *
 *   node scripts/repare-empreintes-source.mjs           # simulation
 *   node scripts/repare-empreintes-source.mjs --apply   # écriture
 *   node scripts/repare-empreintes-source.mjs --apply --tour <id>
 */

import fs from 'node:fs';
import path from 'node:path';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  doc, table, scanAll, banner, hasFlag, hashSourceText, BASE_LANG, BACKUP_DIR,
} from './retrad-lib.mjs';

const APPLY = hasFlag('apply');
const onlyIdx = process.argv.indexOf('--tour');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

// Même garde que les autres scripts d'exploitation : un drapeau mal formé
// s'arrête, il ne s'élargit pas en « toutes les Visites ».
if (onlyIdx >= 0 && (!ONLY || ONLY.startsWith('--'))) {
  console.error('  --tour attend un identifiant de Visite. Reçu : ' + (ONLY ?? '(rien)'));
  process.exit(2);
}

banner(`réparation des empreintes de source  [${APPLY ? 'ÉCRITURE' : 'SIMULATION'}]`);

let segments;
let scenes;
try {
  [segments, scenes] = await Promise.all([scanAll('SceneSegment'), scanAll('StudioScene')]);
} catch (e) {
  console.error(`  ARRÊT — lecture du backend impossible : ${e?.message ?? String(e)}`);
  process.exit(2);
}

const sceneById = new Map(scenes.map((s) => [s.id, s]));

const aReparer = [];
const dejaJustes = [];
const sansScene = [];

for (const seg of segments) {
  // La langue de base n'a pas d'empreinte de traduction : elle EST la source.
  if (seg.language === BASE_LANG) continue;
  const scene = sceneById.get(seg.sceneId);
  if (!scene) { sansScene.push(seg.id ?? seg.sceneId); continue; }
  // Les `sceneId` semés sont formés `{tourId}-scene-N` : le préfixe est le seul
  // rattachement disponible ici, `SceneSegment` ne portant pas de `tourId`. Un
  // demi-filtre serait pire que pas de filtre — celui-ci est exact pour le
  // corpus semé, et ne prétend rien au-delà.
  if (ONLY && !seg.sceneId.startsWith(`${ONLY}-`)) continue;

  const attendu = hashSourceText(scene.transcriptText, scene.title);
  const ligne = {
    id: seg.id,
    sceneId: seg.sceneId,
    langue: seg.language,
    avant: seg.sourceTextHash ?? null,
    apres: attendu,
  };
  if (seg.sourceTextHash === attendu) dejaJustes.push(ligne);
  else aReparer.push(ligne);
}

console.log(`  Segments traduits         : ${aReparer.length + dejaJustes.length}`);
console.log(`  À réparer                 : ${aReparer.length}`);
console.log(`  Déjà justes               : ${dejaJustes.length}`);
if (sansScene.length) console.log(`  Sans scène source (ignorés) : ${sansScene.length}`);

const parLangue = {};
for (const l of aReparer) parLangue[l.langue] = (parLangue[l.langue] ?? 0) + 1;
if (aReparer.length) {
  console.log(`  Par langue                : ${Object.entries(parLangue).map(([l, n]) => `${l}=${n}`).join('  ')}`);
}

if (!APPLY) {
  console.log("\n  SIMULATION — rien n'a été écrit. Relancer avec --apply pour écrire.");
  process.exit(0);
}
if (aReparer.length === 0) {
  console.log('\n  Rien à écrire : toutes les empreintes sont déjà justes.');
  process.exit(0);
}

const journal = { startedAt: new Date().toISOString(), reparees: [], echecs: [] };
const journalPath = path.join(
  BACKUP_DIR,
  `reparation-empreintes-${journal.startedAt.replace(/[:.]/g, '-')}.json`,
);

/** Journal réécrit à chaque succès : une interruption ne doit pas effacer la trace. */
function flushJournal() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf8');
  } catch (e) {
    console.error(`    Journal non écrit (${e?.message ?? String(e)}) — écritures poursuivies.`);
  }
}

let n = 0;
for (const ligne of aReparer) {
  try {
    await doc.send(new UpdateCommand({
      TableName: table('SceneSegment'),
      Key: { id: ligne.id },
      // Upsert par défaut : sans cette condition, un segment supprimé entre le
      // balayage et l'écriture ressusciterait en item fantôme.
      ConditionExpression: 'attribute_exists(id)',
      UpdateExpression: 'SET sourceTextHash = :h, updatedAt = :u',
      ExpressionAttributeValues: { ':h': ligne.apres, ':u': new Date().toISOString() },
    }));
    journal.reparees.push(ligne);
    n++;
    if (n % 200 === 0) { flushJournal(); console.log(`    ${n} / ${aReparer.length}…`); }
  } catch (e) {
    const raison = e?.name === 'ConditionalCheckFailedException'
      ? 'segment disparu entre le balayage et l\'écriture'
      : (e?.message ?? String(e));
    journal.echecs.push({ ...ligne, error: raison });
    console.error(`    ÉCHEC ${ligne.sceneId}/${ligne.langue} : ${raison}`);
  }
}

journal.finishedAt = new Date().toISOString();
flushJournal();

console.log(`\n  Réparées : ${journal.reparees.length}   Échecs : ${journal.echecs.length}`);
console.log(`  Journal  : ${path.relative(process.cwd(), journalPath)}  (porte la valeur d'avant)`);
console.log('  Contrôler ensuite : npm run certifie:retraduction');

if (journal.echecs.length) process.exitCode = 1;
