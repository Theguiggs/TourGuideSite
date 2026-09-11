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
import { mapScenesToPois } from '@/lib/catalogue/scene-pois';

// --- Lookup caches ---

const _availableLangsCache: Map<string, string[]> = new Map();
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

/** Ultime recours : ni langue source, ni liste persistée, ni langue approuvée. */
const DEFAULT_SOURCE_LANGUAGE = 'fr';

const asLanguage = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

async function resolveAvailableLanguages(tour: Record<string, unknown>): Promise<string[]> {
  const tourId = tour.id as string;
  // `GuideTour` ne porte AUCUN champ `language` : le `language` à défaut 'fr' du
  // schéma appartient à `StudioSession`. Poser 'fr' ici préfixait donc un
  // français fantôme à toute Visite — une Visite vendue en anglais seul se
  // voyait attribuer une langue qu'elle ne vend pas, et, l'affichage étant
  // désormais piloté par `availableLanguages`, une mention de synthèse dessus.
  // On ne préfixe que si la langue source existe réellement.
  const sourceLang = asLanguage(tour.language);

  // Language approval persists the consumer-facing list directly on GuideTour.
  // Prefer that authoritative value before the process-local cache or the
  // legacy DynamoDB fallback. The production web container intentionally has
  // no direct DynamoDB credentials, so ignoring this field made every approved
  // multilingual tour silently fall back to French only.
  const persistedLanguages = Array.isArray(tour.availableLanguages)
    ? tour.availableLanguages.filter(
        (language): language is string => typeof language === 'string' && language.length > 0,
      )
    : [];
  const persisted = [...new Set([...(sourceLang ? [sourceLang] : []), ...persistedLanguages])];
  if (persisted.length > 1) return persisted;

  if (_availableLangsCache.has(tourId)) return _availableLangsCache.get(tourId)!;

  // Langue de repli du chemin hérité : celle qui est persistée, jamais un défaut
  // inventé — et jamais `undefined`, qui rendrait `[undefined]`.
  //
  // Le repli DynamoDB qui suivait a été RETIRÉ. Il visait une table d'un
  // backend mort (table `TourLanguagePurchase` d'une pile abandonnée, codée en dur) par
  // un `Scan` complet, exécuté à chaque rendu d'une visite héritée, et
  // échouait en silence (`catch` vide) — le conteneur web n'a d'ailleurs aucun
  // droit DynamoDB, par conception. Toutes les visites publiées portent
  // désormais `availableLanguages` (inventaire du 2026-09-11 : 0 sans), et
  // c'est le chemin d'approbation qui l'écrit ; ce qui n'y est pas n'est pas
  // vendu.
  const baseLang = persisted[0] ?? DEFAULT_SOURCE_LANGUAGE;
  return [baseLang];
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
    // Prefer media signed by the publication facade.
    if (raw.heroImageUrl) {
      imageUrl = raw.heroImageUrl as string;
    } else if (raw.sessionId) {
      try {
        const contentResult = await getPublishedTourContentServer(t.id);
        if (contentResult.ok) {
          const firstScene = contentResult.data.scenes[0];
          imageUrl =
            contentResult.data.coverUrl ??
            firstScene?.photoUrls?.[0];
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
  const pois = mapScenesToPois(contentResult.data.scenes);

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
    imageUrl:
      contentResult.data.coverUrl ??
      contentResult.data.scenes.find((scene) => scene.photoUrls?.[0])?.photoUrls?.[0] ??
      undefined,
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
        imageUrl:
          content.data.coverUrl ??
          first?.photoUrls?.[0] ??
          tour.imageUrl,
      };
    },
  );

}
