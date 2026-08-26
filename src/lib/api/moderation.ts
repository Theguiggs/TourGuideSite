import { logger } from '@/lib/logger';
import type {
  ModerationItem,
  ModerationDetail,
  ModerationMetrics,
  ModerationHistoryItem,
  ModerationScene,
  ModerationAdminComment,
  RejectionCategory,
  LanguageModerationItem,
} from '@/types/moderation';
import { addAdminComment as addAdminCommentToTour } from './guide';
import { shouldUseStubs } from '@/config/api-mode';
import * as appsync from './appsync-client';
import { addTourComment } from './tour-comments';
import {
  AUDIO_DISCLOSURE_ERR,
  coversLanguage,
  deriveSourceAudioType,
  disclosureWriteViolation,
  mergeLanguageAudioType,
  normalizeLanguageTag,
  type AudioSourceScene,
  type LanguageAudioTypes,
} from './audio-source-policy';
import { translatedMetadataUpdate } from './translated-metadata';

/**
 * Moderation data access layer.
 * Stub mode: mock data. Real mode: Amplify AppSync.
 */

// --- Mock Data ---

const MOCK_QUEUE: ModerationItem[] = [
  {
    id: 'mod-1', tourId: 'grasse-parfums-modernes', sessionId: 'session-grasse-1', tourTitle: 'Les Parfums Modernes',
    guideId: 'guide-1', guideName: 'Marie Dupont', guidePhotoUrl: '/images/guides/marie.jpg',
    city: 'Grasse', submissionDate: '2026-03-05T14:30:00.000Z', status: 'pending',
    isResubmission: false, poiCount: 5, duration: 40, distance: 1.8,
  },
  {
    id: 'mod-2', tourId: 'nice-promenade-anglais', sessionId: 'session-nice-1', tourTitle: 'La Promenade des Anglais',
    guideId: 'guide-5', guideName: 'Claire Moreau', guidePhotoUrl: null,
    city: 'Nice', submissionDate: '2026-03-04T10:15:00.000Z', status: 'resubmitted',
    isResubmission: true, poiCount: 7, duration: 55, distance: 3.2,
  },
  {
    id: 'mod-3', tourId: 'cannes-croisette', sessionId: 'session-cannes-1', tourTitle: 'La Croisette et le Vieux Cannes',
    guideId: 'guide-6', guideName: 'Thomas Leroy', guidePhotoUrl: null,
    city: 'Cannes', submissionDate: '2026-03-06T09:00:00.000Z', status: 'pending',
    isResubmission: false, poiCount: 6, duration: 45, distance: 2.4,
  },
];

const MOCK_SCENES: ModerationScene[] = [
  { id: 'scene-1', title: 'Place aux Aires', order: 1, audioRef: 'tours/grasse/scene_1.aac', photosRefs: ['tours/grasse/photo_1.jpg', 'tours/grasse/photo_2.jpg'], durationSeconds: 180, latitude: 43.6591, longitude: 6.9243, poiDescription: 'Point de départ, ancien marché aux herbes', transcriptText: 'Bienvenue sur la place aux Aires...' },
  { id: 'scene-2', title: 'Parfumerie Fragonard', order: 2, audioRef: 'tours/grasse/scene_2.aac', photosRefs: ['tours/grasse/photo_3.jpg'], durationSeconds: 240, latitude: 43.6587, longitude: 6.9221, poiDescription: 'Maison de parfum historique', transcriptText: null },
  { id: 'scene-3', title: 'Musee de la Parfumerie', order: 3, audioRef: 'tours/grasse/scene_3.aac', photosRefs: [], durationSeconds: 200, latitude: 43.6583, longitude: 6.9215, poiDescription: null, transcriptText: null },
];

const MOCK_ADMIN_COMMENTS: ModerationAdminComment[] = [
  { id: 'ac-1', comment: 'La description generale est excellente, bravo !', date: '2026-03-10T14:30:00Z', reviewerId: 'admin-1', reviewerName: 'Sophie Admin' },
  { id: 'ac-2', sceneId: 'scene-2', comment: 'Audio un peu faible sur cette scene — verifier le gain', date: '2026-03-10T14:32:00Z', reviewerId: 'admin-1', reviewerName: 'Sophie Admin' },
];

const ENRICHED_DEFAULTS = {
  themes: [] as string[],
  languePrincipale: 'fr',
  difficulty: 'facile',
  scenes: [] as ModerationScene[],
  adminComments: [] as ModerationAdminComment[],
  heroImageUrl: null,
  guideBio: null as string | null,
  guideLanguages: [] as string[],
  guideTourCount: 0,
};

const MOCK_DETAIL: Record<string, ModerationDetail> = {
  'mod-1': {
    ...MOCK_QUEUE[0],
    description: 'Decouvrez l\'evolution de la parfumerie grassoise, des techniques traditionnelles aux innovations modernes.',
    descriptionLongue: 'Decouvrez l\'evolution de la parfumerie grassoise, des techniques traditionnelles aux innovations modernes. Un parcours olfactif unique a travers les ateliers et jardins de Grasse.',
    guideSubmissionCount: 3, guideApprovalRate: 67, isFirstSubmission: false,
    themes: ['gastronomie', 'histoire', 'culture'],
    languePrincipale: 'fr',
    difficulty: 'facile',
    scenes: MOCK_SCENES,
    adminComments: [],
    heroImageUrl: null,
    guideBio: 'Guide touristique passionnee par Grasse et son patrimoine parfumier. 15 ans d\'experience.',
    guideLanguages: ['Francais', 'Anglais', 'Italien'],
    guideTourCount: 2,
    pois: [
      { id: 'mp1', order: 1, title: 'Musee de la Parfumerie', descriptionFr: 'Le musee retrace l\'histoire de la parfumerie.', descriptionEn: 'The museum traces the history of perfumery.', audioUrl: null, audioDuration: 120, latitude: 43.6583, longitude: 6.9215, wordCountFr: 15, wordCountEn: 16 },
      { id: 'mp2', order: 2, title: 'Laboratoire Galimard', descriptionFr: 'Fondee en 1747, Galimard est une parfumerie historique.', descriptionEn: 'Founded in 1747, Galimard is a historic perfumery.', audioUrl: null, audioDuration: 90, latitude: 43.6575, longitude: 6.9205, wordCountFr: 14, wordCountEn: 14 },
      { id: 'mp3', order: 3, title: 'Les Champs de Roses', descriptionFr: 'Les champs de roses de mai.', descriptionEn: 'The May rose fields.', audioUrl: null, audioDuration: 110, latitude: 43.6560, longitude: 6.9190, wordCountFr: 13, wordCountEn: 12 },
      { id: 'mp4', order: 4, title: 'Atelier de Creation', descriptionFr: 'Un atelier pour creer sa fragrance.', descriptionEn: 'A workshop to create your fragrance.', audioUrl: null, audioDuration: 100, latitude: 43.6555, longitude: 6.9180, wordCountFr: 11, wordCountEn: 10 },
      { id: 'mp5', order: 5, title: 'Jardin des Plantes Aromatiques', descriptionFr: 'Un jardin de plantes aromatiques.', descriptionEn: 'An aromatic plants garden.', audioUrl: null, audioDuration: 95, latitude: 43.6548, longitude: 6.9170, wordCountFr: 10, wordCountEn: 9 },
    ],
  },
  'mod-2': {
    ...MOCK_QUEUE[1],
    description: 'Parcourez la celebre Promenade des Anglais.',
    descriptionLongue: 'Parcourez la celebre Promenade des Anglais, du Negresco au jardin Albert 1er.',
    guideSubmissionCount: 2, guideApprovalRate: 50, isFirstSubmission: false,
    ...ENRICHED_DEFAULTS,
    themes: ['architecture', 'histoire'],
    scenes: MOCK_SCENES.slice(0, 2),
    adminComments: MOCK_ADMIN_COMMENTS,
    guideBio: 'Guide polyglotte basee a Nice.',
    guideLanguages: ['Francais', 'Anglais'],
    guideTourCount: 1,
    pois: [
      { id: 'np1', order: 1, title: 'Hotel Negresco', descriptionFr: 'Le palace emblematique.', descriptionEn: 'The iconic palace.', audioUrl: null, audioDuration: 130, latitude: 43.6945, longitude: 7.2575, wordCountFr: 11, wordCountEn: 13 },
      { id: 'np2', order: 2, title: 'Jardin Albert 1er', descriptionFr: 'Le premier jardin public de Nice.', descriptionEn: 'The first public garden of Nice.', audioUrl: null, audioDuration: 85, latitude: 43.6950, longitude: 7.2665, wordCountFr: 10, wordCountEn: 10 },
    ],
  },
  'mod-3': {
    ...MOCK_QUEUE[2],
    description: 'De la Croisette au Suquet.',
    descriptionLongue: 'De la Croisette au Suquet, decouvrez Cannes sous un angle historique.',
    guideSubmissionCount: 1, guideApprovalRate: 0, isFirstSubmission: true,
    ...ENRICHED_DEFAULTS,
    themes: ['culture'],
    pois: [
      { id: 'cp1', order: 1, title: 'Palais des Festivals', descriptionFr: 'Le celebre palais du Festival de Cannes.', descriptionEn: 'The famous Cannes Festival palace.', audioUrl: null, audioDuration: 140, latitude: 43.5510, longitude: 7.0173, wordCountFr: 13, wordCountEn: 14 },
    ],
  },
};

const MOCK_HISTORY: ModerationHistoryItem[] = [
  { id: 'hist-1', tourTitle: "L'Ame des Parfumeurs", guideName: 'Marie Dupont', city: 'Grasse', decision: 'approved', reviewDate: '2026-02-20T16:00:00.000Z', reviewerName: 'Guillaume', feedback: null },
  { id: 'hist-2', tourTitle: 'Nice Baroque', guideName: 'Claire Moreau', city: 'Nice', decision: 'rejected', reviewDate: '2026-02-25T11:30:00.000Z', reviewerName: 'Guillaume', feedback: 'Qualite audio insuffisante sur 3 POIs.' },
  { id: 'hist-3', tourTitle: 'La Vieille Ville de Grasse', guideName: 'Pierre Martin', city: 'Grasse', decision: 'approved', reviewDate: '2026-02-28T14:00:00.000Z', reviewerName: 'Guillaume', feedback: null },
  { id: 'hist-4', tourTitle: 'Secrets de Montmartre', guideName: 'Sophie Bernard', city: 'Paris', decision: 'approved', reviewDate: '2026-03-01T10:00:00.000Z', reviewerName: 'Guillaume', feedback: null },
];

const MOCK_METRICS: ModerationMetrics = {
  pendingCount: 3, avgReviewTimeMinutes: 12, approvalRate: 75, reviewedThisMonth: 4,
};

// --- Real API helpers ---

async function getRealQueue(): Promise<ModerationItem[]> {
  // Fetch pending and resubmitted items separately (server-side filter)
  const [pending, resubmitted] = await Promise.all([
    appsync.listModerationItems({ status: 'pending' }),
    appsync.listModerationItems({ status: 'resubmitted' }),
  ]);
  const items = [...pending, ...resubmitted];
  return items
    .map((i) => ({
      id: i.id, tourId: i.tourId, sessionId: (i as Record<string, unknown>).sessionId as string ?? '', tourTitle: i.tourTitle,
      guideId: i.guideId, guideName: i.guideName, guidePhotoUrl: null,
      city: i.city, submissionDate: new Date(i.submissionDate).toISOString(),
      status: i.status as ModerationItem['status'],
      isResubmission: i.status === 'resubmitted',
      poiCount: (i as Record<string, unknown>).poiCount as number ?? 0,
      duration: (i as Record<string, unknown>).duration as number ?? 0,
      distance: (i as Record<string, unknown>).distance as number ?? 0,
    }))
    .sort((a, b) => {
      if (a.isResubmission !== b.isResubmission) return a.isResubmission ? -1 : 1;
      return new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime();
    });
}

async function getRealHistory(): Promise<ModerationHistoryItem[]> {
  const [approved, rejected] = await Promise.all([
    appsync.listModerationItems({ status: 'approved' }),
    appsync.listModerationItems({ status: 'rejected' }),
  ]);
  const items = [...approved, ...rejected];
  return items
    .map((i) => ({
      id: i.id, tourTitle: i.tourTitle, guideName: i.guideName, city: i.city,
      decision: i.status as 'approved' | 'rejected',
      reviewDate: i.reviewDate ? new Date(i.reviewDate).toISOString() : '',
      reviewerName: i.reviewerId ?? '',
      feedback: i.feedbackJson ? (() => { try { return JSON.parse(i.feedbackJson).feedback ?? null; } catch { return null; } })() : null,
    }))
    .sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
}

// --- Language Moderation Queue Mock Data ---

const MOCK_LANGUAGE_QUEUE: LanguageModerationItem[] = [
  {
    id: 'lmod-1', tourId: 'grasse-parfums-modernes', sessionId: 'session-grasse-1', moderationItemId: 'mod-1',
    tourTitle: 'Les Parfums Modernes', guideName: 'Marie Dupont', guidePhotoUrl: '/images/guides/marie.jpg',
    city: 'Grasse', language: 'en', qualityTier: 'standard',
    submissionDate: '2026-03-05T14:30:00.000Z', moderationStatus: 'pending', purchaseId: 'purchase-grasse-1-en',
  },
  {
    id: 'lmod-2', tourId: 'grasse-parfums-modernes', sessionId: 'session-grasse-1', moderationItemId: 'mod-1',
    tourTitle: 'Les Parfums Modernes', guideName: 'Marie Dupont', guidePhotoUrl: '/images/guides/marie.jpg',
    city: 'Grasse', language: 'es', qualityTier: 'premium',
    submissionDate: '2026-03-05T15:00:00.000Z', moderationStatus: 'pending', purchaseId: 'purchase-grasse-1-es',
  },
  {
    id: 'lmod-3', tourId: 'nice-promenade-anglais', sessionId: 'session-nice-1', moderationItemId: 'mod-2',
    tourTitle: 'La Promenade des Anglais', guideName: 'Claire Moreau', guidePhotoUrl: null,
    city: 'Nice', language: 'it', qualityTier: 'standard',
    submissionDate: '2026-03-04T10:15:00.000Z', moderationStatus: 'resubmitted', purchaseId: 'purchase-nice-1-it',
  },
  {
    id: 'lmod-4', tourId: 'cannes-croisette', sessionId: 'session-cannes-1', moderationItemId: 'mod-3',
    tourTitle: 'La Croisette et le Vieux Cannes', guideName: 'Thomas Leroy', guidePhotoUrl: null,
    city: 'Cannes', language: 'de', qualityTier: 'standard',
    submissionDate: '2026-03-06T09:00:00.000Z', moderationStatus: 'pending', purchaseId: 'purchase-cannes-1-de',
  },
];

// --- Public API ---

export async function getModerationQueue(): Promise<ModerationItem[]> {
  if (shouldUseStubs()) {
    return [...MOCK_QUEUE].sort((a, b) => {
      if (a.isResubmission !== b.isResubmission) return a.isResubmission ? -1 : 1;
      return new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime();
    });
  }
  return getRealQueue();
}

export async function getLanguageModerationQueue(): Promise<LanguageModerationItem[]> {
  if (shouldUseStubs()) {
    // Synthesize source-language rows for pending/resubmitted MOCK_QUEUE items
    const sourceRows: LanguageModerationItem[] = MOCK_QUEUE
      .filter((m) => m.status === 'pending' || m.status === 'resubmitted')
      .filter((m) => !MOCK_LANGUAGE_QUEUE.some((l) => l.tourId === m.tourId && l.language === 'fr'))
      .map((m) => ({
        id: `source-${m.id}`,
        tourId: m.tourId,
        sessionId: m.sessionId,
        moderationItemId: m.id,
        tourTitle: m.tourTitle,
        guideName: m.guideName,
        guidePhotoUrl: m.guidePhotoUrl,
        city: m.city,
        language: 'fr',
        qualityTier: 'source',
        submissionDate: m.submissionDate,
        moderationStatus: m.status,
        purchaseId: '',
        isSourceLanguage: true,
      }));
    return [...sourceRows, ...MOCK_LANGUAGE_QUEUE].sort(
      (a, b) => new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime(),
    );
  }

  // Real mode: scan ALL tours with sessions, find purchases with moderationStatus 'submitted'
  // This is independent of ModerationItem status (the tour source may already be approved)
  const { listLanguagePurchases } = await import('./language-purchase');
  const allTours = await appsync.listAllGuideTours();
  const profiles = await appsync.listAllGuideProfilesAdmin();
  const guideNames = new Map(profiles.map((p) => [p.id, p.displayName]));

  // Find ModerationItem IDs for linking (best-effort)
  const [pendingItems, resubmittedItems, approvedItems] = await Promise.all([
    appsync.listModerationItems({ status: 'pending' }),
    appsync.listModerationItems({ status: 'resubmitted' }),
    appsync.listModerationItems({ status: 'approved' }),
  ]);
  const allModItems = [...pendingItems, ...resubmittedItems, ...approvedItems];
  const modItemByTourId = new Map(allModItems.map((m) => [m.tourId, m.id]));

  // Filter tours that have a sessionId (needed for purchase lookup)
  const toursWithSessions = allTours.filter((t) => (t as Record<string, unknown>).sessionId);

  const purchaseResults = await Promise.all(
    toursWithSessions.map(async (tour) => {
      const sessionId = (tour as Record<string, unknown>).sessionId as string;
      const result = await listLanguagePurchases(sessionId);
      return { tour, sessionId, purchases: result };
    }),
  );

  const allLangItems: LanguageModerationItem[] = [];
  for (const { tour, sessionId, purchases: purchasesResult } of purchaseResults) {
    if (!purchasesResult.ok) continue;

    const submitted = purchasesResult.value.filter(
      (p) => p.moderationStatus === 'submitted',
    );

    for (const purchase of submitted) {
      allLangItems.push({
        id: `lmod-${tour.id}-${purchase.language}`,
        tourId: tour.id,
        sessionId,
        moderationItemId: modItemByTourId.get(tour.id) ?? tour.id,
        tourTitle: tour.title,
        guideName: guideNames.get(tour.guideId) ?? '',
        guidePhotoUrl: null,
        city: tour.city,
        language: purchase.language,
        qualityTier: purchase.qualityTier,
        submissionDate: purchase.createdAt ?? new Date().toISOString(),
        moderationStatus: purchase.moderationStatus as LanguageModerationItem['moderationStatus'],
        purchaseId: purchase.id,
      });
    }
  }

  // Synthesize source-language rows for tour-level submissions (FR base or whatever languePrincipale).
  // These appear whenever a ModerationItem is pending/resubmitted, even with no language purchase.
  const tourById = new Map(allTours.map((t) => [t.id, t]));
  const purchaseKeys = new Set(allLangItems.map((item) => `${item.tourId}:${item.language}`));
  const sourceModItems = [...pendingItems, ...resubmittedItems];
  for (const modItem of sourceModItems) {
    const tour = tourById.get(modItem.tourId);
    if (!tour) continue;
    const tourRaw = tour as Record<string, unknown>;
    const sourceLang = (tourRaw.languePrincipale as string) ?? 'fr';
    const key = `${tour.id}:${sourceLang}`;
    if (purchaseKeys.has(key)) continue; // Already covered by a purchase row for that language

    const sessionId = (modItem as Record<string, unknown>).sessionId as string
      ?? (tourRaw.sessionId as string)
      ?? '';

    allLangItems.push({
      id: `source-${modItem.id}`,
      tourId: tour.id,
      sessionId,
      moderationItemId: modItem.id,
      tourTitle: tour.title,
      guideName: guideNames.get(tour.guideId) ?? '',
      guidePhotoUrl: null,
      city: tour.city,
      language: sourceLang,
      qualityTier: 'source',
      submissionDate: new Date(modItem.submissionDate).toISOString(),
      moderationStatus: modItem.status as LanguageModerationItem['moderationStatus'],
      purchaseId: '',
      isSourceLanguage: true,
    });
  }

  return allLangItems.sort(
    (a, b) => new Date(a.submissionDate).getTime() - new Date(b.submissionDate).getTime(),
  );
}

export async function getModerationDetail(moderationId: string): Promise<ModerationDetail | null> {
  if (shouldUseStubs()) return MOCK_DETAIL[moderationId] ?? null;
  let item = await appsync.getModerationItemById(moderationId);

  // Fallback: moderationId might be a tourId (language queue items for already-approved tours)
  if (!item) {
    const fallbackTour = await appsync.getGuideTourById(moderationId);
    if (!fallbackTour) return null;
    const fallbackProfile = await appsync.getGuideProfileById(fallbackTour.guideId, 'userPool');
    item = {
      id: moderationId,
      tourId: fallbackTour.id,
      guideId: fallbackTour.guideId,
      guideName: fallbackProfile?.displayName ?? '',
      tourTitle: fallbackTour.title,
      city: fallbackTour.city,
      submissionDate: Date.now(),
      status: fallbackTour.status ?? 'published',
      sessionId: (fallbackTour as Record<string, unknown>).sessionId as string ?? null,
      poiCount: fallbackTour.poiCount ?? 0,
      duration: fallbackTour.duration ?? 0,
      distance: fallbackTour.distance ?? 0,
    } as unknown as NonNullable<typeof item>;
  }
  if (!item) return null;

  // Load tour, guide profile, and studio scenes in parallel
  const tourData = await appsync.getGuideTourById(item.tourId);
  const t = tourData as Record<string, unknown> | null;
  // sessionId can be on ModerationItem (new) or GuideTour (legacy)
  const sessionId = (item as Record<string, unknown>).sessionId as string
    ?? (t?.sessionId as string)
    ?? null;

  logger.info('ModerationAPI', 'getModerationDetail: loading data', {
    moderationId,
    tourId: item.tourId,
    sessionId,
    guideId: item.guideId,
    hasTour: !!tourData,
  });

  const [guideProfile, studioScenesResult] = await Promise.all([
    appsync.getGuideProfileById(item.guideId, 'userPool'),
    sessionId ? appsync.listStudioScenesBySession(sessionId) : Promise.resolve({ ok: false as const, data: [], error: 'no session' }),
  ]);

  logger.info('ModerationAPI', 'getModerationDetail: scenes loaded', {
    scenesOk: studioScenesResult.ok,
    scenesCount: studioScenesResult.ok ? studioScenesResult.data.length : 0,
    guideProfileFound: !!guideProfile,
  });

  // Map StudioScenes to ModerationScene format
  let scenes: ModerationScene[] = [];
  if (studioScenesResult.ok && studioScenesResult.data.length > 0) {
    scenes = studioScenesResult.data.map((s: Record<string, unknown>) => {
      const raw = s as Record<string, unknown>;
      return {
        id: raw.id as string,
        title: (raw.title as string) || `Scène ${((raw.sceneIndex as number) ?? 0) + 1}`,
        order: ((raw.sceneIndex as number) ?? 0) + 1,
        audioRef: (raw.studioAudioKey as string) || (raw.originalAudioKey as string) || '',
        photosRefs: (raw.photosRefs as string[]) ?? [],
        durationSeconds: 0,
        latitude: (raw.latitude as number) ?? null,
        longitude: (raw.longitude as number) ?? null,
        poiDescription: (raw.poiDescription as string) ?? null,
        transcriptText: (raw.transcriptText as string) ?? null,
      };
    });
  } else if (t) {
    // Fallback: try legacy scenesJson on GuideTour
    try {
      const legacy = JSON.parse((t.scenesJson as string) ?? '[]') as ModerationScene[];
      scenes = legacy.map((s) => ({ ...s, latitude: s.latitude ?? null, longitude: s.longitude ?? null, poiDescription: s.poiDescription ?? null, transcriptText: s.transcriptText ?? null }));
    } catch { /* empty */ }
  }

  let adminComments: ModerationAdminComment[] = [];
  if (t) {
    try { adminComments = JSON.parse((t.adminComments as string) ?? '[]'); } catch { /* empty */ }
  }

  return {
    id: item.id, tourId: item.tourId, sessionId: (item as Record<string, unknown>).sessionId as string ?? '', tourTitle: item.tourTitle,
    guideId: item.guideId, guideName: item.guideName, guidePhotoUrl: null,
    city: item.city, submissionDate: new Date(item.submissionDate).toISOString(),
    status: item.status as ModerationDetail['status'],
    isResubmission: item.status === 'resubmitted',
    poiCount: scenes.length, duration: tourData?.duration ?? 0, distance: tourData?.distance ?? 0,
    description: tourData?.description ?? '',
    descriptionLongue: (t?.descriptionLongue as string) ?? '',
    pois: [],
    guideSubmissionCount: 0, guideApprovalRate: 0, isFirstSubmission: false,
    themes: (t?.themes as string[]) ?? [],
    languePrincipale: (t?.languePrincipale as string) ?? 'fr',
    difficulty: (t?.difficulty as string) ?? 'facile',
    scenes,
    adminComments,
    heroImageUrl: (t?.heroImageUrl as string) ?? null,
    guideBio: guideProfile?.bio ?? null,
    guideLanguages: (guideProfile?.languages as string[]) ?? [],
    guideTourCount: guideProfile?.tourCount ?? 0,
  };
}

export async function getModerationMetrics(): Promise<ModerationMetrics> {
  if (shouldUseStubs()) return MOCK_METRICS;
  const [pendingItems, resubmitted, approvedItems, rejectedItems] = await Promise.all([
    appsync.listModerationItems({ status: 'pending' }),
    appsync.listModerationItems({ status: 'resubmitted' }),
    appsync.listModerationItems({ status: 'approved' }),
    appsync.listModerationItems({ status: 'rejected' }),
  ]);
  const pending = [...pendingItems, ...resubmitted];
  const reviewed = [...approvedItems, ...rejectedItems];
  const approved = approvedItems;
  return {
    pendingCount: pending.length,
    avgReviewTimeMinutes: 0,
    approvalRate: reviewed.length > 0 ? Math.round((approved.length / reviewed.length) * 100) : 0,
    reviewedThisMonth: reviewed.length,
  };
}

export async function getModerationHistory(): Promise<ModerationHistoryItem[]> {
  if (shouldUseStubs()) {
    return MOCK_HISTORY.sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
  }
  return getRealHistory();
}

/**
 * Resolve a ModerationItem by ID or tourId fallback.
 * The admin queue may pass a tourId instead of a moderationItemId for tours
 * that were already approved (no pending ModerationItem).
 */
async function resolveModerationItem(idOrTourId: string) {
  // Try direct lookup by ID first
  const item = await appsync.getModerationItemById(idOrTourId);
  if (item) return item;

  // Fallback: search by tourId in existing items
  const allItems = await appsync.listModerationItems();
  const byTour = allItems.find((i) => (i as Record<string, unknown>).tourId === idOrTourId);
  if (byTour) return byTour;

  // Last resort: create a ModerationItem from the GuideTour (for tours without one)
  const tour = await appsync.getGuideTourById(idOrTourId);
  if (!tour) return null;
  const profile = await appsync.getGuideProfileById(tour.guideId, 'userPool');
  try {
    const created = await appsync.createModerationItemMutation({
      tourId: idOrTourId,
      guideId: tour.guideId,
      guideName: profile?.displayName ?? 'Guide',
      tourTitle: tour.title,
      city: tour.city,
      submissionDate: Date.now(),
    });
    if (created.ok) {
      logger.info('ModerationAPI', 'Auto-created ModerationItem for tour', { tourId: idOrTourId });
      return await appsync.getModerationItemById(created.data.id);
    }
  } catch (e) {
    logger.error('ModerationAPI', 'Failed to auto-create ModerationItem', { tourId: idOrTourId, error: String(e) });
  }
  return null;
}

// BTU-8 — practical visitor info derived at approval time.
const LOOP_THRESHOLD_METERS = 100;

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Same free Nominatim service already used for forward geocoding in the itinerary tracer. */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

const DEFAULT_SOURCE_LANGUAGE = 'fr';

/** Lecture en echec — reessayer a du sens. */
const ERR_UNVERIFIABLE = `[${AUDIO_DISCLOSURE_ERR.DISCLOSURE_UNVERIFIABLE}] Lecture du parcours en échec : mention de source audio invérifiable, publication refusée. Réessayez.`;
/** Visite inexistante — reessayer n'a aucun sens. */
const ERR_TOUR_NOT_FOUND = `[${AUDIO_DISCLOSURE_ERR.TOUR_NOT_FOUND}] Parcours introuvable : publication refusée.`;

/**
 * Langue source d'une Visite. Elle ne vit pas sur `GuideTour` mais sur la
 * `StudioSession`. Normalisée : sans cela une valeur vide rangerait la mention
 * sous la clé `''`, invisible à toute lecture `languageAudioTypes['fr']`, et la
 * garde l'accepterait puisque la clé existe. `'FR'` et `'fr-FR'` se replient
 * aussi sur `'fr'`.
 */
function sourceLanguageOf(session: { language?: string | null } | null): string {
  return normalizeLanguageTag(session?.language) ?? DEFAULT_SOURCE_LANGUAGE;
}

/**
 * Session Studio, ou `null` — y compris si la lecture échoue : `getStudioSession`
 * rend déjà `null` sur erreur, et la langue source retombe alors sur son défaut.
 */
async function loadStudioSession(sessionId: string | undefined, context: string) {
  if (!sessionId) return null;
  try {
    const { getStudioSession } = await import('./studio');
    return await getStudioSession(sessionId);
  } catch (e) {
    logger.warn('ModerationAPI', `${context}: StudioSession read failed`, { sessionId, error: String(e) });
    return null;
  }
}

type LoadedStudioSession = Awaited<ReturnType<typeof loadStudioSession>>;

type DisclosureOutcome =
  | { ok: true; sourceLang: string; updates: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Construit la charge utile de publication : la mention de source pour la langue
 * source, fusionnée dans la carte déjà persistée, ET les métadonnées traduites
 * projetées depuis la StudioSession. Le nom dit « disclosure » par héritage ; la
 * fonction est le point d'assemblage de tout ce qui doit voyager avec
 * `status: 'published'` sur le chemin d'approbation. Le second chemin de
 * publication, `adminSetTourStatus`, applique les mêmes règles sans dériver.
 *
 * Toute lecture en échec REFUSE (29xx) au lieu de retomber sur le défaut :
 *  - `getGuideTourResult` distingue « absente » de « lecture en échec » ; sans la
 *    Visite, la fusion est impossible et écrire effacerait les autres langues ;
 *  - `listStudioScenesBySession` renvoie un Result — contrairement à
 *    `listStudioScenes`, qui rend `[]` aussi bien pour « aucune scène » que pour
 *    une lecture ratée. Publier une visite humaine en « voix de synthèse » sur
 *    une panne de lecture serait un mensonge sans correction ultérieure possible.
 *
 * `sessionId` absent est en revanche un cas légitime, pas une panne : un
 * ModerationItem auto-créé par `resolveModerationItem` n'en porte pas, les scènes
 * sont alors inatteignables et l'absence de preuve vaut `'tts'`.
 */
async function deriveSourceDisclosure(
  tourId: string,
  sessionId: string | undefined,
  sessionRead: Promise<LoadedStudioSession>,
): Promise<DisclosureOutcome> {
  // Les trois lectures partent ensemble — la Visite, ses scènes et sa session —
  // là où trois allers-retours se succédaient.
  const [tourRead, scenesRead, session] = await Promise.all([
    appsync.getGuideTourResult(tourId),
    sessionId
      ? appsync.listStudioScenesBySession(sessionId)
      : Promise.resolve({ ok: true as const, data: [] as unknown[] }),
    sessionRead,
  ]);

  if (!tourRead.ok) {
    logger.error('ModerationAPI', 'deriveSourceDisclosure: GuideTour read failed', { tourId, error: tourRead.error });
    return { ok: false, error: ERR_UNVERIFIABLE };
  }
  if (!tourRead.data) return { ok: false, error: ERR_TOUR_NOT_FOUND };
  if (!scenesRead.ok) {
    logger.error('ModerationAPI', 'deriveSourceDisclosure: scenes read failed', { tourId, sessionId });
    return { ok: false, error: ERR_UNVERIFIABLE };
  }

  const tour = tourRead.data as unknown as Record<string, unknown>;
  const sourceLang = sourceLanguageOf(session);
  const scenes = scenesRead.data as unknown as AudioSourceScene[];
  const languageAudioTypes: LanguageAudioTypes = mergeLanguageAudioType(
    tour.languageAudioTypes,
    sourceLang,
    deriveSourceAudioType(scenes),
  );

  // `availableLanguages` n'est joint QUE si la valeur lue est exploitable : la
  // réécrire depuis un `null` (champ non projeté, lecture partielle) écraserait
  // les langues déjà approuvées avec la seule langue source.
  const existingLangs = tour.availableLanguages;
  const updates: Record<string, unknown> = { status: 'published', languageAudioTypes };
  if (Array.isArray(existingLangs)) {
    updates.availableLanguages = Array.from(new Set([sourceLang, ...(existingLangs as string[])]));
  }

  // CAP-2 — les métadonnées traduites voyagent dans la MÊME mutation que la
  // publication, comme la mention de source. Elles vivent sur la `StudioSession`,
  // que le Studio édite ; `GuideTour` est ce que lit le catalogue, et rien ne les
  // y portait : une Visite publiée par le Studio n'emportait ni titre ni
  // description traduits. La session est déjà lue ci-dessus — aucun aller-retour
  // supplémentaire. Le même bloc vit dans `adminSetTourStatus` : DEUX chemins
  // mènent à `published`, et la règle doit tenir sur les deux.
  //
  // La fusion est ce qui rend l'opération sûre : une publication qui n'apporte
  // qu'une langue ne peut pas effacer les autres. `undefined` fait omettre la
  // clé plutôt qu'écrire une carte vide sur une Visite qui n'en a pas.
  const titles = translatedMetadataUpdate(tour.translatedTitles, session?.translatedTitles);
  if (titles) updates.translatedTitles = titles;
  const descriptions = translatedMetadataUpdate(
    tour.translatedDescriptions,
    session?.translatedDescriptions,
  );
  if (descriptions) updates.translatedDescriptions = descriptions;

  return { ok: true, sourceLang, updates };
}

export async function approveTour(
  moderationId: string,
  checklist: Record<string, { checked: boolean; note: string }>,
  notes: string,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseStubs()) {
    if (!MOCK_DETAIL[moderationId]) return { ok: false, error: 'Item non trouve' };
    return { ok: true };
  }
  const item = await resolveModerationItem(moderationId);
  if (!item) return { ok: false, error: 'Item de moderation introuvable' };

  // item.sessionId is already available — no extra round-trip needed.
  const sessionId = item.sessionId || undefined;

  // La session est lue UNE fois pour toute l'approbation : la dérivation de la
  // mention, la synchronisation de version et les infos visiteur (BTU-8) se
  // partagent cet unique aller-retour, qui part en parallèle des autres lectures.
  const sessionRead = loadStudioSession(sessionId, 'approveTour');

  // CAP-8 — la mention de source audio est une CONDITION de la publication.
  // Elle est dérivée avant toute écriture et voyage dans la MÊME mutation que
  // `status: 'published'` : publication et mention atterrissent ensemble, ou
  // aucune des deux. (Auparavant la publication précédait une écriture séparée
  // dont le retour était ignoré — une panne laissait la Visite publiée nue.)
  const disclosure = await deriveSourceDisclosure(item.tourId, sessionId, sessionRead);
  if (!disclosure.ok) return { ok: false, error: disclosure.error };

  const session = await sessionRead;

  const violation = disclosureWriteViolation(disclosure.updates, disclosure.sourceLang);
  if (violation) {
    logger.error('ModerationAPI', 'approveTour: refused publish without disclosure', { tourId: item.tourId, sourceLang: disclosure.sourceLang });
    return { ok: false, error: violation };
  }

  // La publication de la Visite passe EN PREMIER, seule. Les deux écritures
  // suivantes font sortir l'item de la file de modération : groupées avec
  // celle-ci, un refus serveur sur GuideTour laissait une Visite non publiée ET
  // un item déjà approuvé — donc sans recours, `adminSetTourStatus` renvoyant
  // ensuite vers une modération qui n'existe plus.
  // `updateGuideTourMutation` ne lève jamais : elle retourne { ok: false }.
  const tourResult = await appsync.updateGuideTourMutation(item.tourId, disclosure.updates);
  if (!tourResult.ok) {
    logger.error('ModerationAPI', 'approveTour: GuideTour publish refused', { tourId: item.tourId, error: tourResult.error });
    return {
      ok: false,
      error: `[${AUDIO_DISCLOSURE_ERR.PUBLISH_WRITE_REFUSED}] Publication refusée : ${tourResult.error}`,
    };
  }

  const [modResult, sessionResult] = await Promise.all([
    appsync.updateModerationItemMutation(item.id, {
      status: 'approved',
      reviewDate: Date.now(),
      checklistJson: JSON.stringify(checklist),
      feedbackJson: JSON.stringify({ notes }),
    }),
    sessionId
      ? appsync.updateStudioSessionMutation(sessionId, { status: 'published' })
      : Promise.resolve({ ok: true as const }),
  ]);
  if (!modResult.ok) return { ok: false, error: modResult.error };
  if (!sessionResult.ok) {
    logger.warn('ModerationAPI', 'approveTour: StudioSession publish sync failed (non-fatal)', { tourId: item.tourId, sessionId });
  }

  // pub-1: persist the published content version onto GuideTour (best-effort —
  // don't block approval if the version field isn't deployed on AppSync yet).
  if (session && session.version > 1) {
    const versionResult = await appsync.updateGuideTourMutation(item.tourId, { version: session.version });
    if (!versionResult.ok) {
      logger.warn('ModerationAPI', 'approveTour: GuideTour version sync failed (non-fatal)', { tourId: item.tourId, error: versionResult.error });
    }
  }

  // BTU-8: derive startAddress/endAddress/isLoop from the guide's traced route
  // at the moment of approval (final, moderated polyline) — avoids a
  // reverse-geocoding call on every mobile client. Best-effort/non-blocking,
  // same pattern as the two blocks above.
  try {
    const path = session?.routePath?.computedPath;
    if (path && path.length >= 2) {
      const start = path[0];
      const end = path[path.length - 1];
      const isLoop = haversineMeters(start, end) < LOOP_THRESHOLD_METERS;
      const [startAddress, endAddress] = await Promise.all([
        reverseGeocode(start.lat, start.lng),
        isLoop ? Promise.resolve(null) : reverseGeocode(end.lat, end.lng),
      ]);
      const infoResult = await appsync.updateGuideTourMutation(item.tourId, {
        isLoop,
        ...(startAddress ? { startAddress } : {}),
        ...(!isLoop && endAddress ? { endAddress } : {}),
      });
      if (!infoResult.ok) {
        logger.warn('ModerationAPI', 'approveTour: visitor info write failed (non-fatal)', { tourId: item.tourId, error: infoResult.error });
      }
    }
  } catch (e) {
    logger.warn('ModerationAPI', 'approveTour: visitor info derivation failed (non-fatal)', { tourId: item.tourId, error: String(e) });
  }

  // Auto-log to comment thread
  addTourComment(item.tourId, { message: notes || 'Tour approuvé', author: 'admin', authorName: 'Admin', action: 'approved' }).catch(() => {});
  return { ok: true };
}

export async function rejectTour(
  moderationId: string,
  category: RejectionCategory,
  feedback: string,
  poiIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseStubs()) {
    if (!MOCK_DETAIL[moderationId]) return { ok: false, error: 'Item non trouve' };
    if (feedback.length < 20) return { ok: false, error: 'Le feedback doit contenir au moins 20 caracteres' };
    return { ok: true };
  }
  if (feedback.length < 20) return { ok: false, error: 'Le feedback doit contenir au moins 20 caracteres' };

  const item = await resolveModerationItem(moderationId);
  if (!item) return { ok: false, error: 'Item de moderation introuvable' };

  const [modResult, tourResult] = await Promise.all([
    appsync.updateModerationItemMutation(item.id, {
      status: 'rejected',
      reviewDate: Date.now(),
      feedbackJson: JSON.stringify({ category, feedback, poiIds }),
    }),
    appsync.updateGuideTourMutation(item.tourId, { status: 'rejected' }),
  ]);
  if (!modResult.ok) return { ok: false, error: modResult.error };
  if (!tourResult.ok) return { ok: false, error: tourResult.error };
  addTourComment(item.tourId, { message: feedback, author: 'admin', authorName: 'Admin', action: 'rejected' }).catch(() => {});
  return { ok: true };
}

/**
 * Delete a tour and all related data (session, scenes, segments, purchases, moderation items).
 * Only allowed for archived tours. Admin group required.
 */
export async function adminDeleteTour(
  tourId: string,
): Promise<{ ok: boolean; error?: string; deletedCount?: number }> {
  if (shouldUseStubs()) return { ok: true, deletedCount: 0 };

  try {
    const tour = await appsync.getGuideTourById(tourId);
    if (!tour) return { ok: false, error: 'Tour introuvable' };
    if (tour.status !== 'archived') return { ok: false, error: 'Le tour doit être archivé avant suppression' };

    const sessionId = (tour as Record<string, unknown>).sessionId as string | null;
    let deletedCount = 0;

    // Delete related data if session exists
    if (sessionId) {
      // Delete scene segments
      const scenesResult = await appsync.listStudioScenesBySession(sessionId);
      if (scenesResult.ok) {
        for (const scene of scenesResult.data) {
          const sceneId = (scene as Record<string, unknown>).id as string;
          try {
            const { listSegmentsByScene } = await import('./studio');
            const segments = await listSegmentsByScene(sceneId);
            for (const seg of segments) {
              await appsync.deleteItem('SceneSegment', seg.id);
              deletedCount++;
            }
            // Delete scene
            await appsync.deleteItem('StudioScene', sceneId);
            deletedCount++;
          } catch { /* continue */ }
        }
      }

      // Delete language purchases
      const { listLanguagePurchases } = await import('./language-purchase');
      const purchasesResult = await listLanguagePurchases(sessionId);
      if (purchasesResult.ok) {
        for (const p of purchasesResult.value) {
          await appsync.deleteItem('TourLanguagePurchase', p.id);
          deletedCount++;
        }
      }

      // Delete session
      await appsync.deleteItem('StudioSession', sessionId);
      deletedCount++;
    }

    // Delete moderation items for this tour
    const allModItems = await appsync.listModerationItems();
    for (const item of allModItems) {
      if ((item as Record<string, unknown>).tourId === tourId) {
        await appsync.deleteItem('ModerationItem', item.id);
        deletedCount++;
      }
    }

    // Delete the tour itself
    await appsync.deleteItem('GuideTour', tourId);
    deletedCount++;

    logger.info('ModerationAPI', 'Tour deleted', { tourId, deletedCount });
    return { ok: true, deletedCount };
  } catch (e) {
    logger.error('ModerationAPI', 'adminDeleteTour failed', { tourId, error: String(e) });
    return { ok: false, error: String(e) };
  }
}

export async function adminSetTourStatus(
  tourId: string,
  status: 'published' | 'archived',
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseStubs()) return { ok: true };

  const updates: Record<string, unknown> = { status };

  // CAP-8 — le chemin admin (« Réactiver » sur /admin/tours) publiait en n'écrivant
  // que { status }. Il ne dérive rien : il exige que la mention soit DÉJÀ portée
  // pour la langue source, et la ré-embarque dans l'écriture (idempotent) afin que
  // publication et mention restent indissociables.
  if (status === 'published') {
    const tourRead = await appsync.getGuideTourResult(tourId);
    // « Lecture en échec » et « Visite inexistante » portent des codes distincts :
    // seul le premier justifie un nouvel essai.
    if (!tourRead.ok) {
      logger.error('ModerationAPI', 'adminSetTourStatus: GuideTour read failed', { tourId, error: tourRead.error });
      return { ok: false, error: ERR_UNVERIFIABLE };
    }
    if (!tourRead.data) return { ok: false, error: ERR_TOUR_NOT_FOUND };

    const tour = tourRead.data as unknown as Record<string, unknown>;
    const session = await loadStudioSession(
      (tour.sessionId as string | null) ?? undefined,
      'adminSetTourStatus',
    );
    const sourceLang = sourceLanguageOf(session);
    if (!coversLanguage(tour.languageAudioTypes, sourceLang)) {
      logger.error('ModerationAPI', 'adminSetTourStatus: refused publish without disclosure', { tourId, sourceLang });
      return {
        ok: false,
        error: `[${AUDIO_DISCLOSURE_ERR.PUBLISH_WITHOUT_DISCLOSURE}] Publication refusée : aucune mention de source audio pour la langue source « ${sourceLang} ». Approuvez le parcours via la modération pour la dériver.`,
      };
    }
    // La mention existante fait foi : la valeur BRUTE est réécrite telle quelle,
    // sans passer par `parseLanguageAudioTypes`, qui élaguerait toute entrée hors
    // domaine — une ligne héritée `{fr:'tts', en:'human'}` perdrait `en` sur une
    // simple réactivation.
    updates.languageAudioTypes = tour.languageAudioTypes;

    // CAP-2 — second chemin de publication, même règle. La session et la Visite
    // sont déjà lues ci-dessus : aucun aller-retour de plus. Sans ce bloc, une
    // Visite archivée puis réactivée repartait publiée sans les traductions que
    // sa session avait acquises entre-temps — l'invariant « les métadonnées
    // voyagent avec la publication » n'aurait tenu que sur l'un des deux sites.
    const titles = translatedMetadataUpdate(tour.translatedTitles, session?.translatedTitles);
    if (titles) updates.translatedTitles = titles;
    const descriptions = translatedMetadataUpdate(
      tour.translatedDescriptions,
      session?.translatedDescriptions,
    );
    if (descriptions) updates.translatedDescriptions = descriptions;
  }

  const result = await appsync.updateGuideTourMutation(tourId, updates);
  if (!result.ok) {
    // Le retour est vérifié : `updateGuideTourMutation` ne lève jamais.
    const prefix = status === 'published' ? `[${AUDIO_DISCLOSURE_ERR.PUBLISH_WRITE_REFUSED}] ` : '';
    return { ok: false, error: `${prefix}${result.error}` };
  }
  return { ok: true };
}

export async function getAllAdminTours(): Promise<Array<{ id: string; title: string; city: string; status: string; guideId: string; poiCount: number; duration: number; distance: number; sessionId: string | null; guideName: string }>> {
  if (shouldUseStubs()) {
    return [
      { id: 'grasse-ame-parfumeurs', title: "L'Ame des Parfumeurs", city: 'Grasse', status: 'published', guideId: 'guide-1', poiCount: 6, duration: 45, distance: 2.1, sessionId: null, guideName: 'Marie Dupont' },
      { id: 'grasse-vieille-ville', title: 'La Vieille Ville de Grasse', city: 'Grasse', status: 'draft', guideId: 'guide-1', poiCount: 5, duration: 35, distance: 1.5, sessionId: null, guideName: 'Marie Dupont' },
      { id: 'grasse-parfums-modernes', title: 'Les Parfums Modernes', city: 'Grasse', status: 'pending_moderation', guideId: 'guide-1', poiCount: 4, duration: 30, distance: 1.8, sessionId: null, guideName: 'Marie Dupont' },
      { id: 'nice-promenade-anglais', title: 'La Promenade des Anglais', city: 'Nice', status: 'published', guideId: 'guide-5', poiCount: 6, duration: 40, distance: 4.2, sessionId: null, guideName: 'Isabelle Moretti' },
      { id: 'cannes-croisette', title: 'La Croisette et le Vieux Cannes', city: 'Cannes', status: 'rejected', guideId: 'guide-6', poiCount: 7, duration: 50, distance: 3.1, sessionId: null, guideName: 'Thomas Bellini' },
    ];
  }
  const [tours, profiles] = await Promise.all([
    appsync.listAllGuideTours(),
    appsync.listAllGuideProfilesAdmin(),
  ]);
  const guideNames = new Map(profiles.map((p) => [p.id, p.displayName]));
  return tours.map((t) => {
    const raw = t as Record<string, unknown>;
    return {
      id: t.id, title: t.title, city: t.city,
      status: t.status ?? 'draft', guideId: t.guideId,
      poiCount: t.poiCount ?? 0,
      duration: t.duration ?? 0,
      distance: t.distance ?? 0,
      sessionId: (raw.sessionId as string) ?? null,
      guideName: guideNames.get(t.guideId) ?? '',
    };
  });
}

export async function getAllAdminGuides(): Promise<Array<{ id: string; displayName: string; city: string; profileStatus: string; tourCount: number; rating: number | null }>> {
  if (shouldUseStubs()) {
    return [
      { id: 'guide-1', displayName: 'Marie Dupont', city: 'Grasse', profileStatus: 'active', tourCount: 2, rating: 4.7 },
      { id: 'guide-5', displayName: 'Claire Moreau', city: 'Nice', profileStatus: 'active', tourCount: 1, rating: 4.2 },
      { id: 'guide-6', displayName: 'Thomas Leroy', city: 'Cannes', profileStatus: 'pending_moderation', tourCount: 0, rating: null },
    ];
  }
  const guides = await appsync.listAllGuideProfilesAdmin();
  return guides.map((g) => ({
    id: g.id,
    displayName: g.displayName,
    city: g.city,
    profileStatus: g.profileStatus ?? 'pending_moderation',
    tourCount: g.tourCount ?? 0,
    rating: g.rating ?? null,
  }));
}

export async function getQueueItemIds(): Promise<string[]> {
  const queue = await getModerationQueue();
  return queue.map((item) => item.id);
}

/** Admin: send tour back to guide for revisions (review → revision_requested). */
export async function sendBackForRevision(
  moderationId: string,
  feedback: string,
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseStubs()) {
    if (!MOCK_DETAIL[moderationId]) return { ok: false, error: 'Item non trouve' };
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true };
  }
  const item = await resolveModerationItem(moderationId);
  if (!item) return { ok: false, error: 'Item de moderation introuvable' };

  const [modResult, tourResult] = await Promise.all([
    appsync.updateModerationItemMutation(item.id, {
      status: 'rejected', // moderation item marked as actioned
      reviewDate: Date.now(),
      feedbackJson: JSON.stringify({ feedback, action: 'revision' }),
    }),
    appsync.updateGuideTourMutation(item.tourId, { status: 'revision_requested' }),
  ]);
  if (!modResult.ok) return { ok: false, error: modResult.error };
  if (!tourResult.ok) return { ok: false, error: tourResult.error };

  // Also update StudioSession status so guide sees revision_requested
  const tour = await appsync.getGuideTourById(item.tourId);
  if (tour) {
    const sessionId = (tour as Record<string, unknown>).sessionId as string | undefined;
    if (sessionId) {
      await appsync.updateStudioSessionMutation(sessionId, { status: 'revision_requested' });
      // Propagate feedback to all scenes so guide sees the feedback in Studio
      const scenesResult = await appsync.listStudioScenesBySession(sessionId);
      if (scenesResult.ok) {
        for (const scene of scenesResult.data) {
          const sceneId = (scene as Record<string, unknown>).id as string;
          const existing = (scene as Record<string, unknown>).moderationFeedback as string | null;
          if (!existing) {
            await appsync.updateStudioSceneMutation(sceneId, {
              moderationFeedback: feedback,
            });
          }
        }
      }
    }
  }

  addTourComment(item.tourId, { message: feedback, author: 'admin', authorName: 'Admin', action: 'revision' }).catch(() => {});
  return { ok: true };
}

/** Admin: validate/publish tour (review → published). */
export async function validateTour(
  moderationId: string,
  checklist: Record<string, { checked: boolean; note: string }>,
  notes: string,
): Promise<{ ok: boolean; error?: string }> {
  // Delegates to existing approveTour — same logic
  return approveTour(moderationId, checklist, notes);
}

/** Admin: add a comment on a tour under review. Also persists to StudioScene if sceneId provided. */
export async function addReviewComment(
  tourId: string,
  comment: { sceneId?: string; comment: string; reviewerId: string; reviewerName: string },
): Promise<{ ok: boolean; error?: string }> {
  // Save to GuideTour.adminComments (legacy)
  const result = await addAdminCommentToTour(tourId, {
    ...comment,
    date: new Date().toISOString(),
  });
  // Also persist to StudioScene.moderationFeedback so the guide sees it
  if (result.ok && comment.sceneId && !shouldUseStubs()) {
    try {
      await appsync.updateStudioSceneMutation(comment.sceneId, {
        moderationFeedback: `${comment.reviewerName}: ${comment.comment}`,
      });
    } catch {
      // Non-blocking — guide will still see GuideTour comments
    }
  }
  return result;
}

/** Admin: create a ModerationItem for a tour already in pending_moderation (manual sync). */
export async function adminSyncTourToQueue(tourId: string): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseStubs()) return { ok: true };
  const tour = await appsync.getGuideTourById(tourId);
  if (!tour) return { ok: false, error: 'Parcours introuvable' };
  if (tour.status !== 'pending_moderation') return { ok: false, error: 'Le parcours n\'est pas en attente de modération' };
  const profile = await appsync.getGuideProfileById(tour.guideId, 'userPool');
  const result = await appsync.createModerationItemMutation({
    tourId,
    guideId: tour.guideId,
    guideName: profile?.displayName ?? 'Guide',
    tourTitle: tour.title,
    city: tour.city,
    submissionDate: Date.now(),
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
