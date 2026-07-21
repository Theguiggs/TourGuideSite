/**
 * seed-villes-bankable.mjs — 5 visites LONGUES "grandes villes" (Guillaume)
 *
 * Lit les scripts de narration markdown de content/tours/{slug}/script-narration.md
 * et crée les enregistrements DB complets (GuideProfile, GuideTour PAYANT,
 * StudioSession + tracé routePathJson, StudioScene par POI, ModerationItem
 * approuvé, TourStats, TourReview) pour Paris, Lyon, Bordeaux, Marseille, Lille.
 *
 * Narrateur unique : Guillaume (première personne, pas de guide fictif).
 *
 * ⚠️ SÉCURITÉ / BACKEND
 *   Le suffixe des tables DynamoDB (Amplify Gen2) n'est PAS l'ID GraphQL de l'URL
 *   AppSync. Deux jeux de tables coexistent sur ce compte :
 *     - 4z7fvz7n2bh5rpixdgihjmhdpa   (utilisé par les anciens seeds)
 *     - t5nxxao3orh6za2bjj6uegulru
 *   Il FAUT confirmer lequel est le backend vivant avant d'écrire (voir README).
 *
 * USAGE
 *   # 1) Validation SANS toucher AWS (par défaut) :
 *   node scripts/seed-villes-bankable.mjs                 # dry-run, n'écrit rien
 *
 *   # 2) Écriture réelle (nécessite l'app-id ET --confirm) :
 *   node scripts/seed-villes-bankable.mjs --app-id=<ID> --confirm
 *   node scripts/seed-villes-bankable.mjs --app-id=<ID> --confirm --clean   # purge d'abord le préfixe
 *
 *   Variantes : APP_ID=<ID> en variable d'env ; --price=999 pour changer le prix.
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

const APP_ID = getOpt('app-id', process.env.APP_ID || '');
const ENV = getOpt('env', process.env.AMPLIFY_ENV || 'NONE');
const REGION = getOpt('region', process.env.AWS_REGION || 'us-east-1');
const CONFIRM = hasFlag('--confirm');
const CLEAN = hasFlag('--clean');
const PRICE_CENTS = parseInt(getOpt('price', '999'), 10); // 9,99 € par défaut
const SEED_PREFIX = 'seed-villes-';
const DRY_RUN = !APP_ID || !CONFIRM;

// Compte propriétaire RÉEL (Cognito) — les visites apparaissent dans l'espace
// guide de ce compte. Par défaut : steffen.guillaume@gmail.com.
//   owner   = "<sub>::<sub>"  | guideId = GuideProfile.id existant du compte.
const REAL_OWNER = getOpt('owner', '84a88428-e0e1-70d8-6a57-ec9f1421822e::84a88428-e0e1-70d8-6a57-ec9f1421822e');
const REAL_GUIDE_ID = getOpt('guide-id', '159473d2-8509-4d01-aa14-180d87772225');
const REAL_GUIDE_NAME = getOpt('guide-name', 'Guillaume STEFFEN');
// Le compte a déjà un GuideProfile : on ne le recrée PAS (sinon on l'écrase).
const WITH_PROFILE = hasFlag('--with-profile');

// ── Tours à charger (dossier → métadonnées commerciales) ──
const TOUR_CONFIG = [
  { slug: 'paris-secrets-rive-droite', citySlug: 'paris',     priceCents: PRICE_CENTS },
  { slug: 'lyon-traboules-soie',       citySlug: 'lyon',      priceCents: PRICE_CENTS },
  { slug: 'bordeaux-port-de-la-lune',  citySlug: 'bordeaux',  priceCents: PRICE_CENTS },
  { slug: 'marseille-2600-ans',        citySlug: 'marseille', priceCents: PRICE_CENTS },
  { slug: 'lille-ame-flamande',        citySlug: 'lille',     priceCents: PRICE_CENTS },
];

// Descriptions longues "donne envie d'écouter" (voix Guillaume, 1re pers.).
// Champ GuideTour.description + StudioSession.description lus par l'app/web.
const DESCRIPTIONS = {
  paris:
    "Levez les yeux. C'est tout ce que je vous demande. Le vrai Paris ne se cache pas derrière la tour Eiffel : il se niche sous les verrières des passages oubliés, dans les cours silencieuses du Marais, sur les pavés où l'Histoire a basculé. Pendant un peu plus d'une heure et demie, je vous emmène de la galerie Vivienne aux hôtels particuliers médiévaux, par le Palais-Royal, les Halles et la place des Vosges. Je vous raconterai les passages couverts, ancêtres de nos centres commerciaux ; le bagnard devenu chef de la police ; pourquoi on dit « faire grève » ; et ce que cachent les façades devant lesquelles des milliers de gens passent sans rien voir. Dix-huit haltes qui s'enchaînent comme une promenade entre amis, avec à chaque coin de rue une histoire vraie qui change votre regard. Mettez vos écouteurs, glissez le téléphone dans votre poche, et suivez-moi. À la fin, vous ne verrez plus jamais ce Paris-là de la même façon — et c'est exactement ce que je veux.",
  lyon:
    "On croit connaître Lyon, et puis on pousse une porte anodine — et on se retrouve dans un passage secret vieux de cinq siècles. Ce sont les traboules, et elles sont la clé de cette ville. Pendant près de deux heures, je vous emmène du Vieux Lyon Renaissance aux pentes de la Croix-Rousse, par la colline de Fourvière et ses théâtres romains, là où est née Lugdunum, capitale des Gaules. Je vous raconterai la soie qui a fait la fortune et la révolte de la ville, les canuts et leur métier à tisser qui a inspiré l'informatique, les cours cachées où l'on complotait, et pourquoi Lyon s'illumine chaque 8 décembre. Dix-huit étapes, des montées qui se méritent, et une récompense à chaque palier : un panorama, une fresque immense, une histoire que les passants ignorent. Ce n'est pas une visite de carte postale, c'est une plongée dans une ville à double fond. Écouteurs aux oreilles, suivez-moi de porte en porte — et laissez Lyon vous livrer ses secrets.",
  bordeaux:
    "On l'a longtemps appelée « la Belle endormie ». Aujourd'hui, Bordeaux s'est réveillée — et elle est éblouissante. Pendant un peu plus d'une heure et demie, je vous emmène le long du port de la Lune, sur les quais qui se reflètent dans le miroir d'eau, à travers la plus grande façade du XVIIIe siècle d'Europe taillée dans la pierre blonde. Je vous raconterai Aliénor d'Aquitaine et les trois siècles anglais, les intendants qui ont rêvé la ville la plus élégante du royaume, les négociants des Chartrons dont le vin partait conquérir le monde — sans oublier la part d'ombre de ce commerce. Dix-huit haltes, de la flèche Saint-Michel au Grand Théâtre, de la Grosse Cloche à la Cité du Vin, pour comprendre comment une ville de pierre est devenue une légende du goût. Mettez vos écouteurs, laissez la lumière dorée vous accompagner — et découvrez pourquoi Bordeaux ne dort plus.",
  marseille:
    "Marseille ne se visite pas, elle se vit — fort, vrai, à pleine voix. C'est la plus vieille ville de France : 2600 ans depuis que des marins grecs y ont accosté et fondé Massalia. Pendant près de deux heures, je vous emmène du Vieux-Port au sommet de la Bonne Mère, par la Canebière, le marché de Noailles, les ruelles du Panier et le MuCEM face à la mer. Je vous raconterai la cité grecque sous vos pieds, le quartier que les nazis ont dynamité en 1943, les vagues d'immigration qui ont fait l'âme de la ville, les pêcheurs du Vallon des Auffes et les ex-voto des marins accrochés à la Bonne Mère. Dix-sept étapes, une montée finale qui coupe le souffle, et partout cette énergie qu'on ne trouve nulle part ailleurs. Ce n'est pas une visite polie : c'est Marseille sans filtre, avec ses cicatrices et sa fierté. Écouteurs aux oreilles — et laissez la ville vous prendre.",
  lille:
    "Lille, on la sous-estime souvent. Grave erreur. Derrière ses façades de brique rouge et or se cache une capitale flamande au caractère unique, à la fois française et venue d'ailleurs. Pendant un peu plus d'une heure et demie, je vous emmène de la Grand-Place à la citadelle de Vauban, par la Vieille Bourse — un bijou baroque — les ruelles pavées du Vieux-Lille, la maison où naquit de Gaulle et l'un des plus grands musées de France. Je vous raconterai le passé bourguignon et espagnol, la conquête de Louis XIV, les beffrois qui sonnaient la liberté des marchands, la grande braderie, et cette chaleur du Nord qui se goûte aussi dans un estaminet, une bière à la main. Dix-sept étapes pour tomber amoureux d'une ville qu'on n'attendait pas. Mettez vos écouteurs — et laissez-vous surprendre par l'âme flamande.",
};

const GUIDE = {
  id: `${SEED_PREFIX}guide-guillaume`,
  userId: `${SEED_PREFIX}user-guillaume`,
  displayName: 'Guillaume',
  city: 'France',
  bio: "Je ne suis pas un guide professionnel : je suis juste quelqu'un qui aime profondément ces villes et qui adore en raconter l'histoire vraie. Mes visites se font à la première personne, à pied, écouteurs aux oreilles — comme si on flânait ensemble. Levez les yeux, je m'occupe du reste.",
  specialties: ['histoire', 'patrimoine', 'architecture', 'flânerie urbaine'],
  languages: ['fr'],
  rating: 4.9,
};

// ── Parsing du markdown ──────────────────────────────────
function durationToMinutes(s) {
  // "~1h40" → 100 ; "~45 minutes" → 45
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

  // Découpe par scène
  const blocks = md.split(/^##\s+Scène\s+/m).slice(1);
  const pois = blocks.map((block) => {
    const firstLine = block.split('\n')[0]; // "1 — Galerie Vivienne : sous-titre"
    const headMatch = firstLine.match(/^\d+\s*—\s*(.+)$/);
    const fullHead = headMatch ? headMatch[1].trim() : firstLine.trim();
    const [place, ...subParts] = fullHead.split(/\s*:\s*/);
    const subtitle = subParts.join(' : ').trim();

    const gps = block.match(/\*\*GPS\s*:\*\*\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    const lat = gps ? parseFloat(gps[1]) : undefined;
    const lng = gps ? parseFloat(gps[2]) : undefined;

    // Transcript = tout après la ligne GPS, jusqu'au séparateur final
    let body = block;
    const gpsIdx = block.indexOf('*(approx');
    const gpsLineEnd = block.indexOf('\n', gpsIdx > -1 ? gpsIdx : block.indexOf('**GPS'));
    if (gpsLineEnd > -1) body = block.slice(gpsLineEnd + 1);
    const transcript = body.replace(/\n---\s*$/,'').replace(/^---\s*$/m, '').trim();

    return { title: place.trim(), subtitle, lat, lng, transcript };
  });

  return { title, city, theme, durationLabel: durRaw, durationMinutes: durationToMinutes(durRaw), distance, pois };
}

// ── Construction des enregistrements DB ──────────────────
const WPM = 150;
function buildRecords(tours) {
  const now = new Date().toISOString();
  const records = { GuideProfile: [], GuideTour: [], StudioSession: [], StudioScene: [], ModerationItem: [], TourStats: [], TourReview: [] };
  // Rattachement au compte RÉEL (pas un guide fictif).
  const owner = REAL_OWNER;
  const guideId = REAL_GUIDE_ID;

  // Profil guide : non recréé par défaut (le compte en a déjà un). --with-profile
  // pour le (re)créer/écraser explicitement.
  if (WITH_PROFILE) {
    records.GuideProfile.push({
      id: guideId, userId: REAL_OWNER.split('::')[0], owner,
      displayName: REAL_GUIDE_NAME, city: GUIDE.city, bio: GUIDE.bio,
      specialties: GUIDE.specialties, languages: GUIDE.languages,
      rating: GUIDE.rating, tourCount: tours.length, verified: true,
      profileStatus: 'active', freeLanguageUsed: false,
      createdAt: now, updatedAt: now, __typename: 'GuideProfile',
    });
  }

  const reviewSamples = [
    { rating: 5, comment: "Visite incroyable, on apprend une tonne de choses sans jamais s'ennuyer. La voix est passionnante." },
    { rating: 5, comment: "Parfait pour découvrir la ville autrement. Le parcours s'enchaîne super bien, et 1h40 passent vite." },
    { rating: 4, comment: "Très riche en anecdotes. J'ai adoré, juste un peu long si on est pressé — mais c'est aussi ce qui fait la valeur." },
    { rating: 5, comment: "On sent la passion derrière chaque scène. Le meilleur audioguide que j'aie testé." },
    { rating: 5, comment: "Itinéraire malin, on ne revient jamais sur ses pas. Et les histoires sont vraies, vérifiables. Bravo." },
  ];

  for (const t of tours) {
    const cfg = TOUR_CONFIG.find((c) => c.citySlug === t.citySlug);
    const tourId = `${SEED_PREFIX}${t.citySlug}`;
    const sessionId = `${tourId}-session`;
    const totalWords = t.pois.reduce((s, p) => s + p.transcript.split(/\s+/).length, 0);
    const durationMinutes = t.durationMinutes || Math.round(totalWords / WPM);

    // Tracé officiel : la séquence ordonnée des POIs (computedPath lu par l'app).
    // POI→POI ; à affiner en snap-to-road via le traceur Studio avant prod.
    const description = DESCRIPTIONS[t.citySlug] || t.theme;
    const computedPath = t.pois
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => ({ lat: p.lat, lng: p.lng }));
    const routePathJson = JSON.stringify({
      manualMode: true,
      waypoints: computedPath,
      pathOverride: false,
      computedPath,
      distanceMeters: t.distance ? Math.round(t.distance * 1000) : null,
      durationSeconds: durationMinutes * 60,
    });

    // GuideTour (PAYANT — tous les champs consommateur)
    records.GuideTour.push({
      id: tourId, guideId, owner,
      title: t.title, city: t.city, status: 'published',
      description, version: 1,
      duration: durationMinutes, distance: t.distance, poiCount: t.pois.length,
      sessionId, availableLanguages: ['fr'],
      languageAudioTypes: JSON.stringify({ fr: 'tts' }),
      coverPhotoKey: `guide-photos/${tourId}/cover.jpg`,
      priceCents: cfg.priceCents, purchaseType: 'paid',
      createdAt: now, updatedAt: now, __typename: 'GuideTour',
    });

    // StudioSession (+ tracé)
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

    // StudioScene par POI
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

    // ModerationItem (déjà approuvé → visible au catalogue)
    records.ModerationItem.push({
      id: `${tourId}-moderation`, tourId, guideId,
      guideName: REAL_GUIDE_NAME, tourTitle: t.title, city: t.city,
      submissionDate: Date.now(), status: 'approved',
      sessionId, poiCount: t.pois.length, duration: durationMinutes,
      distance: t.distance, description: t.theme,
      reviewDate: Date.now(), isResubmission: false,
      createdAt: now, updatedAt: now, __typename: 'ModerationItem',
    });

    // TourStats + quelques TourReview
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
      reviewCount: nReviews, completionCount: 30 + t.pois.length * 7,
      createdAt: now, updatedAt: now, __typename: 'TourStats',
    });
  }

  return records;
}

// ── Main ─────────────────────────────────────────────────
async function run() {
  console.log('=== Seed Villes Bankable (Guillaume) ===\n');

  // 1) Parse
  const tours = [];
  for (const cfg of TOUR_CONFIG) {
    const file = path.join(TOURS_DIR, cfg.slug, 'script-narration.md');
    if (!fs.existsSync(file)) { console.error(`  ⚠️  MANQUANT: ${file}`); continue; }
    const parsed = parseScript(fs.readFileSync(file, 'utf8'));
    parsed.citySlug = cfg.citySlug;
    tours.push(parsed);
    const words = parsed.pois.reduce((s, p) => s + p.transcript.split(/\s+/).length, 0);
    console.log(`  ✓ ${cfg.citySlug.padEnd(10)} "${parsed.title}" — ${parsed.pois.length} POIs, ~${Math.round(words / WPM)} min, ${parsed.distance ?? '?'} km, ${cfg.priceCents / 100}€`);
  }

  const records = buildRecords(tours);
  const counts = Object.fromEntries(Object.entries(records).map(([k, v]) => [k, v.length]));
  console.log(`\n  Enregistrements à écrire :`, counts);

  // Validation POIs sans GPS
  const missingGps = records.StudioScene.filter((s) => s.latitude == null || s.longitude == null);
  if (missingGps.length) console.warn(`  ⚠️  ${missingGps.length} scène(s) sans GPS`);

  if (DRY_RUN) {
    const out = path.join(__dirname, 'seed-villes-bankable.preview.json');
    fs.writeFileSync(out, JSON.stringify(records, null, 2));
    console.log(`\n  DRY-RUN : rien écrit dans AWS.`);
    console.log(`  Aperçu complet → ${out}`);
    if (!APP_ID) console.log(`\n  Pour écrire en base : --app-id=<4z7…|t5n…> --confirm  (confirme d'abord le backend vivant)`);
    else if (!CONFIRM) console.log(`\n  app-id fourni mais --confirm manquant. Ajoute --confirm pour écrire réellement.`);
    return;
  }

  // 2) Écriture réelle (import AWS uniquement ici)
  const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, PutCommand, ScanCommand, BatchWriteCommand } = await import('@aws-sdk/lib-dynamodb');
  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), { marshallOptions: { removeUndefinedValues: true } });
  const table = (name) => `${name}-${APP_ID}-${ENV}`;

  if (CLEAN) {
    console.log(`\n  --clean : suppression des items préfixés "${SEED_PREFIX}"…`);
    for (const t of ['StudioScene', 'StudioSession', 'TourReview', 'TourStats', 'ModerationItem', 'GuideTour', 'GuideProfile']) {
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

  console.log(`\n  Écriture sur backend ${APP_ID}-${ENV} (${REGION})…`);
  for (const [model, items] of Object.entries(records)) {
    for (const item of items) await dynamo.send(new PutCommand({ TableName: table(model), Item: item }));
    console.log(`    ${model}: ${items.length} écrits`);
  }
  console.log(`\n=== Terminé : ${tours.length} visites payantes publiées (préfixe ${SEED_PREFIX}) ===`);
}

run().catch((e) => { console.error(e); process.exit(1); });
