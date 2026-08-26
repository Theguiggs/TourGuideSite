/**
 * rattrapage-titres-traduits.mjs — projette les titres traduits sur le modèle
 * que lit le catalogue.
 *
 * Les titres traduits vivent sur `StudioSession.translatedTitles`, que le Studio
 * édite. `GuideTour` est ce que lit le catalogue, et n'a jamais porté le champ.
 * Ce script comble l'écart pour l'existant ; le chemin d'approbation s'en charge
 * désormais pour les publications suivantes.
 *
 * Ce qu'il ne fait PAS : rendre les titres visibles. Aucune surface ne lit encore
 * les métadonnées traduites de `GuideTour` — ni le portail, ni l'app. L'affichage
 * dans la langue du visiteur est une story distincte, qui attend la Langue
 * d'interface. Ici on rend la donnée disponible, pas affichée.
 *
 * Ce qu'il fait, dans cet ordre :
 *   1. lit GuideTour et StudioSession, sans rien écrire ;
 *   2. calcule pour chaque Visite publiée la carte FUSIONNÉE — jamais un
 *      remplacement : une langue déjà persistée et absente de la session survit ;
 *   3. n'écrit que les Visites dont la carte change réellement ;
 *   4. dépose un journal de ce qui a été écrit.
 *
 * Idempotent : relancer après `--apply` n'écrit rien. La règle appliquée ici est
 * celle de `src/lib/api/translated-metadata.ts` — clés normalisées, valeurs
 * élaguées, blancs écartés. Toute divergence entre les deux ferait osciller les
 * cartes entre publication et rattrapage.
 *
 *   node scripts/rattrapage-titres-traduits.mjs                 # simulation (défaut)
 *   node scripts/rattrapage-titres-traduits.mjs --apply         # écriture
 *   node scripts/rattrapage-titres-traduits.mjs --tour <id>     # une seule Visite
 */

import fs from 'node:fs';
import path from 'node:path';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { doc, table, scanAll, asMap, banner, hasFlag, LANGS, BACKUP_DIR } from './retrad-lib.mjs';

const APPLY = hasFlag('apply');
const onlyIdx = process.argv.indexOf('--tour');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

// `--tour` en dernier argument rendait `undefined`, que le filtre lisait comme
// « pas de restriction » : la commande censée viser UNE Visite les réécrivait
// toutes. Un drapeau mal formé s'arrête, il ne s'élargit pas.
if (onlyIdx >= 0 && (!ONLY || ONLY.startsWith('--'))) {
  console.error("  --tour attend un identifiant de Visite. Reçu : " + (ONLY ?? '(rien)'));
  process.exit(2);
}

banner(`rattrapage des titres traduits  [${APPLY ? 'ÉCRITURE' : 'SIMULATION'}]`);

/**
 * Jumeau de `normalizeLanguageTag` (src/lib/api/audio-source-policy.ts).
 * `'EN-GB'` et `'en_US'` se replient sur `'en'` ; le reste est écarté.
 */
function normalizeLang(raw) {
  if (typeof raw !== 'string') return null;
  const primary = raw.trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(primary) ? primary : null;
}

/**
 * Jumeau de `parseTranslatedMetadata`. Un titre blanc est ÉCARTÉ plutôt que
 * persisté : en base, `''` est indiscernable d'une traduction manquante pour
 * tout lecteur, mais il occupe la clé et fait passer la langue pour traduite.
 */
function parseTitles(raw) {
  const out = {};
  for (const [key, value] of Object.entries(asMap(raw))) {
    const lang = normalizeLang(key);
    if (!lang || typeof value !== 'string') continue;
    const text = value.trim();
    if (text) out[lang] = text;
  }
  return out;
}

/**
 * Jumeau de `isPublicCatalogueTour` (src/lib/api/public-tour-policy.ts),
 * échappatoire comprise. N'influe que sur le DÉCOMPTE affiché : la boucle
 * d'écriture, elle, traite toute Visite publiée.
 */
function estDuCatalogue(tour) {
  if (process.env.E2E_ALLOW_TEST_TOURS === 'true') return true;
  const title = (tour.title ?? '').trimStart().toLowerCase();
  return !title.startsWith('e2e-') && !title.startsWith('persistence test ');
}

const sameMap = (a, b) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
};

// ── Lecture ────────────────────────────────────────────────────────────────
const [tours, sessions] = await Promise.all([scanAll('GuideTour'), scanAll('StudioSession')]);
const sessionById = new Map(sessions.map((s) => [s.id, s]));

const published = tours.filter((t) => t.status === 'published' && (!ONLY || t.id === ONLY));
if (ONLY && published.length === 0) {
  console.log(`  Aucune Visite publiée d'identifiant « ${ONLY} ». Rien à faire.`);
  process.exit(0);
}

// ── Calcul ─────────────────────────────────────────────────────────────────
const aEcrire = [];
const dejaAJour = [];
const sansSource = [];

for (const tour of published) {
  const persisted = parseTitles(tour.translatedTitles);
  const session = tour.sessionId ? sessionById.get(tour.sessionId) : null;
  const fromSession = parseTitles(session?.translatedTitles);
  const merged = { ...persisted, ...fromSession };
  const langs = Object.keys(merged).sort();
  const row = {
    id: tour.id,
    title: (tour.title ?? '').slice(0, 46),
    catalogue: estDuCatalogue(tour),
    langs,
    manquantes: LANGS.filter((l) => !merged[l]),
    merged,
    // Valeur BRUTE d'avant écriture. Sans elle, un --apply erroné — mauvais
    // stack, fusion fautive — serait irréversible : le journal dirait quelles
    // Visites ont bougé, pas comment les remettre.
    avant: tour.translatedTitles ?? null,
  };

  if (langs.length === 0) sansSource.push(row);
  else if (sameMap(persisted, merged)) dejaAJour.push(row);
  else aEcrire.push(row);
}

// ── Décompte ───────────────────────────────────────────────────────────────
const parLangue = Object.fromEntries(LANGS.map((l) => [l, 0]));
const catalogueComplet = [];
for (const row of [...aEcrire, ...dejaAJour]) {
  for (const l of row.langs) if (l in parLangue) parLangue[l]++;
  if (row.catalogue && row.manquantes.length === 0) catalogueComplet.push(row);
}
const catalogue = [...aEcrire, ...dejaAJour, ...sansSource].filter((r) => r.catalogue);

console.log(`  Visites publiées          : ${published.length}`);
console.log(`    dont catalogue          : ${catalogue.length}  (le reste est une fixture de test)`);
console.log(`  À mettre à jour           : ${aEcrire.length}`);
console.log(`  Déjà à jour               : ${dejaAJour.length}`);
console.log(`  Sans titre traduit nulle part : ${sansSource.length}`);
console.log(`  Catalogue complet en ${LANGS.length} langues : ${catalogueComplet.length} / ${catalogue.length}`);
console.log(`  Couverture par langue     : ${LANGS.map((l) => `${l}=${parLangue[l]}`).join('  ')}`);

const partielles = [...aEcrire, ...dejaAJour].filter((r) => r.catalogue && r.manquantes.length);
if (partielles.length) {
  console.log(`\n  Visites de catalogue incomplètes (${partielles.length}) :`);
  for (const r of partielles) console.log(`    ${r.id}  manque ${r.manquantes.join(',')}  — ${r.title}`);
}
const sansSourceCatalogue = sansSource.filter((r) => r.catalogue);
if (sansSourceCatalogue.length) {
  console.log(`\n  Visites de catalogue sans aucun titre traduit (${sansSourceCatalogue.length}) :`);
  for (const r of sansSourceCatalogue) console.log(`    ${r.id}  — ${r.title}`);
}

if (!APPLY) {
  console.log(`\n  SIMULATION — rien n'a été écrit. Relancer avec --apply pour écrire.`);
  process.exit(0);
}

// ── Écriture ───────────────────────────────────────────────────────────────
if (aEcrire.length === 0) {
  console.log(`\n  Rien à écrire : toutes les Visites publiées sont déjà à jour.`);
  process.exit(0);
}

const journal = { startedAt: new Date().toISOString(), ecrites: [], echecs: [] };
const journalPath = path.join(
  BACKUP_DIR,
  `rattrapage-titres-${journal.startedAt.replace(/[:.]/g, '-')}.json`,
);

/**
 * Le journal est réécrit à chaque écriture, pas seulement à la fin : un
 * processus interrompu au milieu laissait des écritures appliquées sans aucune
 * trace de ce qui avait bougé, donc sans retour arrière possible.
 */
function flushJournal() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf8');
  } catch (e) {
    console.error(`    Journal non écrit (${e?.message ?? String(e)}) — écritures poursuivies.`);
  }
}

let n = 0;
for (const row of aEcrire) {
  try {
    await doc.send(
      new UpdateCommand({
        TableName: table('GuideTour'),
        Key: { id: row.id },
        // DynamoDB fait un upsert par défaut : sans cette condition, une Visite
        // supprimée entre le balayage et l'écriture ressusciterait en item
        // fantôme ne portant que id + translatedTitles, dans la table même que
        // lit le catalogue.
        ConditionExpression: 'attribute_exists(id)',
        UpdateExpression: 'SET translatedTitles = :t, updatedAt = :u',
        ExpressionAttributeValues: { ':t': row.merged, ':u': new Date().toISOString() },
      }),
    );
    journal.ecrites.push({ id: row.id, langs: row.langs, avant: row.avant, apres: row.merged });
    n++;
    flushJournal();
    if (n % 20 === 0) console.log(`    ${n} / ${aEcrire.length}…`);
  } catch (e) {
    const raison = e?.name === 'ConditionalCheckFailedException'
      ? "Visite disparue entre le balayage et l'écriture"
      : (e?.message ?? String(e));
    journal.echecs.push({ id: row.id, error: raison });
    flushJournal();
    console.error(`    ÉCHEC ${row.id} : ${raison}`);
  }
}

journal.finishedAt = new Date().toISOString();
flushJournal();

console.log(`
  Écrites : ${journal.ecrites.length}   Échecs : ${journal.echecs.length}`);
console.log(`  Journal : ${path.relative(process.cwd(), journalPath)}  (porte la valeur d'avant)`);
console.log(`  Relancer sans --apply doit annoncer « À mettre à jour : 0 ».`);

// Un rattrapage partiel ne doit pas passer pour un succès auprès d'un
// enchaînement de commandes ou d'un opérateur pressé.
if (journal.echecs.length) {
  console.error(`
  ${journal.echecs.length} Visite(s) non rattrapée(s). Relancer pour reprendre.`);
  process.exitCode = 1;
}
