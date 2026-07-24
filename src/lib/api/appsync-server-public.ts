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
import {
  queryPublishedTourContent,
  type PublishedTourContentQueryClient,
} from './published-tour-content';

const SERVICE_NAME = 'AppSyncServerPublic';

/** Paginate through all pages of a list query using nextToken. */
async function paginateAll<T>(
  fetcher: (nextToken: string | null | undefined) => Promise<{ data: T[]; nextToken?: string | null }>,
): Promise<T[]> {
  const all: T[] = [];
  let nextToken: string | null | undefined = null;
  do {
    const page = await fetcher(nextToken);
    all.push(...(page.data ?? []));
    nextToken = page.nextToken;
  } while (nextToken);
  return all;
}

export async function listGuideToursServer(filters?: { city?: string; status?: string }) {
  try {
    const client = getServerClient();
    const filter = {
      ...(filters?.city ? { city: { eq: filters.city } } : {}),
      ...(filters?.status ? { status: { eq: filters.status as 'published' } } : {}),
    };
    return await paginateAll((nextToken) =>
      client.models.GuideTour.list({ filter, nextToken: nextToken ?? undefined }),
    );
  } catch (error) {
    logger.error(SERVICE_NAME, 'listGuideToursServer failed', { error: String(error) });
    return [];
  }
}

export async function listGuideProfilesServer(filters?: { city?: string }) {
  try {
    const client = getServerClient();
    const filter = {
      ...(filters?.city ? { city: { eq: filters.city } } : {}),
      profileStatus: { eq: 'active' },
    };
    return await paginateAll((nextToken) =>
      client.models.GuideProfile.list({ filter, nextToken: nextToken ?? undefined }),
    );
  } catch (error) {
    logger.error(SERVICE_NAME, 'listGuideProfilesServer failed', { error: String(error) });
    return [];
  }
}

export async function listTourReviewsServer(tourId: string) {
  try {
    const client = getServerClient();
    const all = await paginateAll((nextToken) =>
      client.models.TourReview.list({
        filter: { tourId: { eq: tourId }, status: { eq: 'visible' } },
        nextToken: nextToken ?? undefined,
      }),
    );
    return all.sort(
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

export async function getPublishedTourContentServer(tourId: string) {
  try {
    const client = getServerClient() as unknown as PublishedTourContentQueryClient;
    const content = await queryPublishedTourContent(client, tourId);
    return { ok: true as const, data: content };
  } catch (error) {
    logger.error(SERVICE_NAME, 'getPublishedTourContentServer failed', {
      error: String(error),
      tourId,
    });
    return { ok: false as const, error: 'Contenu public indisponible' };
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

export async function getGuideProfileByIdServer(id: string) {
  try {
    const client = getServerClient();
    const result = await client.models.GuideProfile.get({ id });
    return result.data ?? null;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getGuideProfileByIdServer failed', { error: String(error) });
    return null;
  }
}
