/**
 * Server-side tours API for catalogue Server Components.
 *
 * Mirrors the public surface of `tours.ts` but uses the server AppSync client
 * (cookies-based, supports guest queries via identity pool credentials).
 *
 * Browser code MUST keep using `tours.ts` — this module is server-only and will
 * throw at build time if imported into a Client Component.
 */

import 'server-only';
import type { City, Tour, TourDetail } from '@/types/tour';
import { shouldUseStubs } from '@/config/api-mode';
import {
  CITY_DESCRIPTIONS,
  generateSlug,
  getStubCities,
  getStubCityBySlug,
  getStubToursByCity,
  getStubTourBySlug,
  getStubAllTours,
} from './tours';
import {
  listGuideToursServer,
  listGuideProfilesServer,
  listTourReviewsServer,
  getTourStatsServer,
  getPublishedTourContentServer,
} from './appsync-server-public';
import { mapWithConcurrency } from './published-tour-content';

// --- Lookup caches ---

let _availableLangsCache: Map<string, string[]> | null = null;
let _guideNameCache: Map<string, string> | null = null;

interface GuideInfo {
  displayName: string;
  photoUrl?: string;
  bio?: string;
  verified?: boolean;
}
let _guideInfoCache: Map<string, GuideInfo> | null = null;

async function resolveGuideName(guideId: string): Promise<string> {
  if (!_guideNameCache) {
    const profiles = await listGuideProfilesServer();
    _guideNameCache = new Map(profiles.map((p) => [p.id, p.displayName]));
  }
  return _guideNameCache.get(guideId) ?? '';
}

/** Full guide identity for the tour-detail "Votre guide" showcase card. */
async function resolveGuideInfo(guideId: string): Promise<GuideInfo> {
  if (!_guideInfoCache) {
    const profiles = await listGuideProfilesServer();
    _guideInfoCache = new Map(
      profiles.map((p) => [
        p.id,
        {
          displayName: p.displayName,
          photoUrl: (p.photoUrl as string | null) ?? undefined,
          bio: (p.bio as string | null) ?? undefined,
          verified: (p.verified as boolean | null) ?? undefined,
        },
      ]),
    );
  }
  return _guideInfoCache.get(guideId) ?? { displayName: '' };
}

async function resolveAvailableLanguages(tour: Record<string, unknown>): Promise<string[]> {
  const tourId = tour.id as string;
  const sessionId = tour.sessionId as string | undefined;
  const sourceLang = (tour.language as string) ?? 'fr';

  if (_availableLangsCache?.has(tourId)) return _availableLangsCache.get(tourId)!;
  if (!sessionId) return [sourceLang];

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const appId = process.env.AMPLIFY_APP_ID ?? 't5nxxao3orh6za2bjj6uegulru';
    const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
    const result = await dynamo.send(new ScanCommand({
      TableName: `TourLanguagePurchase-${appId}-NONE`,
      FilterExpression: 'sessionId = :sid AND #s = :active AND moderationStatus = :approved',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':sid': sessionId, ':active': 'active', ':approved': 'approved' },
    }));
    const approvedLangs = (result.Items ?? []).map((p) => p.language as string);
    const langs = [...new Set([sourceLang, ...approvedLangs])];
    if (!_availableLangsCache) _availableLangsCache = new Map();
    _availableLangsCache.set(tourId, langs);
    return langs;
  } catch { /* fallback */ }

  return [sourceLang];
}

function publishedLanguageAudioTypes(
  tour: Record<string, unknown>,
): Record<string, 'tts' | 'recording' | 'mixed'> {
  const raw = tour.languageAudioTypes;
  if (typeof raw === 'string') {
    try {
      return publishedLanguageAudioTypes({ languageAudioTypes: JSON.parse(raw) });
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, 'tts' | 'recording' | 'mixed'] =>
        entry[1] === 'tts' || entry[1] === 'recording' || entry[1] === 'mixed',
    ),
  );
}

// --- Real API ---

async function getRealCities(): Promise<City[]> {
  const tours = await listGuideToursServer({ status: 'published' });
  const cityMap = new Map<string, { name: string; count: number }>();
  for (const t of tours) {
    const existing = cityMap.get(t.city);
    if (existing) existing.count++;
    else cityMap.set(t.city, { name: t.city, count: 1 });
  }
  return Array.from(cityMap.entries()).map(([, { name, count }]) => {
    const slug = generateSlug(name);
    return { id: slug, name, slug, description: CITY_DESCRIPTIONS[slug] ?? '', tourCount: count };
  });
}

async function getRealToursByCity(citySlug: string): Promise<Tour[]> {
  const tours = await listGuideToursServer({ status: 'published' });
  const filtered = tours.filter((t) => generateSlug(t.city) === citySlug);
  const mapped = await mapWithConcurrency(filtered, 5, async (t) => {
    let imageUrl: string | undefined;
    const raw = t as Record<string, unknown>;
    // Prefer the guide's cover photo (from Général); fall back to the first
    // scene photo. Both are guide-studio/* S3 keys resolved by <S3Image>.
    if (raw.coverPhotoKey) {
      imageUrl = raw.coverPhotoKey as string;
    } else if (raw.heroImageUrl) {
      imageUrl = raw.heroImageUrl as string;
    } else if (raw.sessionId) {
      try {
        const contentResult = await getPublishedTourContentServer(t.id);
        if (contentResult.ok && contentResult.data.scenes.length > 0) {
          const firstScene = contentResult.data.scenes[0];
          const photos = firstScene.photos;
          if (photos?.[0]) imageUrl = photos[0];
        }
      } catch { /* non-blocking */ }
    }
    return {
      id: t.id, title: t.title, slug: generateSlug(t.title),
      city: t.city, citySlug: generateSlug(t.city),
      guideId: t.guideId, guideName: await resolveGuideName(t.guideId),
      description: t.description || '',
      shortDescription: (t.description || '').substring(0, 100),
      duration: t.duration || 0, distance: t.distance || 0, poiCount: t.poiCount || 0,
      isFree: false,
      priceCents: ((t as Record<string, unknown>).priceCents as number | undefined) ?? undefined,
      purchaseType: ((t as Record<string, unknown>).purchaseType as Tour['purchaseType']) ?? undefined,
      status: (t.status || 'draft') as Tour['status'],
      availableLanguages: await resolveAvailableLanguages(t as Record<string, unknown>),
      createdAt: ((t as Record<string, unknown>).createdAt as string) ?? '',
      languageAudioTypes: publishedLanguageAudioTypes(t as unknown as Record<string, unknown>),
      imageUrl,
    };
  });
  return mapped.sort((a, b) => a.title.localeCompare(b.title));
}

async function getRealTourBySlug(citySlug: string, tourSlug: string): Promise<TourDetail | null> {
  const tours = await listGuideToursServer({ status: 'published' });
  const tour = tours.find((t) => generateSlug(t.city) === citySlug && generateSlug(t.title) === tourSlug);
  if (!tour) return null;

  const [reviews, stats, contentResult] = await Promise.all([
    listTourReviewsServer(tour.id),
    getTourStatsServer(tour.id),
    getPublishedTourContentServer(tour.id),
  ]);

  const guideInfo = await resolveGuideInfo(tour.guideId);
  const guideName = guideInfo.displayName;
  if (!contentResult.ok) {
    throw new Error(contentResult.error);
  }
  const scenes = contentResult.data.scenes;
  const pois = scenes
    .map((s, i: number) => ({
      id: s.id,
      title: s.title || `Point ${i + 1}`,
      description: s.description.substring(0, 200),
      latitude: s.latitude ?? 0,
      longitude: s.longitude ?? 0,
      order: i + 1,
    }));

  return {
    id: tour.id, title: tour.title, slug: generateSlug(tour.title),
    city: tour.city, citySlug: generateSlug(tour.city),
    guideId: tour.guideId, guideName,
    guidePhotoUrl: guideInfo.photoUrl,
    guideBio: guideInfo.bio,
    guideVerified: guideInfo.verified,
    description: tour.description || '',
    shortDescription: (tour.description || '').substring(0, 100),
    duration: tour.duration || 0, distance: tour.distance || 0, poiCount: tour.poiCount || 0,
    isFree: false,
    priceCents: ((tour as unknown as Record<string, unknown>).priceCents as number | undefined) ?? undefined,
    purchaseType: ((tour as unknown as Record<string, unknown>).purchaseType as Tour['purchaseType']) ?? undefined,
    status: (tour.status || 'draft') as Tour['status'],
    availableLanguages: await resolveAvailableLanguages(tour as unknown as Record<string, unknown>),
    createdAt: ((tour as unknown as Record<string, unknown>).createdAt as string) ?? '',
    languageAudioTypes: publishedLanguageAudioTypes(tour as unknown as Record<string, unknown>),
    imageUrl: ((tour as unknown as Record<string, unknown>).coverPhotoKey as string) ?? undefined,
    pois,
    reviews: reviews.map((r) => ({
      id: r.id, userId: r.userId, rating: r.rating,
      comment: r.comment ?? null,
      visitedAt: r.visitedAt ?? 0,
      language: r.language ?? 'fr',
      createdAt: r.createdAt,
    })),
    averageRating: stats?.averageRating ?? 0,
    reviewCount: stats?.reviewCount ?? reviews.length,
    completionCount: stats?.completionCount ?? 0,
  };
}

// --- Public API ---

export async function getCities(): Promise<City[]> {
  if (shouldUseStubs()) return getStubCities();
  return getRealCities();
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  if (shouldUseStubs()) return getStubCityBySlug(slug);
  const cities = await getRealCities();
  return cities.find((c) => c.slug === slug) ?? null;
}

export async function getToursByCity(citySlug: string): Promise<Tour[]> {
  if (shouldUseStubs()) return getStubToursByCity(citySlug);
  return getRealToursByCity(citySlug);
}

export async function getTourBySlug(citySlug: string, tourSlug: string): Promise<TourDetail | null> {
  if (shouldUseStubs()) return getStubTourBySlug(citySlug, tourSlug);
  return getRealTourBySlug(citySlug, tourSlug);
}

export async function getAllTours(): Promise<Tour[]> {
  if (shouldUseStubs()) return getStubAllTours();
  const tours = await listGuideToursServer({ status: 'published' });
  return Promise.all(tours.map(async (t) => ({
    id: t.id, title: t.title, slug: generateSlug(t.title),
    city: t.city, citySlug: generateSlug(t.city),
    guideId: t.guideId, guideName: await resolveGuideName(t.guideId),
    description: t.description || '',
    shortDescription: (t.description || '').substring(0, 100),
    duration: t.duration || 0, distance: t.distance || 0, poiCount: t.poiCount || 0,
    isFree: false,
    priceCents: ((t as unknown as Record<string, unknown>).priceCents as number | undefined) ?? undefined,
    purchaseType: ((t as unknown as Record<string, unknown>).purchaseType as Tour['purchaseType']) ?? undefined,
    status: (t.status || 'draft') as Tour['status'],
    availableLanguages: await resolveAvailableLanguages(t as unknown as Record<string, unknown>),
    createdAt: ((t as unknown as Record<string, unknown>).createdAt as string) ?? '',
    languageAudioTypes: publishedLanguageAudioTypes(t as unknown as Record<string, unknown>),
  })));
}

export async function getAllToursWithCoords(): Promise<Tour[]> {
  const baseTours = shouldUseStubs() ? getStubAllTours() : await getAllTours();

  return mapWithConcurrency(
    baseTours,
    5,
    async (tour) => {
      const content = await getPublishedTourContentServer(tour.id);
      if (!content.ok) {
        throw new Error(content.error);
      }
      const first = content.data.scenes.find(
        (scene) =>
          typeof scene.latitude === 'number' && typeof scene.longitude === 'number',
      );
      return {
        ...tour,
        latitude: first?.latitude,
        longitude: first?.longitude,
        imageUrl: tour.imageUrl ?? first?.photos[0],
      };
    },
  );

}
