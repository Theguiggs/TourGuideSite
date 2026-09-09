/**
 * traduit-descriptions-poi.mjs — traduit les SOUS-TITRES d'étapes
 * (`StudioScene.poiDescription`) vers les cinq langues, et les écrit sur
 * `SceneSegment.translatedDescription`.
 *
 * ─── POURQUOI CE SCRIPT EXISTE ───
 *
 * Retour terrain du 2026-09-03 : sur une fiche anglaise, l'itinéraire montrait
 * le nom du lieu en français (légitime — un nom ne se traduit pas) mais AUSSI
 * le sous-titre éditorial en français (« Une place née d'un couvent ») — et
 * lui doit se traduire. AUCUNE traduction n'existait, nulle part : il faut
 * PRODUIRE la donnée. La couche de lecture (schéma, résolveur, mobile) est
 * fusionnée avec la PR #43 ; ce script remplit ce qu'elle lit.
 *
 * ─── LE TRADUCTEUR EST CELUI DU PIPELINE, PAS UNE COPIE ───
 *
 * `traduireScene` est importé du code de la Lambda déployée
 * (TourGuideApp/amplify/functions/translate-claude) — « on l'appelle LUI :
 * réécrire le prompt ici en produirait une seconde version », la règle posée
 * par `eprouve-traduction-claude.mjs`. `kind: 'title'` : le régime des textes
 * courts. D'où `npx tsx`, le pipeline vit en TypeScript.
 *
 * ─── CE QU'IL NE FAIT PAS ───
 *
 *  · il ne CRÉE jamais une ligne SceneSegment : une ligne porte bien plus que
 *    la description, la fabriquer à moitié serait pire que la sauter. Les
 *    (Scène, langue) sans ligne sont journalisées et sautées ;
 *  · il n'écrase jamais une traduction déjà posée — relançable sans risque ;
 *  · il ne débite PAS le grand livre tout seul : un script qui appelle le
 *    fournisseur hors du portail est la fuite qu'AD-16 §1 nomme. Il IMPRIME le
 *    total (jetons, centimes) à porter à l'enveloppe interne par
 *    `debitInternalSpend` — la même dette assumée que `regenere-grasse-fr.mjs`.
 *
 * ─── PÉRIMÈTRE ───
 *
 * Les visites PUBLIÉES seulement : l'argent va au visible. Barcelone (draft)
 * attendra sa publication — le script est idempotent, on le relancera.
 *
 * ─── USAGE (PowerShell) ───
 *
 *   npx tsx scripts/traduit-descriptions-poi.mjs                # simulation
 *   npx tsx scripts/traduit-descriptions-poi.mjs --confirm      # exécute
 *   npx tsx scripts/traduit-descriptions-poi.mjs --confirm --limite 5
 *   npx tsx scripts/traduit-descriptions-poi.mjs --confirm --langue en
 *
 * La clé vient de SSM (le même secret que la Lambda) — jamais d'une variable
 * recopiée. `ANTHROPIC_API_KEY` d'environnement la court-circuite si posée.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-1';
const SUF = 'yvupc5stqzaxrgz6wv2wz7he5y-NONE';
const CHEMIN_SSM = '/amplify/dieqe5vfmuc69/main-branch-347ea276f6';
const PARALLELISME = 8;

const CONFIRME = process.argv.includes('--confirm');
const iLim = process.argv.indexOf('--limite');
const LIMITE = iLim >= 0 ? Number(process.argv[iLim + 1]) : null;
const iLang = process.argv.indexOf('--langue');
const LANGUE_SEULE = iLang >= 0 ? process.argv[iLang + 1] : null;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAMBDA_DIR = path.resolve(HERE, '..', '..', 'TourGuideApp', 'amplify', 'functions', 'translate-claude');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

async function scanAll(table, extra = {}) {
  const out = [];
  let k;
  do {
    const r = await dynamo.send(
      new ScanCommand({ TableName: `${table}-${SUF}`, ExclusiveStartKey: k, ...extra }),
    );
    out.push(...(r.Items ?? []));
    k = r.LastEvaluatedKey;
  } while (k);
  return out;
}

async function lireSecret(nom) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const { stdout } = await run(
    'aws',
    ['ssm', 'get-parameter', '--region', REGION, '--name', `${CHEMIN_SSM}/${nom}`, '--with-decryption', '--query', 'Parameter.Value', '--output', 'text'],
    { shell: process.platform === 'win32', maxBuffer: 1 << 20 },
  );
  const v = stdout.trim();
  if (!v || v === 'None') throw new Error(`${nom} absent de SSM`);
  return v;
}

async function main() {
  // ── Le pipeline, tel qu'il est déployé ──
  const { traduireScene, coutCentimes, creerClient, LANGUES_CIBLES } = {
    ...(await import(pathToFileURL(path.join(LAMBDA_DIR, 'handler.ts')).href)),
    ...(await import(pathToFileURL(path.join(LAMBDA_DIR, 'contrat.ts')).href)),
  };
  const langues = LANGUE_SEULE ? [LANGUE_SEULE] : [...LANGUES_CIBLES];
  if (LANGUE_SEULE && !LANGUES_CIBLES.includes(LANGUE_SEULE)) {
    throw new Error(`--langue ${LANGUE_SEULE} hors cibles (${LANGUES_CIBLES.join(', ')})`);
  }

  // ── Le périmètre : Scènes des visites PUBLIÉES, avec sous-titre ──
  const tours = (await scanAll('GuideTour')).filter(t => t.status === 'published');
  const parSession = new Map(tours.filter(t => t.sessionId).map(t => [t.sessionId, t]));
  const scenes = (await scanAll('StudioScene')).filter(
    s => !s.archived && parSession.has(s.sessionId) && typeof s.poiDescription === 'string' && s.poiDescription.trim(),
  );
  const segments = await scanAll('SceneSegment');
  const segParCle = new Map(segments.map(g => [`${g.sceneId}#${g.language}`, g]));

  // ── Le travail : (Scène, langue) avec ligne SceneSegment et sans traduction ──
  const travaux = [];
  const sansLigne = [];
  for (const s of scenes) {
    const tour = parSession.get(s.sessionId);
    for (const langue of langues) {
      const seg = segParCle.get(`${s.id}#${langue}`);
      if (!seg) {
        sansLigne.push(`${s.id}#${langue}`);
        continue;
      }
      if (typeof seg.translatedDescription === 'string' && seg.translatedDescription.trim()) {
        continue; // déjà fait — idempotent
      }
      travaux.push({ scene: s, seg, langue, tour });
    }
  }
  const aFaire = LIMITE ? travaux.slice(0, LIMITE) : travaux;

  const totalChars = aFaire.reduce((a, t) => a + t.scene.poiDescription.trim().length, 0);
  console.log(`Scenes publiees avec sous-titre : ${scenes.length}`);
  console.log(`(Scene, langue) a traduire      : ${travaux.length}${LIMITE ? `  (limite a ${aFaire.length})` : ''}`);
  console.log(`(Scene, langue) SANS ligne SceneSegment — sautees : ${sansLigne.length}`);
  console.log(`Caracteres source a traduire    : ${totalChars}`);

  if (!CONFIRME) {
    for (const t of aFaire.slice(0, 5)) {
      console.log(`  ex. [${t.langue}] ${JSON.stringify(t.scene.poiDescription.trim().slice(0, 60))}  (${t.tour.title?.slice(0, 30)})`);
    }
    console.log('\nSIMULATION. Relancer avec --confirm pour traduire et ecrire.');
    return;
  }

  const cle = process.env.ANTHROPIC_API_KEY || (await lireSecret('ANTHROPIC_API_KEY'));
  const client = creerClient(cle);

  // ── Exécution, parallélisme borné ──
  const usageTotal = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  let faits = 0;
  let appels = 0;
  const echecs = [];

  async function unite(t) {
    const texte = t.scene.poiDescription.trim();
    const issue = await traduireScene({
      client,
      texte,
      sourceLang: 'fr',
      targetLang: t.langue,
      kind: 'title',
      contexte: {
        tourTitle: t.tour.title ?? null,
        city: t.tour.city ?? null,
        sceneTitle: t.scene.title ?? null,
      },
    });
    appels += issue.appels ?? 0;
    if (!issue.ok) {
      echecs.push({ cle: `${t.scene.id}#${t.langue}`, code: issue.code, message: issue.message });
      return;
    }
    for (const k of Object.keys(usageTotal)) usageTotal[k] += issue.usage?.[k] ?? 0;
    await dynamo.send(
      new UpdateCommand({
        TableName: `SceneSegment-${SUF}`,
        Key: { id: t.seg.id },
        UpdateExpression: 'SET translatedDescription = :d, updatedAt = :t',
        ConditionExpression: 'attribute_not_exists(translatedDescription) OR translatedDescription = :vide',
        ExpressionAttributeValues: { ':d': issue.texte.trim(), ':t': new Date().toISOString(), ':vide': '' },
      }),
    ).catch(e => {
      if (e?.name === 'ConditionalCheckFailedException') return; // course bénigne : déjà écrit
      throw e;
    });
    faits += 1;
    if (faits % 100 === 0) console.log(`  ... ${faits}/${aFaire.length}`);
  }

  const file = [...aFaire];
  const ouvriers = Array.from({ length: PARALLELISME }, async () => {
    while (file.length) {
      const t = file.shift();
      if (t) await unite(t);
    }
  });
  await Promise.all(ouvriers);

  const centimes = coutCentimes(usageTotal);
  console.log('\nTERMINE.');
  console.log(`  traduits/ecrits : ${faits}   echecs : ${echecs.length}   appels fournisseur : ${appels}`);
  console.log(`  jetons          : ${JSON.stringify(usageTotal)}`);
  console.log(`  cout fournisseur: ${centimes} centimes (${(centimes / 100).toFixed(2)} EUR-equiv USD)`);
  console.log('  A PORTER AU GRAND LIVRE (enveloppe interne) : debitInternalSpend,');
  console.log(`  rattachement suggere : interne#campagne-descriptions-poi#multi`);
  if (echecs.length) {
    const j = path.join(HERE, `traduit-descriptions-poi.echecs-${Date.now()}.json`);
    fs.writeFileSync(j, JSON.stringify(echecs, null, 2));
    console.log('  journal des echecs :', j);
  }
  if (sansLigne.length) {
    console.log(`  (rappel : ${sansLigne.length} (Scene, langue) sans ligne SceneSegment, sautees)`);
  }
}

main().catch(e => {
  console.error('ECHEC :', e?.stack ?? String(e));
  process.exit(2);
});
