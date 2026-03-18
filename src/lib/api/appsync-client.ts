/**
 * AppSync GraphQL client for the web portal.
 *
 * Server-side: uses runWithAmplifyServerContext for SSR/SSG pages.
 * Client-side: uses generateClient() with auth tokens.
 *
 * All functions return typed data or null on error (graceful degradation).
 */

import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import type { Schema } from '@amplify-schema';
import { configureAmplify } from '@/lib/amplify/config';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AppSyncClient';

// Browser singleton — reused across navigations on the client
let _browserClient: ReturnType<typeof generateClient<Schema>> | null = null;

export function getClient() {
  const isServer = typeof window === 'undefined';
  if (!isServer && _browserClient) return _browserClient;

  // Auto-configure if not yet done (covers server-side calls before AmplifyProvider runs)
  const config = Amplify.getConfig();
  if (!config?.API?.GraphQL?.endpoint) {
    configureAmplify();
  }

  const client = generateClient<Schema>();
  if (!isServer) _browserClient = client;
  return client;
}

// --- Public Queries (Tours, Cities, Guides) ---

export async function listGuideTours(filters?: { city?: string; status?: string }) {
  try {
    const client = getClient();
    const result = await client.models.GuideTour.list({
      filter: {
        ...(filters?.city ? { city: { eq: filters.city } } : {}),
        ...(filters?.status ? { status: { eq: filters.status as 'published' } } : {}),
      },
    });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listGuideTours failed', { error: String(error) });
    return [];
  }
}

/** Admin-only: list all tours regardless of status, using userPool auth. */
export async function listAllGuideTours() {
  try {
    const client = getClient();
    const result = await client.models.GuideTour.list({ authMode: 'userPool' });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listAllGuideTours failed', { error: String(error) });
    return [];
  }
}

export async function getGuideTourById(id: string) {
  try {
    const client = getClient();
    const result = await client.models.GuideTour.get({ id }, { authMode: 'userPool' });
    return result.data ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getGuideTourById failed', { error: String(error) });
    return null;
  }
}

export async function listGuideProfiles(filters?: { city?: string }) {
  try {
    const client = getClient();
    const result = await client.models.GuideProfile.list({
      filter: {
        ...(filters?.city ? { city: { eq: filters.city } } : {}),
        profileStatus: { eq: 'active' },
      },
    });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listGuideProfiles failed', { error: String(error) });
    return [];
  }
}

/** Admin-only: list all guide profiles regardless of profileStatus. */
export async function listAllGuideProfilesAdmin() {
  try {
    const client = getClient();
    const result = await client.models.GuideProfile.list({ authMode: 'userPool' });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listAllGuideProfilesAdmin failed', { error: String(error) });
    return [];
  }
}

export async function getGuideProfileById(id: string, authMode?: 'userPool' | 'iam') {
  try {
    const client = getClient();
    // get() takes input as 1st arg, options (incl. authMode) as 2nd arg
    const result = await client.models.GuideProfile.get(
      { id },
      authMode ? { authMode } : {},
    );
    return result.data ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getGuideProfileById failed', { error: String(error) });
    return null;
  }
}

export async function getGuideProfileByUserId(userId: string, authMode?: 'userPool' | 'iam') {
  try {
    const client = getClient();
    // authMode must be in the SAME options object as filter for list() in Amplify Gen2
    const result = await client.models.GuideProfile.list({
      filter: { userId: { eq: userId } },
      ...(authMode ? { authMode } : {}),
    });
    logger.info(SERVICE_NAME, 'getGuideProfileByUserId result', { userId, authMode, hasData: !!result.data, hasErrors: !!result.errors });
    return result.data?.[0] ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getGuideProfileByUserId failed', { error: String(error) });
    return null;
  }
}

export async function listTourReviews(tourId: string) {
  try {
    const client = getClient();
    const result = await client.models.TourReview.list({
      filter: {
        tourId: { eq: tourId },
        status: { eq: 'visible' },
      },
    });
    return (result.data ?? []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error) {
    logger.error(SERVICE_NAME, 'listTourReviews failed', { error: String(error) });
    return [];
  }
}

export async function getTourStats(tourId: string) {
  try {
    const client = getClient();
    const result = await client.models.TourStats.list({
      filter: { tourId: { eq: tourId } },
    });
    return result.data?.[0] ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getTourStats failed', { error: String(error) });
    return null;
  }
}

// --- Moderation Item Creation ---

export async function createModerationItemMutation(data: {
  tourId: string;
  guideId: string;
  guideName: string;
  tourTitle: string;
  city: string;
  submissionDate: number;
}) {
  try {
    const client = getClient();
    const result = await client.models.ModerationItem.create(
      { ...data, status: 'pending' },
      { authMode: 'userPool' },
    );
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      return { ok: false as const, error: errMsg };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createModerationItem failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la création de la modération' };
  }
}

// --- Guide Mutations ---

export async function createGuideProfileMutation(data: {
  userId: string;
  displayName: string;
  city: string;
  bio?: string;
  specialties?: string[];
  languages?: string[];
}) {
  try {
    const client = getClient();
    // owner-based auth requires userPool auth mode (not the default IAM)
    const result = await client.models.GuideProfile.create(
      {
        ...data,
        profileStatus: 'pending_moderation',
        rating: 0,
        tourCount: 0,
        verified: false,
      },
      { authMode: 'userPool' },
    );
    logger.info(SERVICE_NAME, 'createGuideProfile result', { hasData: !!result.data, hasErrors: !!result.errors });
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      logger.error(SERVICE_NAME, 'createGuideProfile returned no data', { error: errMsg });
      return { ok: false as const, error: `Erreur profil: ${errMsg}` };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createGuideProfile failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la creation du profil guide' };
  }
}

export async function adminUpdateGuideProfileStatus(id: string, profileStatus: 'active' | 'suspended' | 'rejected') {
  try {
    const client = getClient();
    const result = await client.models.GuideProfile.update({ id, profileStatus }, { authMode: 'userPool' });
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'adminUpdateGuideProfileStatus failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise à jour du statut' };
  }
}

export async function updateGuideProfileMutation(
  id: string,
  updates: Partial<{ displayName: string; bio: string; city: string; specialties: string[]; languages: string[] }>,
) {
  try {
    const client = getClient();
    const result = await client.models.GuideProfile.update(
      { id, ...updates },
      { authMode: 'userPool' },
    );
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateGuideProfile failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise a jour du profil' };
  }
}

/** @param updates Unvalidated — callers must ensure keys match schema fields */
export async function updateGuideTourMutation(
  id: string,
  updates: Record<string, unknown>,
) {
  try {
    const client = getClient();
    // Cast to allow enriched fields (descriptionLongue, themes, etc.) that will be
    // added to the Amplify schema in a future deployment. In stub mode this is unused.
    const result = await client.models.GuideTour.update(
      { id, ...updates } as Parameters<typeof client.models.GuideTour.update>[0],
      { authMode: 'userPool' },
    );
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateGuideTour failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise a jour du parcours' };
  }
}

// --- Moderation Queries & Mutations ---

export async function listModerationItems(filters?: { status?: string }) {
  try {
    const client = getClient();
    const result = await client.models.ModerationItem.list({
      filter: filters?.status ? { status: { eq: filters.status as 'pending' } } : undefined,
    });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listModerationItems failed', { error: String(error) });
    return [];
  }
}

export async function getModerationItemById(id: string) {
  try {
    const client = getClient();
    const result = await client.models.ModerationItem.get({ id });
    return result.data ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getModerationItemById failed', { error: String(error) });
    return null;
  }
}

export async function updateModerationItemMutation(
  id: string,
  updates: { status: 'pending' | 'resubmitted' | 'in_review' | 'approved' | 'rejected'; reviewerId?: string; reviewDate?: number; feedbackJson?: string; checklistJson?: string },
) {
  try {
    const client = getClient();
    const result = await client.models.ModerationItem.update({ id, ...updates });
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateModerationItem failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise a jour de la moderation' };
  }
}

// --- Dashboard Stats ---

export async function getGuideDashboardStatsById(guideId: string) {
  try {
    const client = getClient();
    const result = await client.models.GuideDashboardStats.list({
      filter: { guideId: { eq: guideId } },
      authMode: 'userPool',
    });
    return result.data?.[0] ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getGuideDashboardStats failed', { error: String(error) });
    return null;
  }
}

export async function createGuideTourMutation(data: {
  guideId: string;
  title: string;
  city: string;
  description?: string;
  duration?: number;
  distance?: number;
}) {
  try {
    const client = getClient();
    const result = await client.models.GuideTour.create(
      { ...data, status: 'draft' },
      { authMode: 'userPool' },
    );
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      return { ok: false as const, error: errMsg };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createGuideTour failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la création du parcours' };
  }
}

// --- Studio Session Queries & Mutations ---

export async function listStudioSessionsByGuide(guideId: string) {
  try {
    const client = getClient();
    const result = await client.models.StudioSession.listStudioSessionByGuideId(
      { guideId },
      { authMode: 'userPool' },
    );
    return { ok: true as const, data: result.data ?? [] };
  } catch (error) {
    logger.error(SERVICE_NAME, 'listStudioSessionsByGuide failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors du chargement des sessions' };
  }
}

export async function getStudioSessionById(id: string) {
  try {
    const client = getClient();
    const result = await client.models.StudioSession.get({ id }, { authMode: 'userPool' });
    return { ok: true as const, data: result.data ?? null };
  } catch (error) {
    logger.error(SERVICE_NAME, 'getStudioSessionById failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors du chargement de la session' };
  }
}

export async function listStudioScenesBySession(sessionId: string) {
  try {
    const client = getClient();
    const result = await client.models.StudioScene.listStudioSceneBySessionId(
      { sessionId },
      { authMode: 'userPool' },
    );
    const sorted = (result.data ?? []).sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
    return { ok: true as const, data: sorted };
  } catch (error) {
    logger.error(SERVICE_NAME, 'listStudioScenesBySession failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors du chargement des scènes' };
  }
}

export async function createStudioSessionMutation(data: {
  guideId: string;
  sourceSessionId?: string;
  tourId?: string;
  title?: string;
  status?: string;
  language?: string;
}) {
  try {
    const client = getClient();
    const result = await client.models.StudioSession.create(
      { ...data, status: (data.status ?? 'draft') as 'draft', consentRGPD: true } as Parameters<typeof client.models.StudioSession.create>[0],
      { authMode: 'userPool' },
    );
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      return { ok: false as const, error: errMsg };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createStudioSession failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la création de la session' };
  }
}

/** @param updates Unvalidated — callers must ensure keys match schema fields */
export async function updateStudioSessionMutation(id: string, updates: Record<string, unknown>) {
  try {
    const client = getClient();
    const result = await client.models.StudioSession.update(
      { id, ...updates } as Parameters<typeof client.models.StudioSession.update>[0],
      { authMode: 'userPool' },
    );
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateStudioSession failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise à jour de la session' };
  }
}

export async function createStudioSceneMutation(data: {
  sessionId: string;
  sceneIndex: number;
  title?: string;
  status?: string;
}) {
  try {
    const client = getClient();
    const result = await client.models.StudioScene.create(
      { ...data, status: (data.status ?? 'empty') as 'empty', archived: false, photosRefs: [] } as Parameters<typeof client.models.StudioScene.create>[0],
      { authMode: 'userPool' },
    );
    if (!result.data) {
      const errMsg = result.errors?.map((e) => e.message).join(', ') ?? 'données nulles';
      return { ok: false as const, error: errMsg };
    }
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'createStudioScene failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la création de la scène' };
  }
}

/** @param updates Unvalidated — callers must ensure keys match schema fields */
export async function updateStudioSceneMutation(id: string, updates: Record<string, unknown>) {
  try {
    const client = getClient();
    const result = await client.models.StudioScene.update(
      { id, ...updates } as Parameters<typeof client.models.StudioScene.update>[0],
      { authMode: 'userPool' },
    );
    return { ok: true as const, data: result.data };
  } catch (error) {
    logger.error(SERVICE_NAME, 'updateStudioScene failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la mise à jour de la scène' };
  }
}

export async function deleteStudioSessionMutation(id: string) {
  try {
    const client = getClient();
    await client.models.StudioSession.delete({ id }, { authMode: 'userPool' });
    return { ok: true as const };
  } catch (error) {
    logger.error(SERVICE_NAME, 'deleteStudioSession failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la suppression de la session' };
  }
}

export async function deleteStudioSceneMutation(id: string) {
  try {
    const client = getClient();
    await client.models.StudioScene.delete({ id }, { authMode: 'userPool' });
    return { ok: true as const };
  } catch (error) {
    logger.error(SERVICE_NAME, 'deleteStudioScene failed', { error: String(error) });
    return { ok: false as const, error: 'Erreur lors de la suppression de la scène' };
  }
}
