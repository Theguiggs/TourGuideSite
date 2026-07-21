/**
 * seed-100-visites.mjs — 100 nouvelles visites France, en STATUT DRAFT.
 *
 * Lit content/tours/{slug}/script-narration.md (format `## Scène N —` + GPS)
 * et crée, pour chaque visite : GuideTour (draft), StudioSession (draft + tracé
 * routePathJson), StudioScene par POI (status 'transcribed', SANS clé audio —
 * le texte est prêt, l'audio reste à produire au Studio).
 *
 * PAS de ModerationItem / TourStats / TourReview : ce sont des brouillons à
 * valider, pas des visites publiées. Rattaché au compte réel (steffen.guillaume).
 * Préfixe d'isolation : seed-100-  (n'interfère pas avec seed-villes- / seed-am-).
 *
 * ⚠️ GPS APPROXIMATIFS : tous les GPS des scripts sont des placeholders
 *    « (approx. à vérifier) ». Le tracé sera faux tant qu'il n'est pas calé au
 *    Studio. C'est acceptable en draft (validation), pas en publication.
 *
 * USAGE
 *   node scripts/seed-100-visites.mjs                      # dry-run (n'écrit rien)
 *   node scripts/seed-100-visites.mjs --app-id=<ID> --confirm         # écrit en base (draft)
 *   node scripts/seed-100-visites.mjs --app-id=<ID> --confirm --clean # purge d'abord le préfixe seed-100-
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TOURS_DIR = path.join(ROOT, 'content', 'tours');

const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const getOpt = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};

const APP_ID = getOpt('app-id', process.env.APP_ID || '');
const ENV = getOpt('env', process.env.AMPLIFY_ENV || 'NONE');
const REGION = getOpt('region', process.env.AWS_REGION || 'us-east-1');
const CONFIRM = hasFlag('--confirm');
const CLEAN = hasFlag('--clean');
const PRICE_CENTS = parseInt(getOpt('price', '999'), 10);
const SEED_PREFIX = 'seed-100-';
const DRY_RUN = !APP_ID || !CONFIRM;

const REAL_OWNER = getOpt('owner', '84a88428-e0e1-70d8-6a57-ec9f1421822e::84a88428-e0e1-70d8-6a57-ec9f1421822e');
const REAL_GUIDE_ID = getOpt('guide-id', '159473d2-8509-4d01-aa14-180d87772225');
const REAL_GUIDE_NAME = getOpt('guide-name', 'Guillaume STEFFEN');

// ── Les 100 slugs (dossiers content/tours/<slug>/script-narration.md) ──
const SLUGS = [
  // Vague 1 (20)
  'toulouse-capitole-et-siecles-d-or','toulouse-aeropostale-et-espace','toulouse-ovalie','toulouse-cassoulet-et-violette',
  'strasbourg-entre-deux-mondes','strasbourg-winstubs-et-bretzels','strasbourg-cathedrale-des-batisseurs','strasbourg-capitale-de-noel',
  'rouen-proces-jeanne-darc','rouen-cathedrale-de-monet','rouen-faience-et-gros-horloge',
  'annecy-venise-des-alpes','annecy-lac-des-defis','annecy-reblochon-et-lac',
  'saint-malo-cite-corsaire','saint-malo-route-du-rhum','saint-malo-beurre-et-marees',
  'bayonne-petit-bayonne','bayonne-jambon-et-chocolat','bayonne-pelote-basque',
  // Vague 2 (18)
  'paris-montmartre-des-peintres','paris-ventre-de-paris','paris-rive-gauche-des-ecrivains',
  'lyon-bouchons-et-halles','lyon-lumiere-cinema','lyon-capitale-resistance',
  'marseille-assiette-du-vieux-port','marseille-cite-radieuse-modernites','marseille-ville-stade',
  'bordeaux-capitale-du-vin','bordeaux-canneles-et-marches','bordeaux-pierre-et-mascarons',
  'lille-estaminets-et-braderie','lille-fil-du-textile','lille-beaux-arts-et-geants',
  'biarritz-berceau-du-surf','biarritz-table-basque','biarritz-villas-et-architectes',
  // Vague 3 (27)
  'nice-nissa-la-bella','nice-matisse-chagall-collines','nice-cuisine-nissarde',
  'nantes-memoire-du-port','nantes-jules-verne-machines','nantes-beurre-lu-muscadet',
  'montpellier-mille-ans-de-medecine','montpellier-ecusson-secret','montpellier-places-gourmandes',
  'rennes-parlement-et-incendies','rennes-marche-des-lices','rennes-murs-qui-parlent',
  'reims-ville-des-sacres','reims-caves-de-champagne','reims-art-deco-renaissance',
  'dijon-ducs-de-bourgogne','dijon-moutarde-pain-depices','dijon-chouette-et-sculpteurs',
  'avignon-palais-des-papes','avignon-ville-theatre','avignon-halles-et-provence',
  'aix-sur-les-pas-de-cezanne','aix-fontaines-et-comtes','aix-calissons-et-marches',
  'arles-van-gogh-la-lumiere','arles-rome-en-provence','arles-camargue-et-gardians',
  // Vague 4 (35)
  'chamonix-conquete-du-mont-blanc','chamonix-guides-et-cimes','chamonix-table-des-alpages',
  'colmar-petite-venise','colmar-retable-et-bartholdi','colmar-capitale-des-vins-dalsace',
  'carcassonne-cite-assiegee','carcassonne-resurrection-viollet-le-duc','carcassonne-cassoulet-et-corbieres',
  'la-rochelle-tours-et-siege','la-rochelle-capitale-de-la-voile','la-rochelle-huitres-et-pineau',
  'tours-cite-royale','tours-jardins-et-vins-de-loire','amboise-leonard-dernier-voyage',
  'versailles-ville-du-roi-soleil','versailles-potager-du-roi','chartres-cathedrale-de-lumiere',
  'honfleur-berceau-impressionniste','honfleur-port-des-explorateurs','etretat-falaises-des-peintres',
  'deauville-planches-et-cinema','deauville-hippodromes-et-polo','giverny-jardins-de-monet',
  'mont-saint-michel-la-merveille','mont-saint-michel-baie-et-omelette',
  'beaune-hospices-et-charite','beaune-capitale-des-climats',
  'sarlat-perigord-medieval','sarlat-capitale-du-foie-gras',
  'albi-toulouse-lautrec','albi-cite-episcopale',
  'nimes-rome-francaise','nimes-ferias-et-brandade','cassis-calanques-et-vignes',
];

// ── Parsing (identique à seed-villes-bankable.mjs) ──
function durationToMinutes(s) {
  const hm = s.match(/(\d+)\s*h\s*(\d+)?/i);
  if (hm) return parseInt(hm[1], 10) * 60 + (hm[2] ? parseInt(hm[2], 10) : 0);
  const m = s.match(/(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) : null;
}
function parseScript(md) {
  const h1 = md.match(/^#\s+(.+?)(?:\s+—\s+Script de Narration.*)?$/m);
  const title = h1 ? h1[1].trim() : 'Visite';
  const city = (md.match(/\*\*Ville\s*:\*\*\s*(.+)/) || [])[1]?.trim() || '';
  const theme = (md.match(/\*\*Thème\s*:\*\*\s*(.+)/) || [])[1]?.trim() || '';
  const durRaw = (md.match(/\*\*Durée[^:]*:\*\*\s*([^\n|]+)/) || [])[1]?.trim() || '';
  const distRaw = (md.match(/\*\*Distance\s*:\*\*\s*([^\n|]+)/) || [])[1]?.trim() || '';
  const distance = distRaw ? parseFloat(distRaw.replace(',', '.').replace(/[^\d.]/g, '')) : undefined;
  const blocks = md.split(/^##\s+Scène\s+/m).slice(1);
  const pois = blocks.map((block) => {
    const firstLine = block.split('\n')[0];
    const headMatch = firstLine.match(/^\d+\s*—\s*(.+)$/);
    const fullHead = headMatch ? headMatch[1].trim() : firstLine.trim();
    const [place, ...subParts] = fullHead.split(/\s*:\s*/);
    const subtitle = subParts.join(' : ').trim();
    const gps = block.match(/\*\*GPS\s*:\*\*\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    const lat = gps ? parseFloat(gps[1]) : undefined;
    const lng = gps ? parseFloat(gps[2]) : undefined;
    let body = block;
    const approxIdx = block.indexOf('*(approx');
    const gpsLineEnd = block.indexOf('\n', approxIdx > -1 ? approxIdx : block.indexOf('**GPS'));
    if (gpsLineEnd > -1) body = block.slice(gpsLineEnd + 1);
    const transcript = body.replace(/\n---\s*$/, '').replace(/^---\s*$/m, '').trim();
    return { title: place.trim(), subtitle, lat, lng, transcript };
  });
  return { title, city, theme, durationLabel: durRaw, durationMinutes: durationToMinutes(durRaw), distance, pois };
}

// Description catalogue courte dérivée du thème (draft ; à enrichir au Studio).
function draftDescription(t) {
  return `${t.theme}`.trim() || t.title;
}

const WPM = 150;
function buildRecords(tours) {
  const now = new Date().toISOString();
  const records = { GuideTour: [], StudioSession: [], StudioScene: [] };
  const owner = REAL_OWNER, guideId = REAL_GUIDE_ID;

  for (const t of tours) {
    const tourId = `${SEED_PREFIX}${t.slug}`;
    const sessionId = `${tourId}-session`;
    const totalWords = t.pois.reduce((s, p) => s + p.transcript.split(/\s+/).length, 0);
    const durationMinutes = t.durationMinutes || Math.round(totalWords / WPM);
    const description = draftDescription(t);
    const computedPath = t.pois
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => ({ lat: p.lat, lng: p.lng }));
    const routePathJson = JSON.stringify({
      manualMode: true, waypoints: computedPath, pathOverride: false, computedPath,
      distanceMeters: t.distance ? Math.round(t.distance * 1000) : null,
      durationSeconds: durationMinutes * 60,
    });

    records.GuideTour.push({
      id: tourId, guideId, owner,
      title: t.title, city: t.city, status: 'draft',
      description, version: 1,
      duration: durationMinutes, distance: t.distance, poiCount: t.pois.length,
      sessionId, availableLanguages: ['fr'],
      languageAudioTypes: JSON.stringify({ fr: 'tts' }),
      coverPhotoKey: `guide-photos/${tourId}/cover.jpg`,
      priceCents: PRICE_CENTS, purchaseType: 'paid',
      createdAt: now, updatedAt: now, __typename: 'GuideTour',
    });

    records.StudioSession.push({
      id: sessionId, guideId, owner, tourId,
      title: t.title, status: 'draft', language: 'fr',
      captureMode: 'scene_builder', consentRGPD: true,
      version: 1, availableLanguages: ['fr'],
      description, themes: [t.theme].filter(Boolean),
      durationMinutes, coverPhotoKey: `guide-photos/${tourId}/cover.jpg`,
      routePathJson, cleanedAt: now,
      createdAt: now, updatedAt: now, __typename: 'StudioSession',
    });

    // Scènes : texte prêt, PAS d'audio (status 'transcribed', pas de studioAudioKey).
    t.pois.forEach((poi, i) => {
      const words = poi.transcript.split(/\s+/).length;
      records.StudioScene.push({
        id: `${tourId}-scene-${i}`, sessionId, owner,
        sceneIndex: i, title: poi.title, status: 'transcribed',
        transcriptText: poi.transcript, poiDescription: poi.subtitle || poi.title,
        transcriptionStatus: 'completed', archived: false,
        latitude: poi.lat, longitude: poi.lng,
        durationSeconds: Math.round((words / WPM) * 60),
        createdAt: now, updatedAt: now, __typename: 'StudioScene',
      });
    });
  }
  return records;
}

async function run() {
  console.log('=== Seed 100 visites (DRAFT) ===\n');
  const tours = [];
  let missing = 0;
  for (const slug of SLUGS) {
    const file = path.join(TOURS_DIR, slug, 'script-narration.md');
    if (!fs.existsSync(file)) { console.error(`  ⚠️  MANQUANT: ${slug}`); missing++; continue; }
    const parsed = parseScript(fs.readFileSync(file, 'utf8'));
    parsed.slug = slug;
    tours.push(parsed);
  }
  console.log(`  Visites parsées : ${tours.length}/${SLUGS.length}` + (missing ? ` (${missing} manquantes)` : ''));

  // Contrôle GPS
  const totalScenes = tours.reduce((s, t) => s + t.pois.length, 0);
  const noGps = tours.reduce((s, t) => s + t.pois.filter((p) => p.lat == null || p.lng == null).length, 0);
  console.log(`  Scènes totales : ${totalScenes} | sans GPS : ${noGps} | GPS approximatifs (à caler au Studio)`);

  const records = buildRecords(tours);
  const counts = Object.fromEntries(Object.entries(records).map(([k, v]) => [k, v.length]));
  console.log(`\n  Enregistrements (statut draft) :`, counts);

  if (DRY_RUN) {
    const out = path.join(__dirname, 'seed-100-visites.preview.json');
    fs.writeFileSync(out, JSON.stringify(records, null, 2));
    console.log(`\n  DRY-RUN : rien écrit dans AWS.  Aperçu → ${out}`);
    if (!APP_ID) console.log(`  Pour écrire : --app-id=t5nxxao3orh6za2bjj6uegulru --confirm`);
    else if (!CONFIRM) console.log(`  app-id fourni mais --confirm manquant.`);
    return;
  }

  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, PutCommand, ScanCommand, BatchWriteCommand } = await import('@aws-sdk/lib-dynamodb');
  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), { marshallOptions: { removeUndefinedValues: true } });
  const table = (name) => `${name}-${APP_ID}-${ENV}`;

  if (CLEAN) {
    console.log(`\n  --clean : suppression des items préfixés "${SEED_PREFIX}"…`);
    for (const t of ['StudioScene', 'StudioSession', 'GuideTour']) {
      let lastKey, ids = [];
      do {
        const scan = await dynamo.send(new ScanCommand({ TableName: table(t), ProjectionExpression: 'id', ExclusiveStartKey: lastKey }));
        for (const it of scan.Items ?? []) if (typeof it.id === 'string' && it.id.startsWith(SEED_PREFIX)) ids.push(it.id);
        lastKey = scan.LastEvaluatedKey;
      } while (lastKey);
      for (let i = 0; i < ids.length; i += 25)
        await dynamo.send(new BatchWriteCommand({ RequestItems: { [table(t)]: ids.slice(i, i + 25).map((id) => ({ DeleteRequest: { Key: { id } } })) } }));
      if (ids.length) console.log(`    cleaned ${t}: ${ids.length}`);
    }
  }

  console.log(`\n  Écriture DRAFT sur backend ${APP_ID}-${ENV} (${REGION})…`);
  for (const [model, items] of Object.entries(records)) {
    for (const item of items) await dynamo.send(new PutCommand({ TableName: table(model), Item: item }));
    console.log(`    ${model}: ${items.length} écrits`);
  }
  console.log(`\n=== Terminé : ${tours.length} visites en DRAFT (préfixe ${SEED_PREFIX}) ===`);
}

run().catch((e) => { console.error(e); process.exit(1); });
