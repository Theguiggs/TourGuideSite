import type { StudioSession, StudioSessionStatus, StudioScene, SceneStatus } from '@/types/studio';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { __addStubTour } from './guide';

const SERVICE_NAME = 'StudioAPI';

/**
 * Studio data access layer (authenticated guide).
 * Stub mode: returns mock data (in-memory). Real mode: Amplify AppSync.
 */

// --- Mock Data ---

const MOCK_SESSIONS: StudioSession[] = [
  {
    id: 'session-grasse-parfums',
    guideId: 'guide-1',
    sourceSessionId: 'mobile-session-001',
    tourId: 'grasse-parfums-modernes',
    title: 'Grasse — Les Parfumeurs',
    status: 'draft',
    language: 'fr',
    transcriptionQuotaUsed: null,
    consentRGPD: true,
    createdAt: '2026-03-10T14:30:00.000Z',
    updatedAt: '2026-03-10T14:30:00.000Z',
  },
  {
    id: 'session-grasse-vieille-ville',
    guideId: 'guide-1',
    sourceSessionId: 'mobile-session-002',
    tourId: 'grasse-vieille-ville',
    title: 'Grasse — Vieille Ville',
    status: 'editing',
    language: 'fr',
    transcriptionQuotaUsed: 12.5,
    consentRGPD: true,
    createdAt: '2026-03-08T09:15:00.000Z',
    updatedAt: '2026-03-12T16:45:00.000Z',
  },
  {
    id: 'session-nice-promenade',
    guideId: 'guide-1',
    sourceSessionId: 'mobile-session-003',
    tourId: 'tour-nice-001',
    title: 'Nice — Promenade des Anglais',
    status: 'published',
    language: 'fr',
    transcriptionQuotaUsed: 22.0,
    consentRGPD: true,
    createdAt: '2026-02-20T11:00:00.000Z',
    updatedAt: '2026-03-05T10:00:00.000Z',
  },
];

// --- Mock Scenes ---

const MOCK_SCENES: Record<string, StudioScene[]> = {
  'session-grasse-parfums': [
    { id: 'scene-1', sessionId: 'session-grasse-parfums', sceneIndex: 0, title: 'Place aux Aires', originalAudioKey: 'guide-studio/guide-1/session-grasse-parfums/original/scene_0.aac', studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'has_original', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: ['/images/mock/grasse-place-aires-1.jpg', '/images/mock/grasse-place-aires-2.jpg'], latitude: 43.6591, longitude: 6.9243, poiDescription: 'Point de départ, ancien marché aux herbes', archived: false, createdAt: '2026-03-10T14:30:00.000Z', updatedAt: '2026-03-10T14:30:00.000Z' },
    { id: 'scene-2', sessionId: 'session-grasse-parfums', sceneIndex: 1, title: 'Parfumerie Fragonard', originalAudioKey: 'guide-studio/guide-1/session-grasse-parfums/original/scene_1.aac', studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'has_original', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: ['/images/mock/fragonard-1.jpg'], latitude: 43.6587, longitude: 6.9221, poiDescription: 'Maison de parfum historique fondée en 1926', archived: false, createdAt: '2026-03-10T14:31:00.000Z', updatedAt: '2026-03-10T14:31:00.000Z' },
    { id: 'scene-3', sessionId: 'session-grasse-parfums', sceneIndex: 2, title: 'Musée de la Parfumerie', originalAudioKey: 'guide-studio/guide-1/session-grasse-parfums/original/scene_2.aac', studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'has_original', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: ['/images/mock/musee-mip-1.jpg', '/images/mock/musee-mip-2.jpg', '/images/mock/musee-mip-3.jpg'], latitude: 43.6583, longitude: 6.9215, poiDescription: "L'histoire du parfum à travers les siècles", archived: false, createdAt: '2026-03-10T14:32:00.000Z', updatedAt: '2026-03-10T14:32:00.000Z' },
    { id: 'scene-4', sessionId: 'session-grasse-parfums', sceneIndex: 3, title: null, originalAudioKey: 'guide-studio/guide-1/session-grasse-parfums/original/scene_3.aac', studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'has_original', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '2026-03-10T14:33:00.000Z', updatedAt: '2026-03-10T14:33:00.000Z' },
    { id: 'scene-5', sessionId: 'session-grasse-parfums', sceneIndex: 4, title: 'Jardin du MIP', originalAudioKey: 'guide-studio/guide-1/session-grasse-parfums/original/scene_4.aac', studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'has_original', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '2026-03-10T14:34:00.000Z', updatedAt: '2026-03-10T14:34:00.000Z' },
    { id: 'scene-6', sessionId: 'session-grasse-parfums', sceneIndex: 5, title: 'Panorama final', originalAudioKey: 'guide-studio/guide-1/session-grasse-parfums/original/scene_5.aac', studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'has_original', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '2026-03-10T14:35:00.000Z', updatedAt: '2026-03-10T14:35:00.000Z' },
  ],
  'session-grasse-vieille-ville': [
    { id: 'scene-vv-1', sessionId: 'session-grasse-vieille-ville', sceneIndex: 0, title: 'Cathédrale Notre-Dame', originalAudioKey: 'guide-studio/guide-1/session-grasse-vieille-ville/original/scene_0.aac', studioAudioKey: null, transcriptText: 'Bienvenue devant la cathédrale...', transcriptionJobId: 'job-001', transcriptionStatus: 'completed', qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'transcribed', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: ['/images/mock/cathedrale-1.jpg'], latitude: 43.6593, longitude: 6.9218, poiDescription: 'Cathédrale du XIIe siècle', archived: false, createdAt: '2026-03-08T09:15:00.000Z', updatedAt: '2026-03-12T10:00:00.000Z' },
    { id: 'scene-vv-2', sessionId: 'session-grasse-vieille-ville', sceneIndex: 1, title: 'Place du 24 Août', originalAudioKey: 'guide-studio/guide-1/session-grasse-vieille-ville/original/scene_1.aac', studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: 'processing', qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'has_original', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '2026-03-08T09:16:00.000Z', updatedAt: '2026-03-12T10:01:00.000Z' },
    { id: 'scene-vv-3', sessionId: 'session-grasse-vieille-ville', sceneIndex: 2, title: 'Fontaine de la Place', originalAudioKey: 'guide-studio/guide-1/session-grasse-vieille-ville/original/scene_2.aac', studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'has_original', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '2026-03-08T09:17:00.000Z', updatedAt: '2026-03-08T09:17:00.000Z' },
    { id: 'scene-vv-4', sessionId: 'session-grasse-vieille-ville', sceneIndex: 3, title: 'Vue panoramique', originalAudioKey: null, studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'empty', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '2026-03-08T09:18:00.000Z', updatedAt: '2026-03-08T09:18:00.000Z' },
  ],
};

// --- Stub in-memory stores (no localStorage) ---

const createdStudioSessions: StudioSession[] = [];
const createdStubScenes: StudioScene[] = [];

function getAllStubSessions(): StudioSession[] {
  return [...MOCK_SESSIONS, ...createdStudioSessions];
}

function getStubSessions(guideId: string): StudioSession[] {
  return getAllStubSessions().filter((s) => s.guideId === guideId);
}

function findStubScene(sceneId: string): StudioScene | undefined {
  for (const scenes of Object.values(MOCK_SCENES)) {
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene) return scene;
  }
  return createdStubScenes.find((s) => s.id === sceneId);
}

// --- AppSync mapper helpers ---

function mapAppSyncSession(raw: Record<string, unknown>): StudioSession {
  return {
    id: raw.id as string,
    guideId: raw.guideId as string,
    sourceSessionId: (raw.sourceSessionId as string) ?? '',
    tourId: (raw.tourId as string) ?? null,
    title: (raw.title as string) ?? null,
    status: (raw.status as StudioSessionStatus) ?? 'draft',
    language: (raw.language as string) ?? 'fr',
    transcriptionQuotaUsed: (raw.transcriptionQuotaUsed as number) ?? null,
    consentRGPD: (raw.consentRGPD as boolean) ?? true,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
  };
}

function mapAppSyncScene(raw: Record<string, unknown>): StudioScene {
  return {
    id: raw.id as string,
    sessionId: raw.sessionId as string,
    sceneIndex: (raw.sceneIndex as number) ?? 0,
    title: (raw.title as string) ?? null,
    originalAudioKey: (raw.originalAudioKey as string) ?? null,
    studioAudioKey: (raw.studioAudioKey as string) ?? null,
    transcriptText: (raw.transcriptText as string) ?? null,
    transcriptionJobId: (raw.transcriptionJobId as string) ?? null,
    transcriptionStatus: (raw.transcriptionStatus as StudioScene['transcriptionStatus']) ?? null,
    qualityScore: (raw.qualityScore as StudioScene['qualityScore']) ?? null,
    qualityDetailsJson: (raw.qualityDetailsJson as string) ?? null,
    codecStatus: (raw.codecStatus as StudioScene['codecStatus']) ?? null,
    status: (raw.status as SceneStatus) ?? 'empty',
    takesCount: (raw.takesCount as number) ?? null,
    selectedTakeIndex: (raw.selectedTakeIndex as number) ?? null,
    moderationFeedback: (raw.moderationFeedback as string) ?? null,
    photosRefs: (raw.photosRefs as string[]) ?? [],
    latitude: (raw.latitude as number) ?? null,
    longitude: (raw.longitude as number) ?? null,
    poiDescription: (raw.poiDescription as string) ?? null,
    archived: (raw.archived as boolean) ?? false,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (raw.updatedAt as string) ?? new Date().toISOString(),
  };
}

// --- Status helpers ---

const STATUS_CONFIG: Record<StudioSessionStatus, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  transcribing: { label: 'Transcription...', color: 'bg-blue-100 text-blue-700' },
  editing: { label: 'En édition', color: 'bg-yellow-100 text-yellow-700' },
  recording: { label: 'Enregistrement', color: 'bg-orange-100 text-orange-700' },
  ready: { label: 'Prêt', color: 'bg-green-100 text-green-700' },
  submitted: { label: 'Soumis', color: 'bg-indigo-100 text-indigo-700' },
  published: { label: 'Publié', color: 'bg-green-200 text-green-800' },
  revision_requested: { label: 'Révision demandée', color: 'bg-red-100 text-red-700' },
  rejected: { label: 'Rejeté', color: 'bg-red-200 text-red-800' },
};

export function getSessionStatusConfig(status: StudioSessionStatus) {
  return STATUS_CONFIG[status];
}

const SCENE_STATUS_CONFIG: Record<SceneStatus, { label: string; color: string }> = {
  empty: { label: 'Vide', color: 'bg-gray-100 text-gray-500' },
  has_original: { label: 'Audio terrain', color: 'bg-blue-100 text-blue-700' },
  transcribed: { label: 'Transcrit', color: 'bg-purple-100 text-purple-700' },
  edited: { label: 'Édité', color: 'bg-yellow-100 text-yellow-700' },
  recorded: { label: 'Enregistré', color: 'bg-orange-100 text-orange-700' },
  finalized: { label: 'Finalisé', color: 'bg-green-100 text-green-700' },
};

export function getSceneStatusConfig(status: SceneStatus) {
  return SCENE_STATUS_CONFIG[status];
}

// --- Public API: Sessions ---

export async function listStudioSessions(guideId: string): Promise<StudioSession[]> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'Listing sessions (stub)', { guideId });
    return getStubSessions(guideId);
  }
  // Real mode: query AppSync
  try {
    const { listStudioSessionsByGuide } = await import('./appsync-client');
    const result = await listStudioSessionsByGuide(guideId);
    if (!result.ok) {
      logger.error(SERVICE_NAME, 'listStudioSessions failed', { error: result.error });
      return [];
    }
    return result.data.map((s) => mapAppSyncSession(s as unknown as Record<string, unknown>));
  } catch (e) {
    logger.error(SERVICE_NAME, 'listStudioSessions exception', { error: String(e) });
    return [];
  }
}

export async function getStudioSession(sessionId: string): Promise<StudioSession | null> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'Getting session (stub)', { sessionId });
    return getAllStubSessions().find((s) => s.id === sessionId) ?? null;
  }
  // Real mode: query AppSync
  try {
    const { getStudioSessionById } = await import('./appsync-client');
    const result = await getStudioSessionById(sessionId);
    if (!result.ok || !result.data) {
      logger.warn(SERVICE_NAME, 'Session not found', { sessionId });
      return null;
    }
    return mapAppSyncSession(result.data as unknown as Record<string, unknown>);
  } catch (e) {
    logger.error(SERVICE_NAME, 'getStudioSession exception', { error: String(e) });
    return null;
  }
}

export async function createStudioSession(
  sourceSessionId: string,
  guideId: string,
): Promise<{ ok: true; session: StudioSession } | { ok: false; error: string; existingSessionId?: string }> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'Creating studio session (stub)', { sourceSessionId, guideId });
    const existing = getAllStubSessions().find(
      (s) => s.sourceSessionId === sourceSessionId && s.guideId === guideId,
    );
    if (existing) {
      logger.warn(SERVICE_NAME, 'Duplicate session prevented', { sourceSessionId, existingId: existing.id });
      return { ok: false, error: 'Une session studio existe déjà pour cette session terrain.', existingSessionId: existing.id };
    }
    const source = MOCK_SESSIONS.find((s) => s.sourceSessionId === sourceSessionId);
    const newSession: StudioSession = {
      id: `studio-${Date.now()}`,
      guideId,
      sourceSessionId,
      tourId: null,
      title: source?.title ?? 'Nouvelle session studio',
      status: 'draft',
      language: source?.language ?? 'fr',
      transcriptionQuotaUsed: null,
      consentRGPD: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    createdStudioSessions.push(newSession);
    return { ok: true, session: newSession };
  }

  // Real mode: anti-duplication then create in AppSync
  try {
    const appsync = await import('./appsync-client');
    // Note: TOCTOU race possible — backend unique constraint recommended for production
    // Check for existing session with same sourceSessionId
    const existing = await appsync.listStudioSessionsByGuide(guideId);
    if (existing.ok) {
      const dupe = existing.data.find((s) => (s as Record<string, unknown>).sourceSessionId === sourceSessionId);
      if (dupe) {
        return { ok: false, error: 'Une session studio existe déjà pour cette session terrain.', existingSessionId: (dupe as Record<string, unknown>).id as string };
      }
    }
    const result = await appsync.createStudioSessionMutation({ guideId, sourceSessionId, status: 'draft' });
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, session: mapAppSyncSession(result.data as unknown as Record<string, unknown>) };
  } catch (e) {
    logger.error(SERVICE_NAME, 'createStudioSession real failed', { error: String(e) });
    return { ok: false, error: 'Erreur lors de la création de la session.' };
  }
}

export async function createTourWithSession(
  guideId: string,
  title: string,
  city: string,
): Promise<{ ok: true; tourId: string; sessionId: string } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 500));
    const now = Date.now();
    const suffix = `${now}-${Math.random().toString(36).slice(2, 7)}`;
    const tourId = `tour-${suffix}`;
    const sessionId = `studio-${suffix}`;
    const newSession: StudioSession = {
      id: sessionId,
      guideId,
      sourceSessionId: `web-${now}`,
      tourId,
      title,
      status: 'draft',
      language: 'fr',
      transcriptionQuotaUsed: null,
      consentRGPD: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    createdStudioSessions.push(newSession);
    __addStubTour({
      id: tourId,
      title,
      city,
      status: 'draft',
      listens: 0,
      completionRate: 0,
      rating: 0,
      lastListenDate: null,
      rejectionFeedback: null,
      sessionId,
    });
    logger.info(SERVICE_NAME, 'Created tour + session (stub)', { tourId, sessionId, title, city });
    return { ok: true, tourId, sessionId };
  }

  // Real mode: create tour via AppSync, then session, then link
  try {
    const appsync = await import('./appsync-client');
    const tourResult = await appsync.createGuideTourMutation({ guideId, title, city });
    if (!tourResult.ok) {
      return { ok: false, error: tourResult.error };
    }
    const tourId = tourResult.data.id;

    const sessionResult = await appsync.createStudioSessionMutation({
      guideId,
      sourceSessionId: `web-${Date.now()}`,
      tourId,
      title,
      status: 'draft',
    });
    if (!sessionResult.ok) {
      // Tour created but session failed — rollback: soft-archive the orphan tour
      logger.error(SERVICE_NAME, 'Session creation failed after tour created, rolling back tour', { tourId, error: sessionResult.error });
      try {
        await appsync.updateGuideTourMutation(tourId, { status: 'archived' });
        logger.info(SERVICE_NAME, 'Orphan tour archived after session failure', { tourId });
      } catch (rollbackErr) {
        logger.error(SERVICE_NAME, 'Failed to archive orphan tour', { tourId, error: String(rollbackErr) });
      }
      return { ok: false, error: `Tour créé (${tourId}) mais session échouée : ${sessionResult.error}` };
    }
    const sessionId = (sessionResult.data as Record<string, unknown>).id as string;

    // Link bidirectional: tour.sessionId
    const linkResult = await appsync.updateGuideTourMutation(tourId, { sessionId });
    if (!linkResult.ok) {
      logger.error(SERVICE_NAME, 'Failed to link tour to session', { tourId, sessionId, error: linkResult.error });
      return { ok: false, error: `Tour et session créés mais lien échoué : ${linkResult.error}` };
    }

    logger.info(SERVICE_NAME, 'Created tour + session (AppSync)', { tourId, sessionId, title, city });
    return { ok: true, tourId, sessionId };
  } catch (e) {
    logger.error(SERVICE_NAME, 'createTourWithSession real failed', { error: String(e) });
    return { ok: false, error: 'Erreur lors de la création du parcours.' };
  }
}

// --- Public API: Scenes ---

export async function listStudioScenes(sessionId: string): Promise<StudioScene[]> {
  if (shouldUseStubs()) {
    const mockScenes = MOCK_SCENES[sessionId] ?? [];
    const created = createdStubScenes.filter((s) => s.sessionId === sessionId);
    logger.info(SERVICE_NAME, 'Listing scenes (stub)', { sessionId });
    return [...mockScenes, ...created];
  }
  // Real mode: query AppSync
  try {
    const { listStudioScenesBySession } = await import('./appsync-client');
    const result = await listStudioScenesBySession(sessionId);
    if (!result.ok) {
      logger.error(SERVICE_NAME, 'listStudioScenes failed', { error: result.error });
      return [];
    }
    return result.data.map((s) => mapAppSyncScene(s as unknown as Record<string, unknown>));
  } catch (e) {
    logger.error(SERVICE_NAME, 'listStudioScenes exception', { error: String(e) });
    return [];
  }
}

export async function createScene(
  sessionId: string,
  title: string,
): Promise<{ ok: true; scene: StudioScene } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    const allScenes = [...(MOCK_SCENES[sessionId] ?? []), ...createdStubScenes.filter((s) => s.sessionId === sessionId)];
    const sceneIndex = allScenes.length;
    const now = new Date().toISOString();
    const scene: StudioScene = {
      id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      sceneIndex,
      title,
      originalAudioKey: null,
      studioAudioKey: null,
      transcriptText: null,
      transcriptionJobId: null,
      transcriptionStatus: null,
      qualityScore: null,
      qualityDetailsJson: null,
      codecStatus: null,
      status: 'empty',
      takesCount: null,
      selectedTakeIndex: null,
      moderationFeedback: null,
      photosRefs: [],
      latitude: null,
      longitude: null,
      poiDescription: null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    createdStubScenes.push(scene);
    logger.info(SERVICE_NAME, 'Scene created (stub)', { sessionId, sceneId: scene.id, title });
    return { ok: true, scene };
  }

  // Real mode: compute sceneIndex from existing scenes, then create in AppSync
  try {
    const appsync = await import('./appsync-client');
    const existing = await appsync.listStudioScenesBySession(sessionId);
    const sceneIndex = existing.ok ? existing.data.length : 0;
    const result = await appsync.createStudioSceneMutation({ sessionId, sceneIndex, title, status: 'empty' });
    if (!result.ok) return { ok: false, error: result.error };
    const scene = mapAppSyncScene(result.data as unknown as Record<string, unknown>);
    logger.info(SERVICE_NAME, 'Scene created (AppSync)', { sessionId, sceneId: scene.id, title });
    return { ok: true, scene };
  } catch (e) {
    logger.error(SERVICE_NAME, 'createScene real failed', { error: String(e) });
    return { ok: false, error: 'Erreur lors de la création de la scène.' };
  }
}

export async function updateSceneText(
  sceneId: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    const scene = findStubScene(sceneId);
    if (scene) {
      scene.transcriptText = text;
      scene.status = text ? 'edited' : scene.status;
      scene.updatedAt = new Date().toISOString();
    }
    logger.info(SERVICE_NAME, 'Scene text updated (stub)', { sceneId, length: text.length });
    return { ok: true };
  }
  // Real mode: AppSync mutation — only send text, let caller manage status transitions
  try {
    const { updateStudioSceneMutation } = await import('./appsync-client');
    const updates: Record<string, unknown> = { transcriptText: text };
    const result = await updateStudioSceneMutation(sceneId, updates);
    if (!result.ok) return { ok: false, error: result.error };
    logger.info(SERVICE_NAME, 'Scene text updated (AppSync)', { sceneId, length: text.length });
    return { ok: true };
  } catch (e) {
    logger.error(SERVICE_NAME, 'updateSceneText real failed', { error: String(e) });
    return { ok: false, error: 'Erreur lors de la mise à jour du texte.' };
  }
}

export async function updateSceneAudio(
  sceneId: string,
  audioUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    const scene = findStubScene(sceneId);
    if (scene) {
      scene.studioAudioKey = audioUrl;
      scene.status = 'recorded';
      scene.updatedAt = new Date().toISOString();
    }
    logger.info(SERVICE_NAME, 'Scene audio updated (stub)', { sceneId });
    return { ok: true };
  }
  // Real mode: AppSync mutation
  try {
    const { updateStudioSceneMutation } = await import('./appsync-client');
    const result = await updateStudioSceneMutation(sceneId, { studioAudioKey: audioUrl, status: 'recorded' });
    if (!result.ok) return { ok: false, error: result.error };
    logger.info(SERVICE_NAME, 'Scene audio updated (AppSync)', { sceneId });
    return { ok: true };
  } catch (e) {
    logger.error(SERVICE_NAME, 'updateSceneAudio real failed', { error: String(e) });
    return { ok: false, error: "Erreur lors de la mise à jour de l'audio." };
  }
}

// --- Helpers for session list (scene count) ---

/** Get scene count for a session (stub helper — used by session list). */
export function getStubScenesCount(sessionId: string): number {
  const mockScenes = MOCK_SCENES[sessionId] ?? [];
  const created = createdStubScenes.filter((s) => s.sessionId === sessionId);
  return mockScenes.length + created.length;
}

// --- Test-only exports ---

/** Test-only: reset in-memory stub store */
export function __resetStubStore(): void {
  createdStudioSessions.length = 0;
  createdStubScenes.length = 0;
}

/** Update a stub session's status in-memory. Used by studio-submission stubs. */
export function __updateStubSessionStatus(sessionId: string, status: StudioSessionStatus): void {
  const session = getAllStubSessions().find((s) => s.id === sessionId);
  if (session) {
    session.status = status;
    session.updatedAt = new Date().toISOString();
  }
}
