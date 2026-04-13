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
  listPublicScenesBySessionServer,
} from './appsync-server-public';

// --- Per-request caches ---

let _citiesCache: City[] | null = null;
let _availableLangsCache: Map<string, string[]> | null = null;
let _guideNameCache: Map<string, string> | null = null;

async function resolveGuideName(guideId: string): Promise<string> {
  if (!_guideNameCache) {
    const profiles = await listGuideProfilesServer();
    _guideNameCache = new Map(profiles.map((p) => [p.id, p.displayName]));
  }
  return _guideNameCache.get(guideId) ?? '';
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
    const appId = process.env.AMPLIFY_APP_ID ?? '4z7fvz7n2bh5rpixdgihjmhdpa';
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

async function getLanguageAudioTypes(sessionId: string): Promise<Record<string, 'tts' | 'recording' | 'mixed'>> {
  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const appId = process.env.AMPLIFY_APP_ID ?? '4z7fvz7n2bh5rpixdgihjmhdpa';
    const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

    const sceneScan = await dynamo.send(new ScanCommand({
      TableName: `StudioScene-${appId}-NONE`,
      FilterExpression: 'sessionId = :sid',
      ExpressionAttributeValues: { ':sid': sessionId },
    }));
    const scenes = sceneScan.Items ?? [];
    if (scenes.length === 0) return {};

    const frSources = new Set<string>();
    for (const sc of scenes) {
      const key = (sc.studioAudioKey as string) || (sc.originalAudioKey as string) || '';
      frSources.add(key.includes('tts') ? 'tts' : 'recording');
    }
    const result: Record<string, 'tts' | 'recording' | 'mixed'> = {
      fr: frSources.size === 1 ? (Array.from(frSources)[0] as 'tts' | 'recording') : 'mixed',
    };

    const purchaseScan = await dynamo.send(new ScanCommand({
      TableName: `TourLanguagePurchase-${appId}-NONE`,
      FilterExpression: 'sessionId = :sid AND #s = :active AND moderationStatus = :approved',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':sid': sessionId, ':active': 'active', ':approved': 'approved' },
    }));
    const approvedLangs = new Set((purchaseScan.Items ?? []).map((p) => p.language as string));

    const sceneIds = scenes.map((s) => s.id as string);
    const segScan = await dynamo.send(new ScanCommand({ TableName: `SceneSegment-${appId}-NONE` }));
    const allSegs = (segScan.Items ?? []).filter((s) => sceneIds.includes(s.sceneId as string));

    const byLang = new Map<string, Set<string>>();
    for (const seg of allSegs) {
      const lang = seg.language as string;
      if (lang === 'fr' || !approvedLangs.has(lang)) continue;
      const source = (seg.audioSource as string) || (seg.ttsGenerated ? 'tts' : 'recording');
      if (!byLang.has(lang)) byLang.set(lang, new Set());
      byLang.get(lang)!.add(source);
    }
    for (const [lang, sources] of byLang) {
      result[lang] = sources.size === 1 ? (Array.from(sources)[0] as 'tts' | 'recording') : 'mixed';
    }
    return result;
  } catch { return {}; }
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
  const mapped = await Promise.all(filtered.map(async (t) => {
    let imageUrl: string | undefined;
    const raw = t as Record<string, unknown>;
    if (raw.heroImageUrl) {
      imageUrl = raw.heroImageUrl as string;
    } else if (raw.sessionId) {
      try {
        const scenesResult = await listPublicScenesBySessionServer(raw.sessionId as string);
        if (scenesResult.ok && scenesResult.data.length > 0) {
          const firstScene = scenesResult.data
            .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((a.sceneIndex as number) ?? 0) - ((b.sceneIndex as number) ?? 0))[0] as Record<string, unknown>;
          const photos = firstScene.photosRefs as string[] | undefined;
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
      status: (t.status || 'draft') as Tour['status'],
      availableLanguages: await resolveAvailableLanguages(t as Record<string, unknown>),
      createdAt: ((t as Record<string, unknown>).createdAt as string) ?? '',
      languageAudioTypes: (t as Record<string, unknown>).sessionId
        ? await getLanguageAudioTypes((t as Record<string, unknown>).sessionId as string) : {},
      imageUrl,
    };
  }));
  return mapped.sort((a, b) => a.title.localeCompare(b.title));
}

async function getRealTourBySlug(citySlug: string, tourSlug: string): Promise<TourDetail | null> {
  const tours = await listGuideToursServer({ status: 'published' });
  const tour = tours.find((t) => generateSlug(t.city) === citySlug && generateSlug(t.title) === tourSlug);
  if (!tour) return null;

  const sessionId = tour.sessionId;
  const [reviews, stats, scenesResult] = await Promise.all([
    listTourReviewsServer(tour.id),
    getTourStatsServer(tour.id),
    sessionId ? listPublicScenesBySessionServer(sessionId) : Promise.resolve({ ok: false as const, data: [] as Record<string, unknown>[] }),
  ]);

  const guideName = await resolveGuideName(tour.guideId);
  const scenes = scenesResult.ok ? scenesResult.data : [];
  const pois = scenes
    .filter((s: Record<string, unknown>) => s.title && !s.archived)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((a.sceneIndex as number) ?? 0) - ((b.sceneIndex as number) ?? 0))
    .map((s: Record<string, unknown>, i: number) => ({
      id: String(s.id ?? ''),
      title: String(s.title ?? `Point ${i + 1}`),
      description: String(s.poiDescription ?? s.transcriptText ?? '').substring(0, 200),
      latitude: (s.latitude as number) ?? 0,
      longitude: (s.longitude as number) ?? 0,
      order: i + 1,
    }));

  return {
    id: tour.id, title: tour.title, slug: generateSlug(tour.title),
    city: tour.city, citySlug: generateSlug(tour.city),
    guideId: tour.guideId, guideName,
    description: tour.description || '',
    shortDescription: (tour.description || '').substring(0, 100),
    duration: tour.duration || 0, distance: tour.distance || 0, poiCount: tour.poiCount || 0,
    isFree: false,
    status: (tour.status || 'draft') as Tour['status'],
    availableLanguages: await resolveAvailableLanguages(tour as unknown as Record<string, unknown>),
    createdAt: ((tour as unknown as Record<string, unknown>).createdAt as string) ?? '',
    languageAudioTypes: tour.sessionId ? await getLanguageAudioTypes(tour.sessionId) : {},
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
  if (!_citiesCache) _citiesCache = await getRealCities();
  return _citiesCache.find((c) => c.slug === slug) ?? null;
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
    status: (t.status || 'draft') as Tour['status'],
    availableLanguages: await resolveAvailableLanguages(t as unknown as Record<string, unknown>),
    createdAt: ((t as unknown as Record<string, unknown>).createdAt as string) ?? '',
    languageAudioTypes: (t as unknown as Record<string, unknown>).sessionId
      ? await getLanguageAudioTypes((t as unknown as Record<string, unknown>).sessionId as string) : {},
  })));
}

export async function getAllToursWithCoords(): Promise<Tour[]> {
  const baseTours = shouldUseStubs() ? getStubAllTours() : await getAllTours();

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const appId = process.env.AMPLIFY_APP_ID ?? '4z7fvz7n2bh5rpixdgihjmhdpa';
    const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

    const sceneScan = await dynamo.send(new ScanCommand({
      TableName: `StudioScene-${appId}-NONE`,
      ProjectionExpression: 'sessionId, sceneIndex, latitude, longitude, photosRefs',
    }));
    const scenes = sceneScan.Items ?? [];

    const tourScan = await dynamo.send(new ScanCommand({
      TableName: `GuideTour-${appId}-NONE`,
      ProjectionExpression: 'id, sessionId',
    }));
    const tourSessionMap = new Map<string, string>();
    for (const t of tourScan.Items ?? []) {
      if (t.sessionId) tourSessionMap.set(t.id as string, t.sessionId as string);
    }

    const firstSceneBySession = new Map<string, { lat: number; lng: number; photo?: string; idx: number }>();
    for (const sc of scenes) {
      const sid = sc.sessionId as string;
      const idx = (sc.sceneIndex as number) ?? 99;
      const lat = sc.latitude as number | undefined;
      const lng = sc.longitude as number | undefined;
      const photos = sc.photosRefs as string[] | undefined;
      const existing = firstSceneBySession.get(sid);
      if (lat && lng && (!existing || idx < existing.idx)) {
        firstSceneBySession.set(sid, { lat, lng, photo: photos?.[0], idx });
      }
    }

    return baseTours.map((tour) => {
      const sessionId = tourSessionMap.get(tour.id);
      const first = sessionId ? firstSceneBySession.get(sessionId) : undefined;
      return { ...tour, latitude: first?.lat, longitude: first?.lng, imageUrl: first?.photo };
    });
  } catch { return baseTours; }
}
