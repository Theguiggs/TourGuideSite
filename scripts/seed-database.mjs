/**
 * seed-database.mjs — Seed DynamoDB tables with fresh demo data.
 *
 * Usage:
 *   node scripts/seed-database.mjs
 *
 * Prerequisites: AWS CLI configured with correct credentials (us-east-1)
 */

import { execSync } from 'child_process';
import { randomUUID } from 'crypto';

const APP_ID = '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV    = 'NONE';
const REGION = 'us-east-1';

function putItem(tableName, item) {
  const fullName = `${tableName}-${APP_ID}-${ENV}`;
  const dynamoItem = {};
  for (const [key, val] of Object.entries(item)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'string') dynamoItem[key] = { S: val };
    else if (typeof val === 'number') dynamoItem[key] = { N: String(val) };
    else if (typeof val === 'boolean') dynamoItem[key] = { BOOL: val };
    else if (Array.isArray(val)) dynamoItem[key] = { L: val.map(v => ({ S: String(v) })) };
  }
  const json = JSON.stringify(dynamoItem);
  execSync(
    `aws dynamodb put-item --table-name "${fullName}" --region ${REGION} --item ${JSON.stringify(json)}`,
    { encoding: 'utf8' }
  );
}

const now = Date.now();

// --- Guide Profiles ---
const guides = [
  { id: randomUUID(), userId: 'user-guide-1', displayName: 'Marie Dupont', bio: "Guide passionnee par Grasse et son patrimoine parfumier. 15 ans d'experience.", photoUrl: '/images/guides/marie.jpg', city: 'Grasse', parcoursSignature: "L'Ame des Parfumeurs", yearsExperience: 15, rating: 4.7, tourCount: 2, verified: true, profileStatus: 'active' },
  { id: randomUUID(), userId: 'user-guide-2', displayName: 'Pierre Martin', bio: 'Historien de formation, je fais decouvrir la vieille ville de Grasse depuis 8 ans.', photoUrl: null, city: 'Grasse', parcoursSignature: null, yearsExperience: 8, rating: 4.0, tourCount: 1, verified: true, profileStatus: 'active' },
  { id: randomUUID(), userId: 'user-guide-3', displayName: 'Sophie Bernard', bio: 'Artiste et guide dans le Paris boheme de Montmartre.', photoUrl: '/images/guides/sophie.jpg', city: 'Paris', parcoursSignature: 'Secrets de Montmartre', yearsExperience: 12, rating: 5.0, tourCount: 1, verified: true, profileStatus: 'active' },
  { id: randomUUID(), userId: 'user-guide-4', displayName: 'Antoine Rossi', bio: 'Ne a Lyon, je connais chaque traboule du Vieux Lyon.', photoUrl: null, city: 'Lyon', parcoursSignature: 'Traboules du Vieux Lyon', yearsExperience: 6, rating: 4.0, tourCount: 1, verified: true, profileStatus: 'active' },
];

// --- Tours ---
const tours = [
  { id: randomUUID(), guideId: guides[0].id, title: "L'Ame des Parfumeurs", city: 'Grasse', status: 'published', description: "Plongez dans l'histoire de Grasse, capitale mondiale du parfum.", duration: 45, distance: 2.1, poiCount: 3 },
  { id: randomUUID(), guideId: guides[1].id, title: 'La Vieille Ville de Grasse', city: 'Grasse', status: 'published', description: 'Parcourez les ruelles medievales de la vieille ville de Grasse.', duration: 35, distance: 1.5, poiCount: 2 },
  { id: randomUUID(), guideId: guides[2].id, title: 'Secrets de Montmartre', city: 'Paris', status: 'published', description: 'De la Place du Tertre au Sacre-Coeur.', duration: 60, distance: 3.0, poiCount: 3 },
  { id: randomUUID(), guideId: guides[3].id, title: 'Traboules du Vieux Lyon', city: 'Lyon', status: 'published', description: 'Explorez les traboules secretes du Vieux Lyon.', duration: 50, distance: 2.5, poiCount: 2 },
];

// --- Moderation Items ---
const moderationItems = [
  { id: randomUUID(), tourId: tours[0].id, guideId: guides[0].id, guideName: 'Marie Dupont', tourTitle: 'Les Parfums Modernes', city: 'Grasse', submissionDate: new Date(now - 2 * 86400000).toISOString(), status: 'pending' },
  { id: randomUUID(), tourId: 'nice-promenade', guideId: 'guide-5', guideName: 'Claire Moreau', tourTitle: 'La Promenade des Anglais', city: 'Nice', submissionDate: new Date(now - 3 * 86400000).toISOString(), status: 'approved' },
];

// --- Dashboard Stats ---
const dashboardStats = {
  id: randomUUID(),
  guideId: guides[0].id,
  statsJson: JSON.stringify({ totalListens: 347, revenueThisMonth: 124.60, averageRating: 4.7, pendingToursCount: 1 }),
  revenueJson: JSON.stringify({
    summary: { thisMonth: 124.60, total: 1847.30, currency: 'EUR' },
    months: [
      { month: '2026-03', grossRevenue: 178.00, guideShare: 124.60, tourguideShare: 53.40, listens: 58 },
      { month: '2026-02', grossRevenue: 245.00, guideShare: 171.50, tourguideShare: 73.50, listens: 82 },
    ],
    tours: [
      { tourId: tours[0].id, tourTitle: "L'Ame des Parfumeurs", listens: 289, revenue: 1543.20, percentage: 83.5 },
    ],
  }),
  lastRefreshed: now,
};

// --- Seed ---
console.log('\n=== Seed DynamoDB TourGuide ===\n');

console.log('Guide Profiles...');
for (const g of guides) {
  try {
    putItem('GuideProfile', g);
    console.log(`  + ${g.displayName} (${g.id.slice(0, 8)})`);
  } catch (e) {
    console.error(`  x ${g.displayName}: ${e.message}`);
  }
}

console.log('\nTours...');
for (const t of tours) {
  try {
    putItem('GuideTour', t);
    console.log(`  + ${t.title} (${t.id.slice(0, 8)})`);
  } catch (e) {
    console.error(`  x ${t.title}: ${e.message}`);
  }
}

console.log('\nModeration Items...');
for (const m of moderationItems) {
  try {
    putItem('ModerationItem', m);
    console.log(`  + ${m.tourTitle} (${m.status})`);
  } catch (e) {
    console.error(`  x ${m.tourTitle}: ${e.message}`);
  }
}

console.log('\nDashboard Stats...');
try {
  putItem('GuideDashboardStats', dashboardStats);
  console.log(`  + Stats for ${guides[0].displayName}`);
} catch (e) {
  console.error(`  x Dashboard stats: ${e.message}`);
}

console.log('\nSeed termine!\n');
