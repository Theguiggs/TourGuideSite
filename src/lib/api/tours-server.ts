/**
 * Server-side tours API for catalogue Server Components.
 *
 * Mirrors the public surface of `tours.ts` but uses the server AppSync client
 * (cookies-based, supports guest queries via identity pool credentials).
 *
 * Browser code MUST keep using `tours.ts` — this module is server-only and will
 * throw at build time if imported into a Client Component.
 *
 * Robustesse (lot 3.2, revue web 2026-09-11) :
 * - la liste des visites publiées et les profils de guide sont lus une fois
 *   par période (`ttl-cache`, 5 min, `CATALOGUE_CACHE_TTL_MS`) et partagés
 *   entre appels concurrents — une fiche coûtait trois balayages complets ;
 * - une visite qui échoue au mapping est écartée et journalisée, jamais
 *   la liste entière ; une fiche dont le contenu public est indisponible se
 *   rend quand même, avec `contentUnavailable` ;
 * - l'image de carte vient de `coverPhotoKey` quand il existe, sans appel
 *   au contenu publié (le champ `heroImageUrl` testé auparavant n'a jamais
 *   existé sur GuideTour : le repli N+1 partait pour chaque visite) ;
 * - les slugs sont uniques par ville (`tour-slugs`).
 */

import 'server-only';
import type { City, Tour, TourDetail } from '@/types/tour';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
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
import { assignUniqueSlugs, findTourBySlugs, type TourSlugs } from '@/lib/catalogue/tour-slugs';
import { cached } from '@/lib/server/ttl-cache';

const SERVICE_NAME = 'ToursServer';

type PublishedTour = Awaited<ReturnType<typeof listGuideToursServer>>[number];

// --- Lectures partagées (cache par processus, dédoublonnées en vol) ---

/** Visites publiées et publiques. Une liste vide n'est pas conservée : elle peut naître d'une panne. */
async function publishedTours(): Promise<PublishedTour[]> {
  return cached('tours:published', () => listGuideToursServer({ status: 'published' }), {
    keep: (tours) => tours.length > 0,
  });
}

interface GuideInfo {
  displayName: string;
  photoUrl?: string;
  bio?: string;
  verified?: boolean;
}

async function guideInfoMap(): Promise<Map<string, GuideInfo>> {
  return cached(
    'guides:info',
    async () => {
      const profiles = await listGuideProfilesServer();
      return new Map(
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
    },
    { keep: (map) => map.size > 0 },
  );
}

async function resolveGuideName(guideId: string): Promise<string> {
  return (await guideInfoMap()).get(guideId)?.displayName ?? '';
}

/** Full guide identity for the tour-detail "Votre guide" showcase card. */
async function resolveGuideInfo(guideId: string): Promise<GuideInfo> {
  return (await guideInfoMap()).get(guideId) ?? { displayName: '' };
}

/** Contenu publié d'une visite, partagé entre la carte, la fiche et les coordonnées. */
async function publishedContent(tourId: string) {
  return cached(`tours:content:${tourId}`, () => getPublishedTourContentServer(tourId), {
    keep: (result) => result.ok,
  });
}

/** Ultime recours : ni langue source, ni liste persistée, ni langue approuvée. */
const DEFAULT_SOURCE_LANGUAGE = 'fr';

const asLanguage = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

function resolveAvailableLanguages(tour: Record<string, unknown>): string[] {
  // `GuideTour` ne porte AUCUN champ `language` : le `language` à défaut 'fr' du
  // schéma appartient à `StudioSession`. Poser 'fr' ici préfixait donc un
  // français fantôme à toute Visite — une Visite vendue en anglais seul se
  // voyait attribuer une langue qu'elle ne vend pas, et, l'affichage étant
  // désormais piloté par `availableLanguages`, une mention de synthèse dessus.
  // On ne préfixe que si la langue source existe réellement.
  const sourceLang = asLanguage(tour.language);

  // Language approval persists the consumer-facing list directly on GuideTour.
  // The production web container intentionally has no direct DynamoDB
  // credentials: this field is the only source, and what is not in it is not
  // sold (inventory 2026-09-11: every published tour carries it).
  const persistedLanguages = Array.isArray(tour.availableLanguages)
    ? tour.availableLanguages.filter(
        (language): language is string => typeof language === 'string' && language.length > 0,
      )
    : [];
  const persisted = [...new Set([...(sourceLang ? [sourceLang] : []), ...persistedLanguages])];
  if (persisted.length > 1) return persisted;

  // Langue de repli : celle qui est persistée, jamais un défaut inventé — et
  // jamais `undefined`, qui rendrait `[undefined]`.
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

// --- Mapping commun ---

async function toTour(t: PublishedTour, slugs: TourSlugs, imageUrl?: string): Promise<Tour> {
  const raw = t as unknown as Record<string, unknown>;
  return {
    id: t.id,
    title: t.title,
    slug: slugs.slug,
    city: t.city,
    citySlug: slugs.citySlug,
    guideId: t.guideId,
    guideName: await resolveGuideName(t.guideId),
    description: t.description || '',
    shortDescription: (t.description || '').substring(0, 100),
    duration: t.duration || 0,
    distance: t.distance || 0,
    poiCount: t.poiCount || 0,
    isFree: false,
    priceCents: (raw.priceCents as number | undefined) ?? undefined,
    purchaseType: (raw.purchaseType as Tour['purchaseType']) ?? undefined,
    status: (t.status || 'draft') as Tour['status'],
    availableLanguages: resolveAvailableLanguages(raw),
    createdAt: (raw.createdAt as string) ?? '',
    updatedAt: (raw.updatedAt as string) ?? undefined,
    languageAudioTypes: publishedLanguageAudioTypes(raw),
    imageUrl,
  };
}

/** Photo de couverture persistée sur la visite (clé S3), sans appel supplémentaire. */
function coverKey(t: PublishedTour): string | undefined {
  const key = (t as unknown as Record<string, unknown>).coverPhotoKey;
  return typeof key === 'string' && key.length > 0 ? key : undefined;
}

/** Image de carte : couverture persistée, sinon première photo du contenu publié. */
async function cardImage(t: PublishedTour): Promise<string | undefined> {
  const cover = coverKey(t);
  if (cover) return cover;
  if (!(t as unknown as Record<string, unknown>).sessionId) return undefined;
  try {
    const content = await publishedContent(t.id);
    if (!content.ok) return undefined;
    return content.data.coverUrl ?? content.data.scenes[0]?.photoUrls?.[0];
  } catch {
    return undefined;
  }
}

/** Mappe chaque visite au mieux : une visite en échec est écartée, jamais la liste. */
async function mapTours<R>(
  tours: readonly PublishedTour[],
  mapper: (t: PublishedTour, slugs: TourSlugs) => Promise<R>,
): Promise<R[]> {
  const slugs = assignUniqueSlugs(tours);
  const mapped = await mapWithConcurrency(tours, 5, async (t) => {
    try {
      return await mapper(t, slugs.get(t.id)!);
    } catch (error) {
      logger.warn(SERVICE_NAME, 'tour skipped: mapping failed', { tourId: t.id, error: String(error) });
      return null;
    }
  });
  return mapped.filter((tour): tour is Awaited<R> => tour !== null);
}

// --- Real API ---

async function getRealCities(): Promise<City[]> {
  const tours = await publishedTours();
  const cityMap = new Map<string, { name: string; count: number }>();
  for (const t of tours) {
    const slug = generateSlug(t.city);
    const existing = cityMap.get(slug);
    if (existing) existing.count++;
    else cityMap.set(slug, { name: t.city, count: 1 });
  }
  return Array.from(cityMap.entries()).map(([slug, { name, count }]) => ({
    id: slug,
    name,
    slug,
    description: CITY_DESCRIPTIONS[slug] ?? '',
    tourCount: count,
  }));
}

async function getRealToursByCity(citySlug: string): Promise<Tour[]> {
  const tours = (await publishedTours()).filter((t) => generateSlug(t.city) === citySlug);
  const mapped = await mapTours(tours, async (t, slugs) => toTour(t, slugs, await cardImage(t)));
  return mapped.sort((a, b) => a.title.localeCompare(b.title));
}

async function getRealTourBySlug(citySlug: string, tourSlug: string): Promise<TourDetail | null> {
  const tours = await publishedTours();
  const tour = findTourBySlugs(tours, citySlug, tourSlug);
  if (!tour) return null;
  const slugs = assignUniqueSlugs(tours).get(tour.id)!;

  const [reviews, stats, contentResult, guideInfo] = await Promise.all([
    listTourReviewsServer(tour.id),
    getTourStatsServer(tour.id),
    publishedContent(tour.id),
    resolveGuideInfo(tour.guideId),
  ]);

  // Contenu public indisponible : la fiche se rend quand même (titre, prix,
  // guide, avis), l'itinéraire est annoncé indisponible — plus de 500.
  if (!contentResult.ok) {
    logger.error(SERVICE_NAME, 'published content unavailable, rendering degraded tour page', {
      tourId: tour.id,
      error: contentResult.error,
    });
  }
  const scenes = contentResult.ok ? contentResult.data.scenes : [];
  const pois = mapScenesToPois(scenes);
  const base = await toTour(tour, slugs);

  return {
    ...base,
    guidePhotoUrl: guideInfo.photoUrl,
    guideBio: guideInfo.bio,
    guideVerified: guideInfo.verified,
    imageUrl:
      (contentResult.ok ? contentResult.data.coverUrl : undefined) ??
      scenes.find((scene) => scene.photoUrls?.[0])?.photoUrls?.[0] ??
      coverKey(tour),
    pois,
    contentUnavailable: !contentResult.ok,
    reviews: reviews.map((r) => ({
      id: r.id,
      userId: r.userId,
      rating: r.rating,
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
  return mapTours(await publishedTours(), (t, slugs) => toTour(t, slugs));
}

/** Visites avec la position de leur première étape (carte du catalogue). Sans contenu : sans position, pas d'erreur. */
export async function getAllToursWithCoords(): Promise<Tour[]> {
  const baseTours = shouldUseStubs() ? getStubAllTours() : await getAllTours();

  return mapWithConcurrency(baseTours, 5, async (tour) => {
    try {
      const content = await publishedContent(tour.id);
      if (!content.ok) {
        logger.warn(SERVICE_NAME, 'tour without coordinates: content unavailable', { tourId: tour.id });
        return tour;
      }
      const first = content.data.scenes.find(
        (scene) => typeof scene.latitude === 'number' && typeof scene.longitude === 'number',
      );
      return {
        ...tour,
        latitude: first?.latitude,
        longitude: first?.longitude,
        imageUrl: content.data.coverUrl ?? first?.photoUrls?.[0] ?? tour.imageUrl,
      };
    } catch (error) {
      logger.warn(SERVICE_NAME, 'tour without coordinates: content failed', { tourId: tour.id, error: String(error) });
      return tour;
    }
  });
}
