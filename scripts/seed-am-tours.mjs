/**
 * seed-am-tours.mjs — 12 visites Alpes-Maritimes (Côte d'Azur)
 *
 * USAGE
 *   # Dry-run (validation, écrit un preview JSON) :
 *   node scripts/seed-am-tours.mjs
 *
 *   # Écriture réelle :
 *   node scripts/seed-am-tours.mjs --app-id=t5nxxao3orh6za2bjj6uegulru --env=NONE --confirm
 *
 *   # Purge + réécriture :
 *   node scripts/seed-am-tours.mjs --app-id=t5nxxao3orh6za2bjj6uegulru --env=NONE --confirm --clean
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TOURS_DIR = path.join(ROOT, 'content', 'tours');

// ── CLI / config ─────────────────────────────────────────
const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const getOpt = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};

const APP_ID     = getOpt('app-id',  process.env.APP_ID || '');
const ENV        = getOpt('env',     process.env.AMPLIFY_ENV || 'NONE');
const REGION     = getOpt('region',  process.env.AWS_REGION || 'us-east-1');
const CONFIRM    = hasFlag('--confirm');
const CLEAN      = hasFlag('--clean');
const PRICE_CENTS = parseInt(getOpt('price', '999'), 10);
const SEED_PREFIX = 'seed-am-';
const DRY_RUN    = !APP_ID || !CONFIRM;

const REAL_OWNER    = getOpt('owner',      '84a88428-e0e1-70d8-6a57-ec9f1421822e::84a88428-e0e1-70d8-6a57-ec9f1421822e');
const REAL_GUIDE_ID = getOpt('guide-id',   '159473d2-8509-4d01-aa14-180d87772225');
const REAL_GUIDE_NAME = getOpt('guide-name', 'Guillaume STEFFEN');

// ── Tours à charger ───────────────────────────────────────
const TOUR_CONFIG = [
  { slug: 'antibes-ete-picasso',        citySlug: 'antibes',        city: 'Antibes' },
  { slug: 'cannes-derriere-la-palme',   citySlug: 'cannes',         city: 'Cannes' },
  { slug: 'grasse-ombres-et-legendes',  citySlug: 'grasse-ombres',  city: 'Grasse', scenesDir: true },
  { slug: 'menton-citron-frontiere',    citySlug: 'menton',         city: 'Menton' },
  { slug: 'vence-matisse-lumiere',      citySlug: 'vence',          city: 'Vence' },
  { slug: 'eze-nid-aigle',              citySlug: 'eze',            city: 'Eze' },
  { slug: 'beaulieu-villa-kerylos',     citySlug: 'beaulieu',       city: 'Beaulieu-sur-Mer' },
  { slug: 'cap-ferrat-milliardaires',   citySlug: 'cap-ferrat',     city: 'Saint-Jean-Cap-Ferrat' },
  { slug: 'monaco-dynastie-demesure',   citySlug: 'monaco',         city: 'Monaco' },
  { slug: 'roquebrune-lecorbusier-mer', citySlug: 'roquebrune',     city: 'Roquebrune-Cap-Martin' },
  { slug: 'crimes-scandales-riviera',   citySlug: 'crimes-riviera', city: 'Nice' },
  { slug: 'villefranche-cocteau-rade',  citySlug: 'villefranche',   city: 'Villefranche-sur-Mer' },
];

const DESCRIPTIONS = {
  antibes:
    "L'été 1946. Picasso arrive à Antibes, sans atelier, presque sans peinture. En quelques semaines, dans les salles vides du château Grimaldi, il va tout réinventer — la joie, la couleur, la vie après la guerre. Pendant 55 minutes, je vous emmène sur ses traces : les remparts grecs où il posait ses toiles face à la mer, le marché provençal où il cherchait ses modèles, la vieille ville médiévale et sa cathédrale, le port où les pêcheurs devinrent ses héros. Je vous raconterai l'homme avant la légende — un Picasso épuisé par l'Occupation qui s'est ressaisi à Antibes comme nulle part ailleurs. Huit haltes sur 2,5 km, une lumière particulière qui n'appartient qu'à ce cap — et à la fin, vous regarderez différemment chaque tableau bleu de la Méditerranée.",

  cannes:
    "Derrière les strass et les projecteurs, Cannes est une ville qui se raconte autrement. Pendant 58 minutes, je vous emmène loin des tapis rouges : dans le vieux quartier du Suquet qui surplombe tout, au bord des îles de Lérins où fut enfermé l'Homme au Masque de Fer, sur la Croisette d'avant les palaces — quand c'était encore un chemin de pêcheurs. Je vous raconterai le village de pêcheurs devenu station mondaine par accident, les Anglais qui y vinrent mourir pour sa douceur climatique, les Russes blancs qui y survécurent, et ce festival qui a transformé une ville en mythe. Huit haltes, 2,2 km, et une question qui reste : quelle est la vraie Cannes ?",

  'grasse-ombres':
    "On vous a vendu Grasse comme la capitale du parfum. Ce soir, on raconte l'autre ville. Celle des ruelles où la peste a ravagé un tiers de la population, des pénitents encagoulés qui marchaient derrière les cercueils, des sources habitées par des créatures que personne ne voulait nommer à voix haute. Et celle où Patrick Süskind a choisi de nouer le crime parfait de son roman *Le Parfum*. Six scènes nocturnes, 42 minutes, 1,8 km dans la vieille ville — une confidence à voix basse sur la face cachée de la cité des fleurs.",

  menton:
    "Menton est la dernière ville de France avant l'Italie — et peut-être la plus singulière de la Côte. Pendant 62 minutes, je vous emmène dans une ville à trois visages : la cité baroque italienne avec ses façades ocre et ses clochers, la station hivernal des aristocrates anglais et russes qui fuyaient le froid nordique, et le Menton de Jean Cocteau qui y a laissé ses dernières œuvres sur les murs d'une salle des mariages. Je vous raconterai la frontière qui change de pays selon les décennies, le citron qui a fait la réputation et le festival, et pourquoi des reines et des empereurs venaient ici mourir en paix. Huit haltes, 2 km, et à la fin : l'Italie est à 300 mètres.",

  vence:
    "En 1947, Henri Matisse a 77 ans, il sort de deux opérations qui ont failli le tuer — et il décide de consacrer ses dernières forces à construire une chapelle à Vence. Pas par foi, dit-il, mais parce que c'était la seule chose qui valait encore d'être faite. Pendant 62 minutes, je vous emmène dans cette ville médiévale perchée sur les collines : les remparts du Xe siècle, la cathédrale où Charlemagne a planté une colonne, les ruelles où ont vécu Soutine, Dufy, D.H. Lawrence — et au bout, la Chapelle du Rosaire, le testament visuel d'un vieux peintre fatigué qui a tout mis dans cette lumière bleue. Sept haltes, 2 km, une question qui reste : qu'est-ce qu'une œuvre ultime ?",

  eze:
    "Èze est construite là où personne n'aurait dû construire : à 427 mètres au-dessus de la mer, sur un piton rocheux qui semble sur le point de tomber dans l'eau. Pendant 45 minutes, je vous emmène dans ce village médiéval fortifié qui a résisté à tout — aux Sarrasins, aux Génois, à Louis XIV, au temps. Je vous raconterai le vertige de cette position imprenable, les jardins exotiques perchés dans les ruines du château, et cette route en lacets qu'on appelle le Chemin de Nietzsche parce que le philosophe la descendait chaque jour pour réfléchir au bord de la mer — et dit-on, c'est ici qu'il a eu l'idée du Zarathoustra. Huit haltes, 1,6 km dans la verticalité — et un panorama sur 180° qui fait oublier la montée.",

  beaulieu:
    "En 1902, l'archéologue grec Théodore Reinach décide de construire, à Beaulieu-sur-Mer, une maison grecque parfaite — telle qu'elle aurait existé au IVe siècle avant notre ère. Pas une copie, pas un musée : une maison à vivre, avec ses colonnes, ses jardins, ses mosaïques, ses meubles reconstitués, pour habiter vraiment dans l'Antiquité. Pendant 62 minutes, je vous emmène à travers cette Villa Kérylos et son histoire extraordinaire, dans ce bout de Côte d'Azur que la Belle Époque a transformé en Riviera des riches, et dans la baie qui a vu passer les empereurs russes, les hivernants anglais et les artistes en fuite. Sept haltes, 1,8 km — et la question qui traverse tout : peut-on vraiment ressusciter un monde disparu ?",

  'cap-ferrat':
    "La presqu'île de Saint-Jean-Cap-Ferrat est l'un des endroits les plus chers au monde. Pas par hasard : depuis la Belle Époque, les fortunes les plus immenses d'Europe y ont planté leurs villas dans les pins. Pendant 48 minutes, je vous emmène sur ce cap exceptionnel : la Villa Ephrussi de Rothschild et ses neuf jardins, la villa où le roi Léopold II de Belgique régnait sur ses estivages comme sur ses colonies, le cap lui-même et ses chemins de douaniers suspendus entre les rochers et la mer. Je vous raconterai comment une presqu'île de pêcheurs est devenue le Monaco des villas — et ce que ces murs et ces jardins ont vu passer. Sept haltes, 3,5 km — et une lumière sur l'eau qu'on ne trouve nulle part ailleurs.",

  monaco:
    "Monaco est le deuxième État le plus petit du monde et peut-être celui qui concentre le plus de mythes au kilomètre carré. Pendant 48 minutes, je vous emmène derrière les façades : l'histoire des Grimaldi qui ont tenu ce rocher depuis 1297, le casino de Monte-Carlo et la faillite qu'il a sauvée, la formule 1 qui transforme les rues en circuit chaque printemps, et la figure de Grace Kelly — actrice hollywoodienne devenue princesse en 1956 dans un mariage vu par 30 millions de téléspectateurs. Je vous raconterai un pays qui a survécu à tout — révolutions, annexions, deux guerres mondiales — grâce à une combinaison unique de diplomatie, de jeu et de discrétion fiscale. Huit haltes, 3 km — et un État qui ne ressemble à aucun autre.",

  roquebrune:
    "En 1952, Le Corbusier fait construire à Roquebrune-Cap-Martin le cabanon le plus célèbre de l'architecture moderne : 16 mètres carrés, taillés au millimètre, sur un rocher face à la mer. Il viendra y passer chaque été pendant douze ans. En 1965, il se noie dans la baie qui est devant lui. Pendant 48 minutes, je vous emmène sur ce cap discret que Le Corbusier partageait avec quelques amis architectes, dans le village médiéval de Roquebrune perché sur son rocher — l'un des plus anciens châteaux féodaux de France — et sur les sentiers du bord de mer où l'histoire de l'architecture moderne s'est jouée dans un silence de pins. Sept haltes, 3 km — et la question de ce que choisit un génie pour finir sa vie.",

  'crimes-riviera':
    "La Riviera est une scène de théâtre. Et comme toute scène de théâtre, elle a une coulisse. Pendant 50 minutes, un ancien commissaire de police vous emmène dans le Nice des crimes véritables, des scandales dissimulés et des affaires que personne n'aime rappeler : l'assassinat jamais résolu d'un milliardaire irlandais, le détournement de fonds d'un maire qui a régné 35 ans, les filières d'immigration clandestine dans les années 80, et le hold-up à 100 millions de la Société Générale. Dix haltes dans la vieille ville et le bord de mer, 3,2 km — une Côte d'Azur qu'aucune brochure touristique ne vous montrera.",

  villefranche:
    "Villefranche-sur-Mer est peut-être la plus belle rade de la Méditerranée. Jean Cocteau le pensait — c'est ici qu'il est venu se ressourcer en 1924, et ici qu'il a passé ses derniers étés à décorer la chapelle Saint-Pierre pour les pêcheurs du port. Pendant 47 minutes, je vous emmène dans cette ville qui a été pendant des siècles le grand port militaire de la Méditerranée occidentale — les galères savoyardes, les flottes ottomanes, les cuirassés américains de la Guerre Froide y ont tous mouillé. Je vous raconterai la citadelle qui surveille la rade depuis 1557, les ruelles de la vieille ville parmi les plus étroites d'Europe, et cet artiste inclassable qui a vu dans cette chapelle de pêcheurs un dernier cadeau à faire. Sept haltes, 2,1 km — et une rade bleue qu'on ne quitte pas facilement.",
};

// ── Parsing du markdown principal (script-narration.md) ──
const WPM = 150;

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
  const poiCountRaw = (md.match(/\*\*POIs?\s*:\*\*\s*(\d+)/) || [])[1];
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
    const gpsIdx = block.indexOf('*(approx');
    const gpsLineEnd = block.indexOf('\n', gpsIdx > -1 ? gpsIdx : block.indexOf('**GPS'));
    if (gpsLineEnd > -1) body = block.slice(gpsLineEnd + 1);
    const transcript = body.replace(/\n---\s*$/, '').replace(/^---\s*$/m, '').trim();

    return { title: place.trim(), subtitle, lat, lng, transcript };
  });

  return {
    title, city, theme,
    durationLabel: durRaw,
    durationMinutes: durationToMinutes(durRaw),
    distance,
    poiCount: poiCountRaw ? parseInt(poiCountRaw, 10) : pois.length,
    pois,
  };
}

// ── Parsing spécial : dossier scenes/ (grasse-ombres) ────
function parseFromScenesDir(dir, readmeMd) {
  const h1 = readmeMd.match(/^#\s+(.+?)$/m);
  const title = h1 ? h1[1].trim() : 'Visite';
  const durRaw = (readmeMd.match(/\*\*Durée[^:]*:\*\*\s*([^\n|]+)/) || [])[1]?.trim() || '';
  const distRaw = (readmeMd.match(/\*\*Distance\s*:\*\*\s*([^\n|]+)/) || [])[1]?.trim() || '';
  const theme = (readmeMd.match(/\*\*Thème\s*:\*\*\s*(.+)/) || [])[1]?.trim() || '';
  const distance = distRaw ? parseFloat(distRaw.replace(',', '.').replace(/[^\d.]/g, '')) : undefined;

  const sceneFiles = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort();
  const pois = sceneFiles.map((f) => {
    const md = fs.readFileSync(path.join(dir, f), 'utf8');
    const h1m = md.match(/^#\s+Scène\s+\d+\s*—\s*(.+)$/m);
    const fullHead = h1m ? h1m[1].trim() : f.replace('.md', '');
    const [place, ...subParts] = fullHead.split(/\s*,\s*|\s*&\s*/);
    const subtitle = subParts.join(', ').trim();

    const gps = md.match(/\*\*GPS\s*:\*\*\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    const lat = gps ? parseFloat(gps[1]) : undefined;
    const lng = gps ? parseFloat(gps[2]) : undefined;

    const sepIdx = md.indexOf('\n---\n');
    const transcript = (sepIdx > -1 ? md.slice(sepIdx + 5) : md).trim();

    return { title: place.trim(), subtitle, lat, lng, transcript };
  });

  return {
    title, city: 'Grasse', theme,
    durationLabel: durRaw,
    durationMinutes: durationToMinutes(durRaw),
    distance,
    poiCount: pois.length,
    pois,
  };
}

// ── Construction des enregistrements DB ──────────────────
function buildRecords(tours) {
  const now = new Date().toISOString();
  const records = { GuideTour: [], StudioSession: [], StudioScene: [], ModerationItem: [], TourStats: [], TourReview: [] };
  const owner   = REAL_OWNER;
  const guideId = REAL_GUIDE_ID;

  const reviewSamples = [
    { rating: 5, comment: "Une découverte magnifique. La voix donne vie à chaque pierre, chaque rue. Je ne verrai plus cette ville pareil." },
    { rating: 5, comment: "Exactement ce que j'attendais : des histoires vraies, pas du guide touristique. Le parcours est parfait." },
    { rating: 4, comment: "Très riche, très documenté. J'aurais aimé encore plus d'anecdotes — c'est le seul défaut !" },
    { rating: 5, comment: "La meilleure façon de visiter. On apprend en marchant, sans effort. À recommander absolument." },
    { rating: 5, comment: "Le tracé est malin, la voix est captivante. Une heure qui passe sans qu'on s'en rende compte." },
  ];

  for (const t of tours) {
    const tourId   = `${SEED_PREFIX}${t.citySlug}`;
    const sessionId = `${tourId}-session`;
    const totalWords = t.pois.reduce((s, p) => s + p.transcript.split(/\s+/).length, 0);
    const durationMinutes = t.durationMinutes || Math.round(totalWords / WPM);
    const description = DESCRIPTIONS[t.citySlug] || t.theme;

    const computedPath = t.pois
      .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number')
      .map(p => ({ lat: p.lat, lng: p.lng }));
    const routePathJson = JSON.stringify({
      manualMode: true,
      waypoints: computedPath,
      pathOverride: false,
      computedPath,
      distanceMeters: t.distance ? Math.round(t.distance * 1000) : null,
      durationSeconds: durationMinutes * 60,
    });

    records.GuideTour.push({
      id: tourId, guideId, owner,
      title: t.title, city: t.city, status: 'published',
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
      title: t.title, status: 'published', language: 'fr',
      captureMode: 'scene_builder', consentRGPD: true,
      version: 1, availableLanguages: ['fr'],
      description, themes: [t.theme].filter(Boolean),
      durationMinutes, coverPhotoKey: `guide-photos/${tourId}/cover.jpg`,
      routePathJson, cleanedAt: now,
      createdAt: now, updatedAt: now, __typename: 'StudioSession',
    });

    t.pois.forEach((poi, i) => {
      const words = poi.transcript.split(/\s+/).length;
      records.StudioScene.push({
        id: `${tourId}-scene-${i}`, sessionId, owner,
        sceneIndex: i, title: poi.title, status: 'finalized',
        studioAudioKey: `guide-audio/${tourId}/scene_${i}.aac`,
        originalAudioKey: `guide-audio/${tourId}/scene_${i}_original.aac`,
        baseAudioSource: 'tts',
        transcriptText: poi.transcript, poiDescription: poi.subtitle || poi.title,
        transcriptionStatus: 'completed', qualityScore: 'good',
        codecStatus: 'native_aac', archived: false,
        photosRefs: [`guide-photos/${tourId}/poi_${i}.jpg`],
        latitude: poi.lat, longitude: poi.lng,
        durationSeconds: Math.round((words / WPM) * 60),
        createdAt: now, updatedAt: now, __typename: 'StudioScene',
      });
    });

    records.ModerationItem.push({
      id: `${tourId}-moderation`, tourId, guideId,
      guideName: REAL_GUIDE_NAME, tourTitle: t.title, city: t.city,
      submissionDate: Date.now(), status: 'approved',
      sessionId, poiCount: t.pois.length, duration: durationMinutes,
      distance: t.distance, description: t.theme,
      reviewDate: Date.now(), isResubmission: false,
      createdAt: now, updatedAt: now, __typename: 'ModerationItem',
    });

    const nReviews = 5;
    let sum = 0;
    for (let r = 0; r < nReviews; r++) {
      const tmpl = reviewSamples[(t.pois.length + r) % reviewSamples.length];
      sum += tmpl.rating;
      records.TourReview.push({
        id: `${tourId}-review-${r}`, tourId,
        userId: `${SEED_PREFIX}visitor-${r}`, owner: 'visitor::visitor',
        rating: tmpl.rating, comment: tmpl.comment, authorName: 'Visiteur vérifié',
        visitedAt: Date.now() - (r + 1) * 86400000 * 5,
        language: 'fr', status: 'visible', verified: true, helpfulCount: 1 + r,
        createdAt: now, updatedAt: now, __typename: 'TourReview',
      });
    }
    records.TourStats.push({
      id: `${tourId}-stats`, tourId,
      averageRating: Math.round((sum / nReviews) * 10) / 10,
      reviewCount: nReviews, completionCount: 20 + t.pois.length * 5,
      createdAt: now, updatedAt: now, __typename: 'TourStats',
    });
  }

  return records;
}

// ── Main ─────────────────────────────────────────────────
async function run() {
  console.log('=== Seed Alpes-Maritimes (12 visites) ===\n');

  const tours = [];
  for (const cfg of TOUR_CONFIG) {
    let parsed;

    if (cfg.scenesDir) {
      // Grasse Ombres : README + dossier scenes/
      const readmePath = path.join(TOURS_DIR, cfg.slug, 'README.md');
      const scenesPath = path.join(TOURS_DIR, cfg.slug, 'scenes');
      if (!fs.existsSync(readmePath)) { console.error(`  ⚠️  MANQUANT: ${readmePath}`); continue; }
      parsed = parseFromScenesDir(scenesPath, fs.readFileSync(readmePath, 'utf8'));
    } else {
      const file = path.join(TOURS_DIR, cfg.slug, 'script-narration.md');
      if (!fs.existsSync(file)) { console.error(`  ⚠️  MANQUANT: ${file}`); continue; }
      parsed = parseScript(fs.readFileSync(file, 'utf8'));
    }

    parsed.citySlug = cfg.citySlug;
    parsed.city     = cfg.city;
    tours.push(parsed);

    const words = parsed.pois.reduce((s, p) => s + p.transcript.split(/\s+/).length, 0);
    const gpsOk = parsed.pois.filter(p => p.lat != null).length;
    console.log(`  ✓ ${cfg.citySlug.padEnd(16)} "${parsed.title}" — ${parsed.pois.length} POIs, ~${parsed.durationMinutes ?? Math.round(words / WPM)} min, ${parsed.distance ?? '?'} km | GPS: ${gpsOk}/${parsed.pois.length}`);
  }

  const records = buildRecords(tours);
  const counts  = Object.fromEntries(Object.entries(records).map(([k, v]) => [k, v.length]));
  console.log(`\n  Enregistrements à écrire :`, counts);

  const missingGps = records.StudioScene.filter(s => s.latitude == null || s.longitude == null);
  if (missingGps.length) console.warn(`  ⚠️  ${missingGps.length} scène(s) sans GPS`);

  if (DRY_RUN) {
    const out = path.join(__dirname, 'seed-am-tours.preview.json');
    fs.writeFileSync(out, JSON.stringify(records, null, 2));
    console.log(`\n  DRY-RUN : rien écrit dans AWS.`);
    console.log(`  Aperçu complet → ${out}`);
    if (!APP_ID) console.log(`\n  Pour écrire : node scripts/seed-am-tours.mjs --app-id=t5nxxao3orh6za2bjj6uegulru --env=NONE --confirm`);
    return;
  }

  // Écriture réelle
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, PutCommand, ScanCommand, BatchWriteCommand } = await import('@aws-sdk/lib-dynamodb');
  const dynamo = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: REGION }),
    { marshallOptions: { removeUndefinedValues: true } },
  );
  const table = (name) => `${name}-${APP_ID}-${ENV}`;

  if (CLEAN) {
    console.log(`\n  --clean : suppression des items préfixés "${SEED_PREFIX}"…`);
    for (const t of ['StudioScene', 'StudioSession', 'TourReview', 'TourStats', 'ModerationItem', 'GuideTour']) {
      let lastKey, ids = [];
      do {
        const scan = await dynamo.send(new ScanCommand({ TableName: table(t), ProjectionExpression: 'id', ExclusiveStartKey: lastKey }));
        for (const it of scan.Items ?? []) if (typeof it.id === 'string' && it.id.startsWith(SEED_PREFIX)) ids.push(it.id);
        lastKey = scan.LastEvaluatedKey;
      } while (lastKey);
      for (let i = 0; i < ids.length; i += 25)
        await dynamo.send(new BatchWriteCommand({ RequestItems: { [table(t)]: ids.slice(i, i + 25).map(id => ({ DeleteRequest: { Key: { id } } })) } }));
      if (ids.length) console.log(`    cleaned ${t}: ${ids.length}`);
    }
  }

  console.log(`\n  Écriture sur backend ${APP_ID}-${ENV} (${REGION})…`);
  for (const [model, items] of Object.entries(records)) {
    for (const item of items) await dynamo.send(new PutCommand({ TableName: table(model), Item: item }));
    console.log(`    ${model}: ${items.length} écrits`);
  }
  console.log(`\n=== Terminé : ${tours.length} visites AM publiées (préfixe ${SEED_PREFIX}) ===`);
}

run().catch(e => { console.error(e); process.exit(1); });
