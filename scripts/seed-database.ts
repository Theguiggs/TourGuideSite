/**
 * Database seeding script for the TourGuide web portal.
 *
 * Seeds DynamoDB tables via Amplify Data client with:
 * - 3 cities worth of tours (Grasse, Paris, Lyon)
 * - 4 guide profiles
 * - 4 tours with POI data
 * - 10+ reviews
 * - 2 moderation items
 * - TourStats for each tour
 * - GuideDashboardStats for guide-1
 *
 * Usage: npx ts-node scripts/seed-database.ts
 */

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';

// Configure Amplify for seeding
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AMPLIFY_USER_POOL_ID || '',
      userPoolClientId: process.env.NEXT_PUBLIC_AMPLIFY_USER_POOL_CLIENT_ID || '',
      identityPoolId: process.env.NEXT_PUBLIC_AMPLIFY_IDENTITY_POOL_ID || '',
    },
  },
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_AMPLIFY_API_ENDPOINT || '',
      defaultAuthMode: 'iam',
    },
  },
});

const client = generateClient();

// --- Seed Data ---

const GUIDES = [
  { userId: 'user-guide-1', displayName: 'Marie Dupont', bio: 'Guide passionnee par Grasse et son patrimoine parfumier. 15 ans d\'experience.', photoUrl: '/images/guides/marie.jpg', city: 'Grasse', parcoursSignature: "L'Ame des Parfumeurs", yearsExperience: 15, specialties: ['Parfumerie', 'Histoire locale', 'Architecture provencale'], languages: ['Francais', 'Anglais', 'Italien'], rating: 4.7, tourCount: 2, verified: true, profileStatus: 'active' },
  { userId: 'user-guide-2', displayName: 'Pierre Martin', bio: 'Historien de formation, je fais decouvrir la vieille ville de Grasse depuis 8 ans.', photoUrl: null, city: 'Grasse', parcoursSignature: null, yearsExperience: 8, specialties: ['Histoire medievale', 'Architecture', 'Gastronomie'], languages: ['Francais', 'Anglais'], rating: 4.0, tourCount: 1, verified: true, profileStatus: 'active' },
  { userId: 'user-guide-3', displayName: 'Sophie Bernard', bio: 'Artiste et guide dans le Paris boheme de Montmartre.', photoUrl: '/images/guides/sophie.jpg', city: 'Paris', parcoursSignature: 'Secrets de Montmartre', yearsExperience: 12, specialties: ['Art', 'Boheme', 'Histoire de Paris'], languages: ['Francais', 'Anglais', 'Espagnol'], rating: 5.0, tourCount: 1, verified: true, profileStatus: 'active' },
  { userId: 'user-guide-4', displayName: 'Antoine Rossi', bio: 'Ne a Lyon, je connais chaque traboule du Vieux Lyon.', photoUrl: null, city: 'Lyon', parcoursSignature: 'Traboules du Vieux Lyon', yearsExperience: 6, specialties: ['Architecture Renaissance', 'Patrimoine UNESCO', 'Gastronomie lyonnaise'], languages: ['Francais', 'Italien'], rating: 4.0, tourCount: 1, verified: true, profileStatus: 'active' },
];

const TOURS = [
  { guideId: '', title: "L'Ame des Parfumeurs", city: 'Grasse', status: 'published', description: 'Plongez dans l\'histoire de Grasse, capitale mondiale du parfum.', duration: 45, distance: 2.1, poiCount: 3 },
  { guideId: '', title: 'La Vieille Ville de Grasse', city: 'Grasse', status: 'published', description: 'Parcourez les ruelles medievales de la vieille ville de Grasse.', duration: 35, distance: 1.5, poiCount: 2 },
  { guideId: '', title: 'Secrets de Montmartre', city: 'Paris', status: 'published', description: 'De la Place du Tertre au Sacre-Coeur.', duration: 60, distance: 3.0, poiCount: 3 },
  { guideId: '', title: 'Traboules du Vieux Lyon', city: 'Lyon', status: 'published', description: 'Explorez les traboules secretes du Vieux Lyon.', duration: 50, distance: 2.5, poiCount: 2 },
];

const REVIEWS_PER_TOUR = [
  [
    { userId: 'u1', rating: 5, comment: 'Superbe visite ! Audio tres immersif.', language: 'fr' },
    { userId: 'u2', rating: 4, comment: 'Tres bien, parcours agreable.', language: 'fr' },
    { userId: 'u3', rating: 5, comment: 'Parfait pour decouvrir Grasse !', language: 'fr' },
    { userId: 'u8', rating: 4, comment: 'Bonne experience globale.', language: 'fr' },
  ],
  [
    { userId: 'u4', rating: 4, comment: 'Belles ruelles, guide audio agreable.', language: 'fr' },
    { userId: 'u9', rating: 5, comment: 'Magnifique decouverte.', language: 'fr' },
  ],
  [
    { userId: 'u5', rating: 5, comment: 'Montmartre comme on ne l\'a jamais vu !', language: 'fr' },
    { userId: 'u6', rating: 5, comment: 'Les anecdotes sont passionnantes.', language: 'fr' },
    { userId: 'u10', rating: 4, comment: 'Tres bonne visite guidee.', language: 'fr' },
  ],
  [
    { userId: 'u7', rating: 4, comment: 'Traboules magnifiques, audio clair.', language: 'fr' },
  ],
];

async function seed() {
  console.log('Seeding database...\n');

  // 1. Seed guides
  console.log('Creating guide profiles...');
  const guideIds: string[] = [];
  for (const guide of GUIDES) {
    try {
      const result = await (client.models as Record<string, { create: (input: Record<string, unknown>) => Promise<{ data: { id: string } }> }>).GuideProfile.create(guide);
      guideIds.push(result.data.id);
      console.log(`  + Guide: ${guide.displayName} (${result.data.id})`);
    } catch (err) {
      console.error(`  ! Failed to create guide ${guide.displayName}:`, err);
      guideIds.push('');
    }
  }

  // 2. Seed tours
  console.log('\nCreating tours...');
  const tourIds: string[] = [];
  for (let i = 0; i < TOURS.length; i++) {
    const tour = { ...TOURS[i], guideId: guideIds[i] || `guide-${i + 1}` };
    try {
      const result = await (client.models as Record<string, { create: (input: Record<string, unknown>) => Promise<{ data: { id: string } }> }>).GuideTour.create(tour);
      tourIds.push(result.data.id);
      console.log(`  + Tour: ${tour.title} (${result.data.id})`);
    } catch (err) {
      console.error(`  ! Failed to create tour ${tour.title}:`, err);
      tourIds.push('');
    }
  }

  // 3. Seed reviews
  console.log('\nCreating reviews...');
  let reviewCount = 0;
  for (let i = 0; i < tourIds.length; i++) {
    const tourId = tourIds[i];
    if (!tourId) continue;
    for (const review of REVIEWS_PER_TOUR[i] || []) {
      try {
        await (client.models as Record<string, { create: (input: Record<string, unknown>) => Promise<{ data: { id: string } }> }>).TourReview.create({
          tourId,
          ...review,
          rating: review.rating,
          visitedAt: Date.now() - Math.random() * 30 * 86400000,
          status: 'visible',
        });
        reviewCount++;
      } catch (err) {
        console.error(`  ! Failed to create review for tour ${tourId}:`, err);
      }
    }
  }
  console.log(`  + ${reviewCount} reviews created`);

  // 4. Seed TourStats
  console.log('\nCreating tour stats...');
  const tourRatings = [[5, 4, 5, 4], [4, 5], [5, 5, 4], [4]];
  for (let i = 0; i < tourIds.length; i++) {
    const tourId = tourIds[i];
    if (!tourId) continue;
    const ratings = tourRatings[i] || [];
    const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    try {
      await (client.models as Record<string, { create: (input: Record<string, unknown>) => Promise<{ data: { id: string } }> }>).TourStats.create({
        tourId,
        averageRating: Math.round(avg * 10) / 10,
        reviewCount: ratings.length,
        completionCount: 20 + Math.floor(Math.random() * 80),
      });
      console.log(`  + TourStats for ${TOURS[i].title}`);
    } catch (err) {
      console.error(`  ! Failed to create TourStats for ${tourId}:`, err);
    }
  }

  // 5. Seed moderation items
  console.log('\nCreating moderation items...');
  const moderationItems = [
    { tourId: tourIds[0] || 'tour-1', guideId: guideIds[0] || 'guide-1', guideName: 'Marie Dupont', tourTitle: 'Les Parfums Modernes', city: 'Grasse', submissionDate: Date.now() - 2 * 86400000, status: 'pending' },
    { tourId: 'nice-promenade', guideId: 'guide-5', guideName: 'Claire Moreau', tourTitle: 'La Promenade des Anglais', city: 'Nice', submissionDate: Date.now() - 3 * 86400000, status: 'approved', reviewerId: 'admin-1', reviewDate: Date.now() - 86400000, feedbackJson: '{}', checklistJson: '{}' },
  ];
  for (const item of moderationItems) {
    try {
      await (client.models as Record<string, { create: (input: Record<string, unknown>) => Promise<{ data: { id: string } }> }>).ModerationItem.create(item);
      console.log(`  + Moderation: ${item.tourTitle} (${item.status})`);
    } catch (err) {
      console.error(`  ! Failed to create moderation item:`, err);
    }
  }

  // 6. Seed GuideDashboardStats
  console.log('\nCreating dashboard stats...');
  if (guideIds[0]) {
    try {
      await (client.models as Record<string, { create: (input: Record<string, unknown>) => Promise<{ data: { id: string } }> }>).GuideDashboardStats.create({
        guideId: guideIds[0],
        statsJson: JSON.stringify({ totalListens: 347, revenueThisMonth: 124.60, averageRating: 4.7, pendingToursCount: 1 }),
        revenueJson: JSON.stringify({
          summary: { thisMonth: 124.60, total: 1847.30, currency: 'EUR' },
          months: [
            { month: '2026-03', grossRevenue: 178.00, guideShare: 124.60, tourguideShare: 53.40, listens: 58 },
            { month: '2026-02', grossRevenue: 245.00, guideShare: 171.50, tourguideShare: 73.50, listens: 82 },
          ],
          tours: [
            { tourId: tourIds[0], tourTitle: "L'Ame des Parfumeurs", listens: 289, revenue: 1543.20, percentage: 83.5 },
          ],
        }),
        lastRefreshed: Date.now(),
      });
      console.log('  + Dashboard stats for Marie Dupont');
    } catch (err) {
      console.error('  ! Failed to create dashboard stats:', err);
    }
  }

  console.log('\nSeeding complete!');
}

seed().catch(console.error);
