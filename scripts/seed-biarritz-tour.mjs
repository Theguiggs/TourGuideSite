// ══════════════════════════════════════════════════════════
// Seed — Biarritz : Le Caprice de l'Impératrice (DRAFT)
// ══════════════════════════════════════════════════════════
//
// Insère la visite Biarritz dans le backend VIVANT au statut "draft",
// rattachée au guide Guillaume STEFFEN. Les scènes sont en état
// "transcribed" (texte + GPS présents, audio à enregistrer/générer
// ensuite dans le Studio). Aucune review / stat / modération.
//
// Modèle : scripts/seed-am-tours.mjs (schéma + identité guide).
// Backend cible par défaut : t5nxxao3orh6za2bjj6uegulru-NONE (le 4z7… est MORT).
//
// ── Sécurité ───────────────────────────────────────────────
//   • DRY-RUN par défaut : n'écrit rien tant que --confirm n'est pas passé.
//   • --clean supprime d'abord les enregistrements Biarritz (ids ciblés).
//
// ── Lancement ──────────────────────────────────────────────
//   node scripts/seed-biarritz-tour.mjs                 # dry-run (aperçu)
//   node scripts/seed-biarritz-tour.mjs --confirm       # écrit le draft
//   node scripts/seed-biarritz-tour.mjs --confirm --clean
//
// Identifiants AWS : lus depuis l'environnement / ~/.aws (région us-east-1).
// ══════════════════════════════════════════════════════════

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ── Options CLI ────────────────────────────────────────────
const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const getOpt = (name, def) => {
  const p = args.find((a) => a.startsWith(`--${name}=`));
  return p ? p.split('=').slice(1).join('=') : def;
};

const APP_ID  = getOpt('app-id', process.env.APP_ID || 't5nxxao3orh6za2bjj6uegulru');
const ENV     = getOpt('env', process.env.AMPLIFY_ENV || 'NONE');
const REGION  = getOpt('region', process.env.AWS_REGION || 'us-east-1');
const CONFIRM = hasFlag('--confirm');
const CLEAN   = hasFlag('--clean');
const DRY_RUN = !CONFIRM;
const WPM     = 150;

// ── Identité guide (Guillaume STEFFEN) ─────────────────────
const OWNER    = getOpt('owner',    '84a88428-e0e1-70d8-6a57-ec9f1421822e::84a88428-e0e1-70d8-6a57-ec9f1421822e');
const GUIDE_ID = getOpt('guide-id', '159473d2-8509-4d01-aa14-180d87772225');

const TOUR_ID    = 'biarritz-caprice-imperatrice';
const SESSION_ID = `${TOUR_ID}-session`;
const now = new Date().toISOString();

// ── DynamoDB ───────────────────────────────────────────────
const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);
const table = (name) => `${name}-${APP_ID}-${ENV}`;

// ── POIs (coordonnées WGS84 — voir IMPORT-STUDIO.md) ───────
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = join(__dirname, '..', 'content', 'tours', TOUR_ID, 'scenes');

/** Corps de la scène = tout ce qui suit la 1re ligne '---'. */
function readScene(file) {
  const raw = readFileSync(join(SCENES_DIR, file), 'utf8');
  const idx = raw.indexOf('\n---');
  const body = idx >= 0 ? raw.slice(raw.indexOf('\n', idx + 1) + 1) : raw;
  return body.trim();
}

const POIS = [
  { title: 'Hôtel du Palais',         lat: 43.4867, lng: -1.5564, file: '01-hotel-du-palais.md',
    desc: "Ancienne Villa Eugénie (1855) : l'acte fondateur du Biarritz impérial, aujourd'hui palace face à la Grande Plage." },
  { title: 'Église Alexandre-Nevski', lat: 43.4850, lng: -1.5577, file: '02-eglise-russe.md',
    desc: "Dôme bleu de 1892, témoin de l'aristocratie russe de la Belle Époque, puis refuge des exilés de 1917." },
  { title: 'La Grande Plage',          lat: 43.4843, lng: -1.5601, file: '03-grande-plage.md',
    desc: "L'invention du bain de mer : la « Plage des Fous » devenue la plage des rois." },
  { title: 'Le Casino municipal',      lat: 43.4836, lng: -1.5597, file: '04-casino.md',
    desc: "Casino Art déco de 1929 : Belle Époque, Années folles, et la première boutique de Coco Chanel (1915)." },
  { title: 'La Chapelle Impériale',    lat: 43.4832, lng: -1.5586, file: '05-chapelle-imperiale.md',
    desc: "Chapelle privée d'Eugénie (1864), style hispano-mauresque, dédiée à Notre-Dame de Guadalupe." },
  { title: 'Le Port des Pêcheurs',     lat: 43.4829, lng: -1.5653, file: '06-port-des-pecheurs.md',
    desc: "Le vieux Biarritz des crampottes et la mémoire des chasseurs de baleines." },
  { title: 'Le Rocher de la Vierge',   lat: 43.4834, lng: -1.5684, file: '07-rocher-de-la-vierge.md',
    desc: "Le port-refuge rêvé par Napoléon III, la passerelle de fer et la Vierge face à l'Atlantique." },
  { title: 'Le Port Vieux',            lat: 43.4825, lng: -1.5677, file: '08-port-vieux.md',
    desc: "La crique aux baleines devenue plage de poche, fief des baigneurs « Ours Blancs »." },
  { title: 'La Côte des Basques',      lat: 43.4805, lng: -1.5672, file: '09-cote-des-basques.md',
    desc: "Là où le surf européen est né en 1957 : la fin d'un monde, le début d'un autre." },
];

const DESCRIPTION =
  "Comment le caprice d'une impératrice a transformé un village de chasseurs de baleines en plage des têtes couronnées d'Europe. De la Villa Eugénie au Rocher de la Vierge, du dôme russe à la naissance du surf, cette promenade au fil de l'eau raconte la splendeur et la chute d'un monde — et la capacité de Biarritz à toujours attraper la vague suivante.";

// ── Construction des enregistrements ───────────────────────
function build() {
  const transcripts = POIS.map((p) => readScene(p.file));
  const totalWords = transcripts.reduce((s, t) => s + t.split(/\s+/).length, 0);
  const durationMinutes = Math.round(totalWords / WPM);
  const computedPath = POIS.map((p) => ({ lat: p.lat, lng: p.lng }));
  const routePathJson = JSON.stringify({
    manualMode: true, waypoints: computedPath, pathOverride: false, computedPath,
    distanceMeters: 3000, durationSeconds: durationMinutes * 60,
  });

  const guideTour = {
    id: TOUR_ID, guideId: GUIDE_ID, owner: OWNER,
    title: "Biarritz — Le Caprice de l'Impératrice", city: 'Biarritz',
    status: 'draft', description: DESCRIPTION, version: 1,
    duration: durationMinutes, distance: 3.0, poiCount: POIS.length,
    sessionId: SESSION_ID, availableLanguages: ['fr'],
    createdAt: now, updatedAt: now, __typename: 'GuideTour',
  };

  const studioSession = {
    id: SESSION_ID, guideId: GUIDE_ID, owner: OWNER, tourId: TOUR_ID,
    title: "Biarritz — Le Caprice de l'Impératrice",
    status: 'draft', language: 'fr', availableLanguages: ['fr'],
    captureMode: 'scene_builder', consentRGPD: true, version: 1,
    description: DESCRIPTION, themes: ['histoire', 'Belle Époque', 'patrimoine'],
    durationMinutes, routePathJson,
    createdAt: now, updatedAt: now, __typename: 'StudioSession',
  };

  const scenes = POIS.map((poi, i) => {
    const words = transcripts[i].split(/\s+/).length;
    return {
      id: `${TOUR_ID}-scene-${i}`, sessionId: SESSION_ID, owner: OWNER,
      sceneIndex: i, title: poi.title, status: 'transcribed',
      transcriptText: transcripts[i], poiDescription: poi.desc,
      latitude: poi.lat, longitude: poi.lng,
      durationSeconds: Math.round((words / WPM) * 60), archived: false,
      createdAt: now, updatedAt: now, __typename: 'StudioScene',
    };
  });

  return { guideTour, studioSession, scenes, durationMinutes };
}

// ── Cleanup ciblé ──────────────────────────────────────────
async function clean() {
  const ids = {
    GuideTour: [TOUR_ID],
    StudioSession: [SESSION_ID],
    StudioScene: POIS.map((_, i) => `${TOUR_ID}-scene-${i}`),
  };
  for (const [t, list] of Object.entries(ids)) {
    for (let i = 0; i < list.length; i += 25) {
      await dynamo.send(new BatchWriteCommand({
        RequestItems: { [table(t)]: list.slice(i, i + 25).map((id) => ({ DeleteRequest: { Key: { id } } })) },
      }));
    }
    console.log(`  Cleaned ${t}: ${list.length}`);
  }
}

// ── Run ────────────────────────────────────────────────────
async function run() {
  const { guideTour, studioSession, scenes, durationMinutes } = build();

  console.log('\n═══ Seed Biarritz — Le Caprice de l\'Impératrice (DRAFT) ═══');
  console.log(`  Backend : ${APP_ID}-${ENV}  (${REGION})`);
  console.log(`  Guide   : ${GUIDE_ID}  (owner ${OWNER.split('::')[0]})`);
  console.log(`  Tour    : ${TOUR_ID}  | status=draft | ${scenes.length} scènes | ~${durationMinutes} min`);
  scenes.forEach((s) => console.log(`     · ${String(s.sceneIndex).padStart(2)} ${s.title.padEnd(24)} (${s.latitude}, ${s.longitude}) ~${Math.round(s.durationSeconds / 60)} min`));

  if (DRY_RUN) {
    console.log('\n  ⚠ DRY-RUN — rien n\'a été écrit. Ajoute --confirm pour écrire réellement.\n');
    return;
  }

  // garde-fou : pas d'écrasement sans --clean
  const existing = await dynamo.send(new GetCommand({ TableName: table('GuideTour'), Key: { id: TOUR_ID } }));
  if (existing.Item && !CLEAN) {
    console.error(`\n  ✖ Le tour ${TOUR_ID} existe déjà (status=${existing.Item.status}). Relance avec --clean pour le remplacer.\n`);
    process.exit(1);
  }
  if (CLEAN) { console.log('\n  Nettoyage préalable…'); await clean(); }

  const put = (t, item) => dynamo.send(new PutCommand({ TableName: table(t), Item: item }));
  console.log('\n  Écriture…');
  await put('GuideTour', guideTour);        console.log('  ✓ GuideTour (draft)');
  await put('StudioSession', studioSession); console.log('  ✓ StudioSession (draft)');
  for (const s of scenes) { await put('StudioScene', s); console.log(`  ✓ StudioScene ${s.sceneIndex} — ${s.title}`); }

  console.log('\n  ✅ Draft créé. Ouvre le Studio → il apparaît dans tes visites, prêt pour audio + photos.\n');
}

run().catch((e) => { console.error('\n✖ Échec :', e.message); process.exit(1); });
