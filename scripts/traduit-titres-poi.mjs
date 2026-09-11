/**
 * traduit-titres-poi.mjs — RETRADUIT les TITRES d'étapes avec le prompt corrigé.
 *
 * ─── POURQUOI UNE SECONDE CAMPAGNE SUR LES TITRES ───
 *
 * La première (2026-09-03) a écrit 3 880 `SceneSegment.translatedTitle` dont
 * **3 717 identiques au français** : la consigne du prompt disait « les
 * toponymes restent en français », et le modèle l'appliquait au titre ENTIER.
 * Un visiteur espagnol lisait « Maison natale de Toulouse-Lautrec » et
 * « Jardins de la Berbie ». Constaté sur appareil par l'exploitant : « les
 * titres des itinéraires pourraient être traduits, ce ne sont pas que des
 * emplacements ». La consigne sépare désormais le nom propre (intact) du terme
 * descriptif (traduit) — voir `prompt.ts`.
 *
 * ─── CE QUI LE DISTINGUE DE `traduit-descriptions-poi.mjs` ───
 *
 * Il ÉCRASE par défaut (`--forcer` implicite sur les traductions identiques au
 * français) : sans cela, l'idempotence du premier script sauterait précisément
 * les 3 717 lignes à corriger. Il ne touche PAS les 148 traductions qui
 * diffèrent déjà — elles sont justes, les refaire serait payer deux fois.
 *
 * Le reste est identique : même traducteur que le pipeline (`traduireScene`,
 * `kind: 'title'`), périmètre des visites publiées, débit du grand livre à
 * porter a posteriori (AD-16 §1).
 *
 * ─── USAGE (PowerShell) ───
 *
 *   npx tsx scripts/traduit-titres-poi.mjs                # simulation
 *   npx tsx scripts/traduit-titres-poi.mjs --confirm      # execute
 *   npx tsx scripts/traduit-titres-poi.mjs --confirm --langue es
 */

import { requireBackend } from './_backend.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, ScanCommand, UpdateCommand} from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-1';
const SUF = (() => { const b = requireBackend(); return `${b.appId}-${b.env}`; })();
const CHEMIN_SSM = '/amplify/dieqe5vfmuc69/main-branch-347ea276f6';
const PARALLELISME = 8;

const CONFIRME = process.argv.includes('--confirm');
const iLim = process.argv.indexOf('--limite');
// FAIL-CLOSED (revue adversariale du 2026-09-04) : `--limite` sans nombre
// lançait la campagne ENTIÈRE au lieu de ne rien faire.
const LIMITE = iLim >= 0 ? Number(process.argv[iLim + 1]) : null;
if (iLim >= 0 && (!Number.isInteger(LIMITE) || LIMITE <= 0)) {
  console.error('--limite exige un entier > 0');
  process.exit(2);
}
const iLang = process.argv.indexOf('--langue');
const LANGUE_SEULE = iLang >= 0 ? process.argv[iLang + 1] : null;
if (iLang >= 0 && (!LANGUE_SEULE || LANGUE_SEULE.startsWith('--'))) {
  console.error('--langue exige un code de langue');
  process.exit(2);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAMBDA_DIR = path.resolve(HERE, '..', '..', 'TourGuideApp', 'amplify', 'functions', 'translate-claude');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({region: REGION}), {
  marshallOptions: {removeUndefinedValues: true},
});

async function scanAll(table, extra = {}) {
  const out = [];
  let k;
  do {
    const r = await dynamo.send(new ScanCommand({TableName: `${table}-${SUF}`, ExclusiveStartKey: k, ...extra}));
    out.push(...(r.Items ?? []));
    k = r.LastEvaluatedKey;
  } while (k);
  return out;
}

async function lireSecret(nom) {
  const {execFile} = await import('node:child_process');
  const {promisify} = await import('node:util');
  const run = promisify(execFile);
  const {stdout} = await run(
    'aws',
    ['ssm', 'get-parameter', '--region', REGION, '--name', `${CHEMIN_SSM}/${nom}`, '--with-decryption', '--query', 'Parameter.Value', '--output', 'text'],
    {shell: process.platform === 'win32', maxBuffer: 1 << 20},
  );
  const v = stdout.trim();
  if (!v || v === 'None') throw new Error(`${nom} absent de SSM`);
  return v;
}

async function main() {
  const {traduireScene, coutCentimes, creerClient} = await import(
    pathToFileURL(path.join(LAMBDA_DIR, 'handler.ts')).href
  );
  const {LANGUES_CIBLES} = await import(pathToFileURL(path.join(LAMBDA_DIR, 'contrat.ts')).href);
  const langues = LANGUE_SEULE ? [LANGUE_SEULE] : [...LANGUES_CIBLES];
  if (LANGUE_SEULE && !LANGUES_CIBLES.includes(LANGUE_SEULE)) {
    throw new Error(`--langue ${LANGUE_SEULE} hors cibles (${LANGUES_CIBLES.join(', ')})`);
  }

  const tours = (await scanAll('GuideTour')).filter(t => t.status === 'published');
  const parSession = new Map(tours.filter(t => t.sessionId).map(t => [t.sessionId, t]));
  const scenes = (await scanAll('StudioScene')).filter(
    s => !s.archived && parSession.has(s.sessionId) && typeof s.title === 'string' && s.title.trim(),
  );
  const segments = await scanAll('SceneSegment');
  const segParCle = new Map(segments.map(g => [`${g.sceneId}#${g.language}`, g]));

  const travaux = [];
  let dejaJustes = 0;
  let sansLigne = 0;
  for (const s of scenes) {
    const tour = parSession.get(s.sessionId);
    const titre = s.title.trim();
    for (const langue of langues) {
      const seg = segParCle.get(`${s.id}#${langue}`);
      if (!seg) {
        sansLigne += 1;
        continue;
      }
      const actuel = typeof seg.translatedTitle === 'string' ? seg.translatedTitle.trim() : '';
      // LA SEULE CONDITION DE REPRISE : la traduction manque, ou elle est
      // identique au français (c'est le défaut à corriger). Une traduction qui
      // diffère déjà est JUSTE — la refaire serait payer deux fois.
      if (actuel && actuel !== titre) {
        dejaJustes += 1;
        continue;
      }
      travaux.push({scene: s, seg, langue, tour, titre});
    }
  }
  const aFaire = LIMITE ? travaux.slice(0, LIMITE) : travaux;

  console.log(`Scenes publiees                       : ${scenes.length}`);
  console.log(`(Scene, langue) A RETRADUIRE          : ${travaux.length}${LIMITE ? `  (limite a ${aFaire.length})` : ''}`);
  console.log(`deja traduites differemment (gardees) : ${dejaJustes}`);
  console.log(`sans ligne SceneSegment (sautees)     : ${sansLigne}`);

  if (!CONFIRME) {
    for (const t of aFaire.slice(0, 5)) {
      console.log(`  ex. [${t.langue}] ${JSON.stringify(t.titre)}`);
    }
    console.log('\nSIMULATION. Relancer avec --confirm pour traduire et ecrire.');
    return;
  }

  const client = creerClient(process.env.ANTHROPIC_API_KEY || (await lireSecret('ANTHROPIC_API_KEY')));
  const usageTotal = {input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0};
  let faits = 0;
  let inchanges = 0;
  const echecs = [];

  async function unite(t) {
    const issue = await traduireScene({
      client,
      texte: t.titre,
      sourceLang: 'fr',
      targetLang: t.langue,
      kind: 'title',
      contexte: {tourTitle: t.tour.title ?? null, city: t.tour.city ?? null, sceneTitle: null},
    });
    if (!issue.ok) {
      echecs.push({cle: `${t.scene.id}#${t.langue}`, code: issue.code, message: issue.message});
      return;
    }
    for (const k of Object.keys(usageTotal)) usageTotal[k] += issue.usage?.[k] ?? 0;
    const traduit = issue.texte.trim();
    if (traduit === t.titre) {
      // Légitime : « Pont Vieux » n'a rien à traduire. On l'écrit quand même —
      // sinon la prochaine campagne le reprendrait indéfiniment.
      inchanges += 1;
    }
    await dynamo.send(
      new UpdateCommand({
        TableName: `SceneSegment-${SUF}`,
        Key: {id: t.seg.id},
        UpdateExpression: 'SET translatedTitle = :t, updatedAt = :u',
        ExpressionAttributeValues: {':t': traduit, ':u': new Date().toISOString()},
      }),
    );
    faits += 1;
    if (faits % 200 === 0) console.log(`  ... ${faits}/${aFaire.length}`);
  }

  const file = [...aFaire];
  await Promise.all(
    Array.from({length: PARALLELISME}, async () => {
      while (file.length) {
        const t = file.shift();
        if (t) await unite(t);
      }
    }),
  );

  const centimes = coutCentimes(usageTotal);
  console.log('\nTERMINE.');
  console.log(`  ecrits : ${faits}   dont inchanges (noms propres) : ${inchanges}   echecs : ${echecs.length}`);
  console.log(`  jetons : ${JSON.stringify(usageTotal)}`);
  console.log(`  cout fournisseur : ${centimes} centimes (${(centimes / 100).toFixed(2)} USD)`);
  console.log('  A PORTER AU GRAND LIVRE : interne#campagne-titres-poi-v2#multi');
  if (echecs.length) {
    const j = path.join(HERE, `traduit-titres-poi.echecs-${faits}.json`);
    fs.writeFileSync(j, JSON.stringify(echecs, null, 2));
    console.log('  journal des echecs :', j);
  }
}

main().catch(e => {
  console.error('ECHEC :', e?.stack ?? String(e));
  process.exit(2);
});
