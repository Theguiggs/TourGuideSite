/**
 * seed-alpes-maritimes.mjs — Seed 10 parcours publiés dans les Alpes-Maritimes
 * avec guides, reviews, stats et sessions complètes.
 *
 * Usage: node scripts/seed-alpes-maritimes.mjs
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const APP_ID = '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV = 'NONE';
const REGION = 'us-east-1';

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);

function table(name) { return `${name}-${APP_ID}-${ENV}`; }
const now = new Date().toISOString();
function put(tableName, item) {
  return dynamo.send(new PutCommand({ TableName: table(tableName), Item: { createdAt: now, updatedAt: now, __typename: tableName, ...item } }));
}

// ── Guides ──────────────────────────────────────────────

const guides = [
  { id: randomUUID(), userId: 'seed-guide-nice-1', displayName: 'Isabelle Moretti', city: 'Nice', bio: 'Nicoise de naissance, historienne de formation. Je vous fais decouvrir les secrets de ma ville depuis 12 ans.', specialties: ['histoire', 'architecture', 'gastronomie'], languages: ['fr', 'en', 'it'], tourCount: 3, rating: 4.7 },
  { id: randomUUID(), userId: 'seed-guide-cannes-1', displayName: 'Thomas Bellini', city: 'Cannes', bio: 'Ancien journaliste cinema, je raconte Cannes a travers ses festivals, ses palaces et ses ruelles cachees.', specialties: ['cinema', 'culture', 'architecture'], languages: ['fr', 'en'], tourCount: 2, rating: 4.8 },
  { id: randomUUID(), userId: 'seed-guide-antibes-1', displayName: 'Claire Duval', city: 'Antibes', bio: 'Plongeuse et passionnee de Picasso, guide certifiee du patrimoine maritime de la Cote d\'Azur.', specialties: ['art', 'mer', 'histoire'], languages: ['fr', 'en'], tourCount: 1, rating: 4.6 },
  { id: randomUUID(), userId: 'seed-guide-menton-1', displayName: 'Luca Ferretti', city: 'Menton', bio: 'Franco-italien ne a Menton, botaniste amateur. Mes visites sentent le citron et la fleur d\'oranger.', specialties: ['jardins', 'botanique', 'gastronomie'], languages: ['fr', 'it', 'en'], tourCount: 1, rating: 4.9 },
  { id: randomUUID(), userId: 'seed-guide-vence-1', displayName: 'Marie-Anne Laporte', city: 'Vence', bio: 'Artiste peintre installee dans l\'arriere-pays nicois. Je partage l\'art et la lumiere de Provence.', specialties: ['art', 'chapelle Matisse', 'villages'], languages: ['fr', 'en'], tourCount: 2, rating: 4.5 },
  { id: randomUUID(), userId: 'seed-guide-grasse-2', displayName: 'Jean-Paul Roux', city: 'Grasse', bio: 'Nez certifie, 20 ans dans la parfumerie grassoise. Sentez l\'histoire a chaque ruelle.', specialties: ['parfum', 'histoire', 'nature'], languages: ['fr', 'en', 'de'], tourCount: 1, rating: 4.8 },
];

// ── Tours ────────────────────────────────────────────────

const tours = [
  {
    id: randomUUID(), guideIdx: 0, title: 'Nice Baroque — Du Vieux-Nice au Port', city: 'Nice', status: 'published',
    description: 'Plongez dans le coeur battant du Vieux-Nice, la ou les facades ocre et les eglises baroques racontent cinq siecles d\'histoire. De la Place Massena aux ruelles du marche du Cours Saleya, laissez-vous guider par les cloches, les accents et les odeurs de socca. Chaque point d\'interet est une invitation a lever les yeux et a decouvrir un detail que meme les locaux ne voient plus.',
    duration: 55, distance: 2.8, poiCount: 8,
  },
  {
    id: randomUUID(), guideIdx: 0, title: 'Promenade des Anglais — L\'Epopee Bleu Azur', city: 'Nice', status: 'published',
    description: 'Sept kilometres de legende face a la Baie des Anges. Des palaces de la Belle Epoque au Negresco, cette promenade audio vous raconte comment une communaute britannique a invente le bord de mer le plus celebre du monde. Laissez le bruit des vagues rythmer votre marche tandis que les anecdotes defilent.',
    duration: 40, distance: 4.2, poiCount: 6,
  },
  {
    id: randomUUID(), guideIdx: 0, title: 'Colline du Chateau — Panorama et Mysteres', city: 'Nice', status: 'published',
    description: 'Grimpez la colline ou est nee la ville de Nice il y a 2 400 ans. Entre cascades, ruines de la cathedrale et cimetiere romantique, ce parcours vertical vous offre les plus beaux panoramas de la Cote d\'Azur. L\'audio revelera les secrets des souterrains et l\'histoire des sièges qui ont façonne cette citadelle.',
    duration: 35, distance: 1.9, poiCount: 7,
  },
  {
    id: randomUUID(), guideIdx: 1, title: 'Cannes — Du Suquet a la Croisette', city: 'Cannes', status: 'published',
    description: 'Commencez par le village de pecheurs medieval du Suquet, ses escaliers, sa tour et sa vue a couper le souffle. Puis descendez vers la Croisette, le Palais des Festivals et les marches les plus photographiees au monde. Entre glamour et authenticite, ce parcours vous devoile les deux visages de Cannes.',
    duration: 50, distance: 3.1, poiCount: 7,
  },
  {
    id: randomUUID(), guideIdx: 1, title: 'Iles de Lerins — Silence et Monastere', city: 'Cannes', status: 'published',
    description: 'A 15 minutes de bateau de la Croisette, un autre monde. L\'ile Saint-Honorat abrite un monastere du Ve siecle ou les moines produisent du vin et de la liqueur. L\'ile Sainte-Marguerite garde le Fort Royal ou fut emprisonne le Masque de Fer. Cet audio guide transforme une excursion en voyage dans le temps.',
    duration: 65, distance: 3.5, poiCount: 5,
  },
  {
    id: randomUUID(), guideIdx: 2, title: 'Antibes — Remparts, Picasso et Bord de Mer', city: 'Antibes', status: 'published',
    description: 'Marchez sur les traces de Picasso dans la vieille ville fortifiee d\'Antibes. Du marche provencal au musee Picasso dans le Chateau Grimaldi, en passant par le port Vauban — le plus grand port de plaisance d\'Europe — chaque arret est une immersion dans l\'histoire millenaire de cette cite greco-romaine devenue joyau de la Riviera.',
    duration: 50, distance: 2.6, poiCount: 8,
  },
  {
    id: randomUUID(), guideIdx: 3, title: 'Menton — Jardins d\'Eden entre France et Italie', city: 'Menton', status: 'published',
    description: 'Menton possede le microclimat le plus doux de France. Ce parcours vous mene a travers ses jardins exotiques legendaires — Val Rahmeh, Serre de la Madone, jardin Fontana Rosa — ou poussent des especes venues du monde entier. Entre citronniers et bougainvilliers, l\'audio vous raconte les botanistes excentriques qui ont cree ces paradis.',
    duration: 60, distance: 3.0, poiCount: 6,
  },
  {
    id: randomUUID(), guideIdx: 4, title: 'Saint-Paul-de-Vence — Village des Artistes', city: 'Saint-Paul-de-Vence', status: 'published',
    description: 'Chagall, Matisse, Prevert... tous sont tombes amoureux de ce village perche. Derriere ses remparts du XVIe siecle, les galeries d\'art cotoient les ateliers de ceramique et les terrasses ou Yves Montand jouait a la petanque. Cet audio guide est une promenade entre art, histoire et lumiere mediterraneenne.',
    duration: 40, distance: 1.4, poiCount: 6,
  },
  {
    id: randomUUID(), guideIdx: 4, title: 'Vence — De la Chapelle Matisse aux Fontaines', city: 'Vence', status: 'published',
    description: 'La Chapelle du Rosaire, chef-d\'oeuvre de Matisse, est le point de depart de cette balade dans la cite episcopale de Vence. Traversez la Place du Peyra, longez les fontaines Renaissance et perdez-vous dans des ruelles ou le temps s\'est arrete. L\'audio vous guidera jusqu\'aux points de vue ou la mer et les Alpes se rejoignent.',
    duration: 35, distance: 1.8, poiCount: 5,
  },
  {
    id: randomUUID(), guideIdx: 5, title: 'Grasse — Les Routes du Parfum', city: 'Grasse', status: 'published',
    description: 'Suivez le chemin des fleurs depuis les champs de jasmin de la plaine jusqu\'aux alambics des parfumeries centenaires. Ce parcours sensoriel vous plonge dans l\'art de la distillation, l\'histoire des grandes maisons — Fragonard, Molinard, Galimard — et les secrets des "nez" qui composent les fragrances les plus celebres au monde. Respirez, ecoutez, marchez.',
    duration: 50, distance: 2.3, poiCount: 7,
  },
];

// ── Reviews & Stats ─────────────────────────────────────

const reviewTemplates = [
  { rating: 5, comment: 'Absolument magnifique ! L\'audio est immersif, on oublie le telephone. Une vraie experience.' },
  { rating: 5, comment: 'Le meilleur moyen de decouvrir la ville. Le guide sait raconter des histoires captivantes.' },
  { rating: 4, comment: 'Tres bien realise, parcours agreable. Quelques passages un peu longs mais globalement top.' },
  { rating: 5, comment: 'On sent la passion du guide. Les anecdotes sont incroyables, j\'ai appris plein de choses.' },
  { rating: 4, comment: 'Bonne visite, audio de qualite. J\'aurais aime un peu plus de musique d\'ambiance.' },
  { rating: 5, comment: 'Recommande a 100%. Fait en famille, meme les enfants ont adore.' },
  { rating: 3, comment: 'Correct mais pas exceptionnel. Le parcours est un peu long pour des personnes agees.' },
  { rating: 5, comment: 'Un pur bonheur ! J\'ai refait la visite deux fois avec des amis differents.' },
  { rating: 4, comment: 'Tres bonne decouverte. Les points d\'interet sont bien choisis et bien documentes.' },
  { rating: 5, comment: 'Bravo ! On sent le travail de recherche historique. L\'audio est clair et passionnant.' },
];

// ── Seed Execution ──────────────────────────────────────

async function run() {
  console.log('=== Seed Alpes-Maritimes ===\n');

  // 1. Guides
  for (const g of guides) {
    await put('GuideProfile', {
      id: g.id,
      userId: g.userId,
      owner: `${g.userId}::${g.userId}`,
      displayName: g.displayName,
      city: g.city,
      bio: g.bio,
      profileStatus: 'active',
      specialties: g.specialties,
      languages: g.languages,
      tourCount: g.tourCount,
      rating: g.rating,
      verified: true,
    });
    console.log(`  Guide: ${g.displayName} (${g.city})`);
  }

  // 2. Tours + Sessions + Scenes + Reviews + Stats
  for (let i = 0; i < tours.length; i++) {
    const t = tours[i];
    const guide = guides[t.guideIdx];
    const tourId = t.id;

    // GuideTour
    await put('GuideTour', {
      id: tourId,
      guideId: guide.id,
      owner: `${guide.userId}::${guide.userId}`,
      title: t.title,
      city: t.city,
      status: t.status,
      description: t.description,
      duration: t.duration,
      distance: t.distance,
      poiCount: t.poiCount,
    });

    // StudioSession
    const sessionId = randomUUID();
    await put('StudioSession', {
      id: sessionId,
      guideId: guide.id,
      owner: `${guide.userId}::${guide.userId}`,
      tourId,
      title: t.title,
      status: 'published',
      language: 'fr',
      consentRGPD: true,
    });

    // StudioScenes (one per POI with fake audio)
    for (let s = 0; s < t.poiCount; s++) {
      await put('StudioScene', {
        id: randomUUID(),
        sessionId,
        owner: `${guide.userId}::${guide.userId}`,
        sceneIndex: s,
        title: `Point ${s + 1} — ${t.title.split('—')[0].trim()}`,
        status: 'finalized',
        studioAudioKey: `guide-audio/${tourId}/scene_${s}.aac`,
        originalAudioKey: `guide-audio/${tourId}/scene_${s}_original.aac`,
        transcriptText: `Bienvenue au point d'interet numero ${s + 1}. ${t.description.substring(0, 120)}...`,
        transcriptionStatus: 'completed',
        qualityScore: 'good',
        archived: false,
        photosRefs: [`guide-photos/${tourId}/scene_${s}_photo.jpg`],
        latitude: 43.7 + (Math.random() * 0.1 - 0.05),
        longitude: 7.0 + (Math.random() * 0.3 - 0.15),
      });
    }

    // TourReviews (3-5 per tour)
    const reviewCount = 3 + Math.floor(Math.random() * 3);
    let ratingSum = 0;
    for (let r = 0; r < reviewCount; r++) {
      const tmpl = reviewTemplates[(i * 3 + r) % reviewTemplates.length];
      ratingSum += tmpl.rating;
      await put('TourReview', {
        id: randomUUID(),
        tourId,
        userId: `visitor-${randomUUID().substring(0, 8)}`,
        owner: `visitor-${randomUUID().substring(0, 8)}::visitor`,
        rating: tmpl.rating,
        comment: tmpl.comment,
        visitedAt: Date.now() - (r + 1) * 86400000 * (3 + Math.floor(Math.random() * 10)),
        language: 'fr',
        status: 'visible',
      });
    }

    // TourStats
    const avgRating = Math.round((ratingSum / reviewCount) * 10) / 10;
    const completionCount = 15 + Math.floor(Math.random() * 180);
    await put('TourStats', {
      id: randomUUID(),
      tourId,
      averageRating: avgRating,
      reviewCount,
      completionCount,
    });

    console.log(`  Tour: ${t.title} (${t.city}) — ${t.poiCount} POIs, ${reviewCount} reviews, ${completionCount} completions, ★${avgRating}`);
  }

  console.log(`\n=== Done: ${guides.length} guides, ${tours.length} tours seeded ===`);
}

run().catch(console.error);
