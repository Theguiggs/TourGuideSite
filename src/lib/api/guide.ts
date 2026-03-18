import type {
  GuideDashboardStats,
  GuideTourSummary,
  GuideTourStatus,
  GuideRevenueSummary,
  GuideRevenueMonth,
  GuideRevenueTour,
  GuideTourDetail,
  TourScene,
  AdminComment,
  TourDifficulty,
} from '@/types/guide';
import type { GuideProfile } from '@/types/tour';
import { shouldUseStubs } from '@/config/api-mode';
import * as appsync from './appsync-client';

export { createGuideTourMutation as createGuideTour } from './appsync-client';

/**
 * Guide data access layer (authenticated).
 * Stub mode: mock data. Real mode: Amplify AppSync.
 */

// --- Mock Data ---

const MOCK_STATS: GuideDashboardStats = {
  totalListens: 347,
  revenueThisMonth: 124.60,
  averageRating: 4.7,
  pendingToursCount: 1,
};

const MOCK_TOURS: GuideTourSummary[] = [
  { id: 'grasse-ame-parfumeurs', title: "L'Ame des Parfumeurs", city: 'Grasse', status: 'published', listens: 289, completionRate: 78, rating: 4.7, lastListenDate: '2026-03-05', rejectionFeedback: null, sessionId: null },
  { id: 'grasse-vieille-ville', title: 'La Vieille Ville de Grasse', city: 'Grasse', status: 'synced', listens: 0, completionRate: 0, rating: 0, lastListenDate: null, rejectionFeedback: null, sessionId: 'session-grasse-vieille-ville' },
  { id: 'grasse-parfums-modernes', title: 'Les Parfums Modernes', city: 'Grasse', status: 'review', listens: 0, completionRate: 0, rating: 0, lastListenDate: null, rejectionFeedback: null, sessionId: 'session-grasse-parfums' },
  { id: 'grasse-jardins-secrets', title: 'Les Jardins Secrets', city: 'Grasse', status: 'revision_requested', listens: 0, completionRate: 0, rating: 0, lastListenDate: null, rejectionFeedback: 'Ameliorer la description de la scene 2', sessionId: null },
];

const MOCK_SCENES: TourScene[] = [
  { id: 'scene-1', title: 'Place aux Aires', order: 1, audioRef: 'tours/grasse/scene_1.aac', photosRefs: ['tours/grasse/photo_1.jpg', 'tours/grasse/photo_2.jpg'], durationSeconds: 180 },
  { id: 'scene-2', title: 'Parfumerie Fragonard', order: 2, audioRef: 'tours/grasse/scene_2.aac', photosRefs: ['tours/grasse/photo_3.jpg'], durationSeconds: 240 },
  { id: 'scene-3', title: 'Musee de la Parfumerie', order: 3, audioRef: 'tours/grasse/scene_3.aac', photosRefs: [], durationSeconds: 200 },
];

const MOCK_ADMIN_COMMENTS: AdminComment[] = [
  { id: 'ac-1', comment: 'La description generale est excellente, bravo !', date: '2026-03-10T14:30:00Z', reviewerId: 'admin-1', reviewerName: 'Sophie Admin' },
  { id: 'ac-2', sceneId: 'scene-2', comment: 'Audio un peu faible sur cette scene — verifier le gain', date: '2026-03-10T14:32:00Z', reviewerId: 'admin-1', reviewerName: 'Sophie Admin' },
];

const MOCK_TOUR_DETAIL: Record<string, GuideTourDetail> = {
  'grasse-vieille-ville': {
    id: 'grasse-vieille-ville',
    guideId: 'guide-1',
    title: 'La Vieille Ville de Grasse',
    descriptionLongue: 'Decouvrez les ruelles medievales de Grasse, entre fontaines historiques et places ombragees. Un parcours authentique au coeur de la capitale mondiale du parfum.',
    city: 'Grasse',
    status: 'synced',
    duration: 45,
    distance: 2.1,
    poiCount: 3,
    difficulty: 'facile',
    themes: ['histoire', 'architecture'],
    languePrincipale: 'fr',
    scenes: MOCK_SCENES,
    adminComments: [],
    heroImageUrl: null,
    createdAt: '2026-03-08T10:00:00Z',
    updatedAt: '2026-03-10T15:00:00Z',
  },
  'grasse-jardins-secrets': {
    id: 'grasse-jardins-secrets',
    guideId: 'guide-1',
    title: 'Les Jardins Secrets',
    descriptionLongue: 'Un parcours bucolique a travers les jardins caches de Grasse.',
    city: 'Grasse',
    status: 'revision_requested',
    duration: 30,
    distance: 1.5,
    poiCount: 2,
    difficulty: 'facile',
    themes: ['nature', 'insolite'],
    languePrincipale: 'fr',
    scenes: MOCK_SCENES.slice(0, 2),
    adminComments: MOCK_ADMIN_COMMENTS,
    heroImageUrl: null,
    createdAt: '2026-03-05T08:00:00Z',
    updatedAt: '2026-03-10T14:35:00Z',
  },
};

const MOCK_REVENUE_SUMMARY: GuideRevenueSummary = { thisMonth: 124.60, total: 1847.30, currency: 'EUR' };

const MOCK_REVENUE_MONTHS: GuideRevenueMonth[] = [
  { month: '2026-03', grossRevenue: 178.00, guideShare: 124.60, tourguideShare: 53.40, listens: 58 },
  { month: '2026-02', grossRevenue: 245.00, guideShare: 171.50, tourguideShare: 73.50, listens: 82 },
  { month: '2026-01', grossRevenue: 312.00, guideShare: 218.40, tourguideShare: 93.60, listens: 104 },
  { month: '2025-12', grossRevenue: 198.00, guideShare: 138.60, tourguideShare: 59.40, listens: 66 },
  { month: '2025-11', grossRevenue: 156.00, guideShare: 109.20, tourguideShare: 46.80, listens: 52 },
  { month: '2025-10', grossRevenue: 89.00, guideShare: 62.30, tourguideShare: 26.70, listens: 30 },
];

const MOCK_REVENUE_TOURS: GuideRevenueTour[] = [
  { tourId: 'grasse-ame-parfumeurs', tourTitle: "L'Ame des Parfumeurs", listens: 289, revenue: 1543.20, percentage: 83.5 },
  { tourId: 'grasse-vieille-ville', tourTitle: 'La Vieille Ville de Grasse', listens: 58, revenue: 304.10, percentage: 16.5 },
];

const MOCK_PROFILE: GuideProfile = {
  id: 'guide-1',
  userId: 'user-guide-1',
  displayName: 'Marie Dupont',
  bio: 'Guide touristique passionnee par Grasse et son patrimoine parfumier. 15 ans d\'experience.',
  photoUrl: null,
  city: 'Grasse',
  parcoursSignature: "L'Ame des Parfumeurs",
  yearsExperience: 15,
  specialties: ['Parfumerie', 'Histoire locale', 'Architecture provencale'],
  languages: ['Francais', 'Anglais', 'Italien'],
  rating: 4.7,
  tourCount: 2,
  verified: true,
};

// --- Real API helpers ---

async function getRealDashboardStats(guideId: string): Promise<GuideDashboardStats> {
  const stats = await appsync.getGuideDashboardStatsById(guideId);
  if (!stats?.statsJson) return { totalListens: 0, revenueThisMonth: 0, averageRating: 0, pendingToursCount: 0 };
  try {
    return JSON.parse(stats.statsJson) as GuideDashboardStats;
  } catch {
    return { totalListens: 0, revenueThisMonth: 0, averageRating: 0, pendingToursCount: 0 };
  }
}

async function getRealGuideTours(guideId: string): Promise<GuideTourSummary[]> {
  const client = (await import('./appsync-client')).getClient();
  let tours: Awaited<ReturnType<typeof appsync.listGuideTours>> = [];
  try {
    const result = await client.models.GuideTour.list({
      filter: { guideId: { eq: guideId } },
      authMode: 'userPool',
    });
    tours = result.data ?? [];
  } catch {
    tours = [];
  }
  return tours
    .filter((t) => t.guideId === guideId)
    .map((t) => ({
      id: t.id,
      title: t.title,
      city: t.city,
      status: (t.status || 'draft') as GuideTourSummary['status'],
      listens: 0,
      completionRate: 0,
      rating: 0,
      lastListenDate: null,
      rejectionFeedback: null,
      sessionId: ((t as Record<string, unknown>).sessionId as string) ?? null,
    }));
}

async function getRealRevenue(guideId: string): Promise<{ summary: GuideRevenueSummary; months: GuideRevenueMonth[]; tours: GuideRevenueTour[] }> {
  const stats = await appsync.getGuideDashboardStatsById(guideId);
  if (!stats?.revenueJson) {
    return {
      summary: { thisMonth: 0, total: 0, currency: 'EUR' },
      months: [],
      tours: [],
    };
  }
  try {
    return JSON.parse(stats.revenueJson);
  } catch {
    return { summary: { thisMonth: 0, total: 0, currency: 'EUR' }, months: [], tours: [] };
  }
}

// --- Public API ---

export async function getGuideDashboardStats(guideId: string): Promise<GuideDashboardStats> {
  if (shouldUseStubs()) return MOCK_STATS;
  return getRealDashboardStats(guideId);
}

// In-memory store for stub-created tours (complements createdStudioSessions in studio.ts)
const createdStubTours: GuideTourSummary[] = [];

/** Add a stub tour to the in-memory list. Called by createTourWithSession in studio.ts. */
export function __addStubTour(tour: GuideTourSummary): void {
  createdStubTours.push(tour);
}

export async function getGuideTours(guideId: string): Promise<GuideTourSummary[]> {
  if (shouldUseStubs()) return [...MOCK_TOURS, ...createdStubTours];
  return getRealGuideTours(guideId);
}

export async function getGuideRevenueSummary(guideId: string): Promise<GuideRevenueSummary> {
  if (shouldUseStubs()) return MOCK_REVENUE_SUMMARY;
  const rev = await getRealRevenue(guideId);
  return rev.summary;
}

export async function getGuideRevenueMonths(guideId: string): Promise<GuideRevenueMonth[]> {
  if (shouldUseStubs()) return MOCK_REVENUE_MONTHS;
  const rev = await getRealRevenue(guideId);
  return rev.months;
}

export async function getGuideRevenueTours(guideId: string): Promise<GuideRevenueTour[]> {
  if (shouldUseStubs()) return MOCK_REVENUE_TOURS;
  const rev = await getRealRevenue(guideId);
  return rev.tours;
}

export async function getGuideProfile(guideId: string): Promise<GuideProfile | null> {
  if (shouldUseStubs()) {
    if (guideId === 'guide-1') return MOCK_PROFILE;
    return null;
  }
  const profile = await appsync.getGuideProfileById(guideId, 'userPool');
  if (!profile) return null;
  return {
    id: profile.id,
    userId: profile.userId,
    displayName: profile.displayName,
    bio: profile.bio ?? null,
    photoUrl: profile.photoUrl ?? null,
    city: profile.city,
    parcoursSignature: profile.parcoursSignature ?? null,
    yearsExperience: profile.yearsExperience ?? null,
    specialties: (profile.specialties as string[]) ?? [],
    languages: (profile.languages as string[]) ?? [],
    rating: profile.rating ?? null,
    tourCount: profile.tourCount ?? null,
    verified: profile.verified ?? false,
  };
}

export async function updateGuideProfile(
  guideId: string,
  updates: Partial<Pick<GuideProfile, 'displayName' | 'bio' | 'city' | 'specialties' | 'languages'>>,
): Promise<{ ok: boolean; error?: string }> {
  if (updates.displayName && (updates.displayName.length < 2 || updates.displayName.length > 50)) {
    return { ok: false, error: 'Le nom doit contenir entre 2 et 50 caracteres' };
  }
  if (updates.bio && updates.bio.length > 500) {
    return { ok: false, error: 'La bio ne doit pas depasser 500 caracteres' };
  }
  if (shouldUseStubs()) return { ok: true };
  const sanitized = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== null && v !== undefined),
  );
  const result = await appsync.updateGuideProfileMutation(guideId, sanitized);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function getGuideTour(tourId: string): Promise<{ id: string; title: string; city: string; status: string; description?: string | null } | null> {
  if (shouldUseStubs()) {
    const t = MOCK_TOURS.find((t) => t.id === tourId);
    return t ? { id: t.id, title: t.title, city: t.city, status: t.status } : null;
  }
  const tour = await appsync.getGuideTourById(tourId);
  if (!tour) return null;
  return { id: tour.id, title: tour.title, city: tour.city, status: tour.status ?? 'draft', description: tour.description };
}

/** Load full tour detail for the enriched editor */
export async function getGuideTourDetail(tourId: string): Promise<GuideTourDetail | null> {
  if (shouldUseStubs()) {
    const detail = MOCK_TOUR_DETAIL[tourId];
    if (detail) return detail;
    // Fallback: build a minimal detail from summary
    const t = MOCK_TOURS.find((t) => t.id === tourId);
    if (!t) return null;
    return {
      id: t.id,
      guideId: 'guide-1',
      title: t.title,
      descriptionLongue: '',
      city: t.city,
      status: t.status,
      duration: 0,
      distance: 0,
      poiCount: 0,
      difficulty: 'facile' as TourDifficulty,
      themes: [],
      languePrincipale: 'fr',
      scenes: [],
      adminComments: [],
      heroImageUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  const tour = await appsync.getGuideTourById(tourId);
  if (!tour) return null;
  // Cast to access enriched fields that will be added to the Amplify schema in a future deployment
  const t = tour as Record<string, unknown>;
  let scenes: TourScene[] = [];
  let adminComments: AdminComment[] = [];
  try { scenes = JSON.parse((t.scenesJson as string) ?? '[]'); } catch { /* empty */ }
  try { adminComments = JSON.parse((t.adminComments as string) ?? '[]'); } catch { /* empty */ }
  return {
    id: tour.id,
    guideId: tour.guideId,
    title: tour.title,
    descriptionLongue: (t.descriptionLongue as string) ?? '',
    city: tour.city,
    status: (tour.status ?? 'draft') as GuideTourStatus,
    duration: tour.duration ?? 0,
    distance: tour.distance ?? 0,
    poiCount: tour.poiCount ?? 0,
    difficulty: ((t.difficulty as string) ?? 'facile') as TourDifficulty,
    themes: (t.themes as string[]) ?? [],
    languePrincipale: (t.languePrincipale as string) ?? 'fr',
    scenes,
    adminComments,
    heroImageUrl: (t.heroImageUrl as string) ?? null,
    createdAt: tour.createdAt ?? new Date().toISOString(),
    updatedAt: tour.updatedAt ?? new Date().toISOString(),
  };
}

export async function updateGuideTourStatus(
  tourId: string,
  status: GuideTourStatus,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseStubs()) return { ok: true };
  const result = await appsync.updateGuideTourMutation(tourId, { status });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function updateGuideTour(
  tourId: string,
  updates: Partial<{
    title: string;
    description: string;
    descriptionLongue: string;
    difficulty: TourDifficulty;
    themes: string[];
    languePrincipale: string;
    scenesJson: string;
    heroImageUrl: string | null;
    status: GuideTourStatus;
  }>,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseStubs()) return { ok: true };
  const result = await appsync.updateGuideTourMutation(tourId, updates);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/** Submit tour for admin review (editing|revision_requested → review) */
export async function submitTourForReview(
  tourId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true };
  }
  const result = await appsync.updateGuideTourMutation(tourId, { status: 'review' });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function submitTourForModeration(
  tourId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseStubs()) return { ok: true };

  // Load tour info needed for the ModerationItem
  const tour = await appsync.getGuideTourById(tourId);
  if (!tour) return { ok: false, error: 'Parcours introuvable' };

  const profile = await appsync.getGuideProfileById(tour.guideId, 'userPool');

  const [tourResult, modResult] = await Promise.all([
    appsync.updateGuideTourMutation(tourId, { status: 'pending_moderation' }),
    appsync.createModerationItemMutation({
      tourId,
      guideId: tour.guideId,
      guideName: profile?.displayName ?? 'Guide',
      tourTitle: tour.title,
      city: tour.city,
      submissionDate: Date.now(),
    }),
  ]);

  if (!tourResult.ok) return { ok: false, error: tourResult.error };
  if (!modResult.ok) return { ok: false, error: modResult.error };
  return { ok: true };
}

/** Save an admin comment on a tour */
export async function addAdminComment(
  tourId: string,
  comment: Omit<AdminComment, 'id'>,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true };
  }
  // In real mode: load existing comments, append, save back
  const tour = await appsync.getGuideTourById(tourId);
  if (!tour) return { ok: false, error: 'Parcours introuvable' };
  const t = tour as Record<string, unknown>;
  let existing: AdminComment[] = [];
  try { existing = JSON.parse((t.adminComments as string) ?? '[]'); } catch { /* empty */ }
  const newComment: AdminComment = { ...comment, id: `ac-${Date.now()}` };
  existing.push(newComment);
  const result = await appsync.updateGuideTourMutation(tourId, {
    adminComments: JSON.stringify(existing),
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
