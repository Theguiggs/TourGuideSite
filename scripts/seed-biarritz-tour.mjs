// ══════════════════════════════════════════════════════════
// Seed — Biarritz : Le Caprice de l'Impératrice (DRAFT)
// ══════════════════════════════════════════════════════════
//
// Insère la visite Biarritz dans DynamoDB au statut "draft", rattachée à
// TON compte guide. Les transcripts sont lus depuis les fichiers Markdown
// (content/tours/biarritz-caprice-imperatrice/scenes/*.md) : source unique
// de vérité, pas de copier-coller à maintenir.
//
// ── Prérequis ──────────────────────────────────────────────
//   1. Identifiants AWS configurés (variables d'env AWS_* ou profil), avec
//      les droits d'écriture sur les tables DynamoDB du backend.
//   2. Le SDK AWS installé :  npm i -D @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
//   3. TON identifiant de compte Cognito (le "sub"), pour que la visite
//      t'appartienne. On le passe via la variable d'env GUIDE_USER_ID.
//
// ── Lancement ──────────────────────────────────────────────
//   GUIDE_USER_ID="<ton-sub-cognito>" node scripts/seed-biarritz-tour.mjs
//   GUIDE_USER_ID="<ton-sub-cognito>" node scripts/seed-biarritz-tour.mjs --clean   # ré-insère proprement
//
//   Pour trouver ton sub : espace guide connecté → profil, ou table
//   GuideProfile (champ userId), ou le token Cognito.
//
// ── Remarques ──────────────────────────────────────────────
//   • Statut "draft" : la visite n'est PAS publiée. Elle apparaît dans ton
//     espace guide / studio, prête à être complétée (audio, photos) puis
//     soumise à modération.
//   • Aucune review ni statistique n'est créée (ce n'est pas un tour publié).
//   • --clean supprime uniquement les enregistrements de CETTE visite
//     (ids préfixés "biarritz-caprice-").
// ══════════════════════════════════════════════════════════

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ── Config backend (identique aux autres seeds du repo) ────
const APP_ID = '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV = 'NONE';
const REGION = process.env.AWS_REGION || 'us-east-1';

// ── Identité du guide (TOI) ────────────────────────────────
const GUIDE_USER_ID = process.env.GUIDE_USER_ID; // ton sub Cognito
const GUIDE_ID = process.env.GUIDE_ID || 'biarritz-guide-steffen';
const GUIDE_DISPLAY_NAME = process.env.GUIDE_DISPLAY_NAME || 'Steffen Guillaume';
const GUIDE_BIO = process.env.GUIDE_BIO ||
  "Passionné de Biarritz et de son histoire, je fais revivre le Second Empire, la Belle Époque et l'âge d'or de la station : le village de baleiniers devenu la plage des rois d'Europe, sous le caprice d'une impératrice.";

if (!GUIDE_USER_ID) {
  console.error('\n✖ GUIDE_USER_ID manquant.');
  console.error('  Relance avec ton sub Cognito, ex :');
  console.error('  GUIDE_USER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" node scripts/seed-biarritz-tour.mjs\n');
  process.exit(1);
}

const OWNER = `${GUIDE_USER_ID}::${GUIDE_USER_ID}`;
const TOUR_ID = 'biarritz-caprice-imperatrice';
const SESSION_ID = `${TOUR_ID}-session`;
const ID_PREFIX = 'biarritz-caprice-'; // pour --clean ciblé

// ── DynamoDB ───────────────────────────────────────────────
const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);
function table(name) { return `${name}-${APP_ID}-${ENV}`; }
const now = new Date().toISOString();
function put(tableName, item) {
  return dynamo.send(new PutCommand({
    TableName: table(tableName),
    Item: { createdAt: now, updatedAt: now, __typename: tableName, ...item },
  }));
}

// ── POIs (coordonnées WGS84 — voir IMPORT-STUDIO.md) ───────
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = join(__dirname, '..', 'content', 'tours', TOUR_ID, 'scenes');

/** Lit le corps d'une scène (tout ce qui suit la 1re ligne '---'). */
function readScene(file) {
  const raw = readFileSync(join(SCENES_DIR, file), 'utf8');
  const idx = raw.indexOf('\n---');
  const body = idx >= 0 ? raw.slice(raw.indexOf('\n', idx + 1) + 1) : raw;
  return body.trim();
}

const pois = [
  { title: 'Hôtel du Palais',        lat: 43.4867, lng: -1.5564, file: '01-hotel-du-palais.md',
    desc: "Ancienne Villa Eugénie (1855) : l'acte fondateur du Biarritz impérial, aujourd'hui palace face à la Grande Plage." },
  { title: 'Église Alexandre-Nevski', lat: 43.4850, lng: -1.5577, file: '02-eglise-russe.md',
    desc: "Dôme bleu de 1892, témoin de l'aristocratie russe de la Belle Époque, puis refuge des exilés de 1917." },
  { title: 'La Grande Plage',        lat: 43.4843, lng: -1.5601, file: '03-grande-plage.md',
    desc: "L'invention du bain de mer : la « Plage des Fous » devenue la plage des rois." },
  { title: 'Le Casino municipal',    lat: 43.4836, lng: -1.5597, file: '04-casino.md',
    desc: "Casino Art déco de 1929 : Belle Époque, Années folles, et la première boutique de Coco Chanel (1915)." },
  { title: 'La Chapelle Impériale',  lat: 43.4832, lng: -1.5586, file: '05-chapelle-imperiale.md',
    desc: "Chapelle privée d'Eugénie (1864), style hispano-mauresque, dédiée à Notre-Dame de Guadalupe." },
  { title: 'Le Port des Pêcheurs',   lat: 43.4829, lng: -1.5653, file: '06-port-des-pecheurs.md',
    desc: "Le vieux Biarritz des crampottes et la mémoire des chasseurs de baleines." },
  { title: 'Le Rocher de la Vierge', lat: 43.4834, lng: -1.5684, file: '07-rocher-de-la-vierge.md',
    desc: "Le port-refuge rêvé par Napoléon III, la passerelle de fer et la Vierge face à l'Atlantique." },
  { title: 'Le Port Vieux',          lat: 43.4825, lng: -1.5677, file: '08-port-vieux.md',
    desc: "La crique aux baleines devenue plage de poche, fief des baigneurs « Ours Blancs »." },
  { title: 'La Côte des Basques',    lat: 43.4805, lng: -1.5672, file: '09-cote-des-basques.md',
    desc: "Là où le surf européen est né en 1957 : la fin d'un monde, le début d'un autre." },
];

// ── Cleanup ciblé (--clean) ────────────────────────────────
async function cleanExisting() {
  const tables = ['StudioScene', 'StudioSession', 'GuideTour'];
  let total = 0;
  for (const t of tables) {
    const fullName = table(t);
    let lastKey; const ids = [];
    do {
      const scan = await dynamo.send(new ScanCommand({
        TableName: fullName, ProjectionExpression: 'id', ExclusiveStartKey: lastKey,
      }));
      for (const item of scan.Items ?? []) {
        if (typeof item.id === 'string' && item.id.startsWith(ID_PREFIX)) ids.push(item.id);
      }
      lastKey = scan.LastEvaluatedKey;
    } while (lastKey);
    for (let i = 0; i < ids.length; i += 25) {
      await dynamo.send(new BatchWriteCommand({
        RequestItems: { [fullName]: ids.slice(i, i + 25).map(id => ({ DeleteRequest: { Key: { id } } })) },
      }));
    }
    if (ids.length) console.log(`  Cleaned ${t}: ${ids.length} items`);
    total += ids.length;
  }
  return total;
}

// ── Run ────────────────────────────────────────────────────
async function run() {
  if (process.argv.includes('--clean')) {
    console.log('Nettoyage des enregistrements Biarritz existants...');
    console.log(`Cleaned ${await cleanExisting()} items.\n`);
  }

  console.log('=== Seed Biarritz — Le Caprice de l\'Impératrice (DRAFT) ===\n');
  console.log(`  Guide  : ${GUIDE_DISPLAY_NAME}  (userId=${GUIDE_USER_ID})`);
  console.log(`  Région : ${REGION}\n`);

  // 1. Profil guide (upsert). N'écrase pas ton profil si tu passes ton GUIDE_ID réel.
  await put('GuideProfile', {
    id: GUIDE_ID, userId: GUIDE_USER_ID, owner: OWNER,
    displayName: GUIDE_DISPLAY_NAME, city: 'Biarritz', bio: GUIDE_BIO,
    profileStatus: 'active', specialties: ['histoire', 'Belle Époque', 'Second Empire', 'patrimoine'],
    languages: ['fr'], tourCount: 1, rating: 0, verified: false,
  });
  console.log(`  ✓ GuideProfile: ${GUIDE_DISPLAY_NAME}`);

  // 2. Tour (DRAFT)
  let totalWords = 0;
  const transcripts = pois.map(p => { const tx = readScene(p.file); totalWords += tx.split(/\s+/).length; return tx; });
  const duration = Math.round(totalWords / 150); // ~150 mots/min (FR)

  await put('GuideTour', {
    id: TOUR_ID, guideId: GUIDE_ID, owner: OWNER,
    title: 'Biarritz — Le Caprice de l\'Impératrice', city: 'Biarritz',
    status: 'draft',
    description: "Comment le caprice d'une impératrice a transformé un village de chasseurs de baleines en plage des têtes couronnées d'Europe. De la Villa Eugénie au Rocher de la Vierge, du dôme russe à la naissance du surf, cette promenade au fil de l'eau raconte la splendeur et la chute d'un monde — et la capacité de Biarritz à toujours attraper la vague suivante.",
    duration, distance: 3.0, poiCount: pois.length, sessionId: SESSION_ID,
    difficulty: 'facile', languePrincipale: 'fr',
    themes: ['histoire', 'Belle Époque', 'Second Empire', 'patrimoine', 'mer'],
  });
  console.log(`  ✓ GuideTour (draft): ~${duration} min, ${pois.length} POIs`);

  // 3. Session studio (DRAFT)
  await put('StudioSession', {
    id: SESSION_ID, guideId: GUIDE_ID, owner: OWNER,
    tourId: TOUR_ID, title: 'Biarritz — Le Caprice de l\'Impératrice',
    status: 'draft', language: 'fr', consentRGPD: true,
  });
  console.log(`  ✓ StudioSession (draft)`);

  // 4. Scènes (une par POI) — transcript + coordonnées, sans audio
  for (let s = 0; s < pois.length; s++) {
    const poi = pois[s];
    const tx = transcripts[s];
    const durationSeconds = Math.round(tx.split(/\s+/).length / 150 * 60);
    await put('StudioScene', {
      id: `${ID_PREFIX}scene-${s}`, sessionId: SESSION_ID, owner: OWNER,
      sceneIndex: s, title: poi.title, status: 'draft',
      transcriptText: tx, poiDescription: poi.desc,
      transcriptionStatus: 'completed', archived: false,
      latitude: poi.lat, longitude: poi.lng, durationSeconds,
    });
    console.log(`     · scene ${s} — ${poi.title} (${poi.lat}, ${poi.lng}) ~${Math.round(durationSeconds / 60)} min`);
  }

  console.log(`\n=== Terminé : 1 tour DRAFT, ${pois.length} scènes, ~${duration} min de narration ===`);
  console.log('   → Ouvre /guide/studio pour compléter audio + photos, puis soumettre.\n');
}

run().catch((e) => { console.error('\n✖ Échec du seed :', e.message); process.exit(1); });
