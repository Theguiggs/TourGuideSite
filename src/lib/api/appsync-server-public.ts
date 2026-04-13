/**
 * Server-side AppSync queries for public catalogue pages.
 *
 * Marked 'server-only' — these functions cannot be imported into Client Components.
 * Use these from RSC (catalogue pages, sitemap) where Amplify cannot run client-side.
 *
 * The browser equivalents live in appsync-client.ts.
 */

import 'server-only';
import { logger } from '@/lib/logger';
import { getServerClient } from '@/lib/amplify/server-client';

const SERVICE_NAME = 'AppSyncServerPublic';

export async function listGuideToursServer(filters?: { city?: string; status?: string }) {
  try {
    const client = getServerClient();
    const result = await client.models.GuideTour.list({
      filter: {
        ...(filters?.city ? { city: { eq: filters.city } } : {}),
        ...(filters?.status ? { status: { eq: filters.status as 'published' } } : {}),
      },
    });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listGuideToursServer failed', { error: String(error) });
    return [];
  }
}

export async function listGuideProfilesServer(filters?: { city?: string }) {
  try {
    const client = getServerClient();
    const result = await client.models.GuideProfile.list({
      filter: {
        ...(filters?.city ? { city: { eq: filters.city } } : {}),
        profileStatus: { eq: 'active' },
      },
    });
    return result.data ?? [];
  } catch (error) {
    logger.error(SERVICE_NAME, 'listGuideProfilesServer failed', { error: String(error) });
    return [];
  }
}

export async function listTourReviewsServer(tourId: string) {
  try {
    const client = getServerClient();
    const result = await client.models.TourReview.list({
      filter: { tourId: { eq: tourId }, status: { eq: 'visible' } },
    });
    return (result.data ?? []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error) {
    logger.error(SERVICE_NAME, 'listTourReviewsServer failed', { error: String(error) });
    return [];
  }
}

export async function getTourStatsServer(tourId: string) {
  try {
    const client = getServerClient();
    const result = await client.models.TourStats.list({
      filter: { tourId: { eq: tourId } },
    });
    return result.data?.[0] ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getTourStatsServer failed', { error: String(error) });
    return null;
  }
}

export async function listPublicScenesBySessionServer(sessionId: string) {
  try {
    const client = getServerClient();
    const result = await client.models.StudioScene.listStudioSceneBySessionId({ sessionId });
    const sorted = (result.data ?? []).sort(
      (a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0),
    );
    return { ok: true as const, data: sorted };
  } catch (error) {
    logger.error(SERVICE_NAME, 'listPublicScenesBySessionServer failed', { error: String(error) });
    return { ok: false as const, data: [] };
  }
}

export async function getGuideTourByIdServer(id: string) {
  try {
    const client = getServerClient();
    const result = await client.models.GuideTour.get({ id });
    return result.data ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getGuideTourByIdServer failed', { error: String(error) });
    return null;
  }
}
