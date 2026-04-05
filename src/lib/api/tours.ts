import type { City, Tour, TourDetail, TourReview } from '@/types/tour';
import { shouldUseStubs } from '@/config/api-mode';
import * as appsync from './appsync-client';

/**
 * Tour data access layer.
 *
 * Stub mode: returns mock data (default for development).
 * Real mode: queries Amplify AppSync / DynamoDB.
 * ISR revalidation: 5 minutes on public pages.
 */

// --- Mock Data ---

const MOCK_CITIES: City[] = [
  {
    id: 'grasse',
    name: 'Grasse',
    slug: 'grasse',
    description: 'Capitale mondiale du parfum, perchee dans les collines de la Cote d\'Azur.',
    imageUrl: '/images/cities/grasse.jpg',
    tourCount: 2,
  },
  {
    id: 'paris',
    name: 'Paris',
    slug: 'paris',
    description: 'La Ville Lumiere et ses quartiers historiques.',
    imageUrl: '/images/cities/paris.jpg',
    tourCount: 1,
  },
  {
    id: 'lyon',
    name: 'Lyon',
    slug: 'lyon',
    description: 'Capitale de la gastronomie, entre Rhone et Saone.',
    imageUrl: '/images/cities/lyon.jpg',
    tourCount: 1,
  },
];

const MOCK_TOURS: Tour[] = [
  {
    id: 'grasse-ame-parfumeurs',
    title: 'L\'Ame des Parfumeurs',
    slug: 'ame-des-parfumeurs',
    city: 'Grasse',
    citySlug: 'grasse',
    guideId: 'guide-1',
    guideName: 'Marie Dupont',
    guidePhotoUrl: '/images/guides/marie.jpg',
    description:
      'Plongez dans l\'histoire de Grasse, capitale mondiale du parfum. Decouvrez les ' +
      'parfumeries historiques, les champs de fleurs et les secrets des maitres parfumeurs ' +
      'qui ont fait la renommee de cette ville provencale.',
    shortDescription: 'Decouvrez Grasse, capitale mondiale du parfum.',
    duration: 45,
    distance: 2.1,
    poiCount: 6,
    imageUrl: '/images/tours/grasse-parfumeurs.jpg',
    isFree: true,
    status: 'published',
    availableLanguages: ['fr', 'en'],
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'grasse-vieille-ville',
    title: 'La Vieille Ville de Grasse',
    slug: 'vieille-ville',
    city: 'Grasse',
    citySlug: 'grasse',
    guideId: 'guide-2',
    guideName: 'Pierre Martin',
    description:
      'Parcourez les ruelles medievales de la vieille ville de Grasse. Architecture ' +
      'provencale, places ombragees et panoramas sur la Cote d\'Azur.',
    shortDescription: 'Les ruelles medievales et panoramas de la vieille ville.',
    duration: 35,
    distance: 1.5,
    poiCount: 5,
    isFree: false,
    status: 'published',
    availableLanguages: ['fr'],
    createdAt: '2026-02-10T09:00:00.000Z',
  },
  {
    id: 'paris-montmartre',
    title: 'Secrets de Montmartre',
    slug: 'secrets-de-montmartre',
    city: 'Paris',
    citySlug: 'paris',
    guideId: 'guide-3',
    guideName: 'Sophie Bernard',
    guidePhotoUrl: '/images/guides/sophie.jpg',
    description:
      'De la Place du Tertre au Sacre-Coeur, decouvrez les histoires cachees ' +
      'de la butte Montmartre. Art, boheme et panoramas parisiens.',
    shortDescription: 'Les histoires cachees de la butte Montmartre.',
    duration: 60,
    distance: 3.0,
    poiCount: 8,
    imageUrl: '/images/tours/paris-montmartre.jpg',
    isFree: false,
    status: 'published',
    availableLanguages: ['fr', 'en', 'es'],
    createdAt: '2026-01-20T14:00:00.000Z',
  },
  {
    id: 'lyon-vieux-lyon',
    title: 'Traboules du Vieux Lyon',
    slug: 'traboules-vieux-lyon',
    city: 'Lyon',
    citySlug: 'lyon',
    guideId: 'guide-4',
    guideName: 'Antoine Rossi',
    description:
      'Explorez les traboules secretes du Vieux Lyon, classees au patrimoine mondial de ' +
      'l\'UNESCO. Architecture Renaissance et gastronomie lyonnaise.',
    shortDescription: 'Les traboules secretes du Vieux Lyon UNESCO.',
    duration: 50,
    distance: 2.5,
    poiCount: 7,
    isFree: false,
    status: 'published',
    availableLanguages: ['fr', 'it'],
    createdAt: '2026-01-25T16:00:00.000Z',
  },
];

const MOCK_REVIEWS: Record<string, TourReview[]> = {
  'grasse-ame-parfumeurs': [
    { id: 'r1', userId: 'u1', rating: 5, comment: 'Superbe visite ! L\'audio est tres immersif, on se sent vraiment guide.', visitedAt: 1709251200000, language: 'fr', createdAt: '2026-03-01T10:00:00.000Z' },
    { id: 'r2', userId: 'u2', rating: 4, comment: 'Tres bien, parcours agreable. Un peu court a mon gout.', visitedAt: 1708905600000, language: 'fr', createdAt: '2026-02-26T10:00:00.000Z' },
    { id: 'r3', userId: 'u3', rating: 5, comment: 'Parfait pour decouvrir Grasse en autonomie !', visitedAt: 1708300800000, language: 'fr', createdAt: '2026-02-19T10:00:00.000Z' },
  ],
  'grasse-vieille-ville': [
    { id: 'r4', userId: 'u4', rating: 4, comment: 'Belles ruelles, guide audio agreable.', visitedAt: 1709164800000, language: 'fr', createdAt: '2026-02-28T10:00:00.000Z' },
  ],
  'paris-montmartre': [
    { id: 'r5', userId: 'u5', rating: 5, comment: 'Montmartre comme on ne l\'a jamais vu !', visitedAt: 1709078400000, language: 'fr', createdAt: '2026-02-27T10:00:00.000Z' },
    { id: 'r6', userId: 'u6', rating: 5, comment: 'Les anecdotes sont passionnantes.', visitedAt: 1708992000000, language: 'fr', createdAt: '2026-02-26T14:00:00.000Z' },
  ],
  'lyon-vieux-lyon': [
    { id: 'r7', userId: 'u7', rating: 4, comment: 'Traboules magnifiques, audio clair.', visitedAt: 1709078400000, language: 'fr', createdAt: '2026-02-27T10:00:00.000Z' },
  ],
};

const MOCK_POIS: Record<string, { id: string; title: string; description: string; latitude: number; longitude: number; order: number }[]> = {
  'grasse-ame-parfumeurs': [
    { id: 'p1', title: 'Place aux Aires', description: 'Point de depart, ancien marche aux herbes', latitude: 43.6591, longitude: 6.9243, order: 1 },
    { id: 'p2', title: 'Parfumerie Fragonard', description: 'Maison de parfum historique fondee en 1926', latitude: 43.6587, longitude: 6.9221, order: 2 },
    { id: 'p3', title: 'Musee International de la Parfumerie', description: 'L\'histoire du parfum a travers les siecles', latitude: 43.6583, longitude: 6.9215, order: 3 },
  ],
  'grasse-vieille-ville': [
    { id: 'p4', title: 'Cathedrale Notre-Dame du Puy', description: 'Cathedrale du XIIe siecle', latitude: 43.6593, longitude: 6.9218, order: 1 },
    { id: 'p5', title: 'Place du 24 Aout', description: 'Coeur de la vieille ville', latitude: 43.6589, longitude: 6.9232, order: 2 },
  ],
  'paris-montmartre': [
    { id: 'p6', title: 'Place du Tertre', description: 'La place des artistes', latitude: 48.8863, longitude: 2.3407, order: 1 },
    { id: 'p7', title: 'Sacre-Coeur', description: 'Basilique et panorama sur Paris', latitude: 48.8867, longitude: 2.3431, order: 2 },
    { id: 'p8', title: 'Le Bateau-Lavoir', description: 'Atelier de Picasso et Modigliani', latitude: 48.8851, longitude: 2.3390, order: 3 },
  ],
  'lyon-vieux-lyon': [
    { id: 'p9', title: 'Cathedrale Saint-Jean', description: 'Chef-d\'oeuvre gothique', latitude: 45.7604, longitude: 4.8267, order: 1 },
    { id: 'p10', title: 'Traboule de la Tour Rose', description: 'La plus celebre traboule lyonnaise', latitude: 45.7621, longitude: 4.8273, order: 2 },
  ],
};

// --- Stub API functions ---

function getStubCities(): City[] { return MOCK_CITIES; }
function getStubCityBySlug(slug: string): City | null { return MOCK_CITIES.find((c) => c.slug === slug) ?? null; }
function getStubToursByCity(citySlug: string): Tour[] {
  return MOCK_TOURS.filter((t) => t.citySlug === citySlug && t.status === 'published').sort((a, b) => {
    if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}
function getStubTourBySlug(citySlug: string, tourSlug: string): TourDetail | null {
  const tour = MOCK_TOURS.find((t) => t.citySlug === citySlug && t.slug === tourSlug);
  if (!tour) return null;
  const pois = MOCK_POIS[tour.id] || [];
  const reviews = MOCK_REVIEWS[tour.id] || [];
  const averageRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0;
  return { ...tour, pois, reviews, averageRating, reviewCount: reviews.length, completionCount: 42 };
}
function getStubAllTours(): Tour[] { return MOCK_TOURS.filter((t) => t.status === 'published'); }

// --- Real API helpers ---

function generateSlug(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Determine audio type per language for a session.
 * Fetches all segments, groups by language, checks audioSource field.
 */
async function getLanguageAudioTypes(sessionId: string): Promise<Record<string, 'tts' | 'recording' | 'mixed'>> {
  try {
    const scenesResult = await appsync.listPublicScenesBySession(sessionId);
    if (!scenesResult.ok || scenesResult.data.length === 0) return {};

    // FR source: check if scenes have studioAudioKey (recording) or TTS
    const frSources = new Set<string>();
    for (const scene of scenesResult.data) {
      const raw = scene as Record<string, unknown>;
      const key = (raw.studioAudioKey as string) || (raw.originalAudioKey as string) || '';
      frSources.add(key.includes('tts') ? 'tts' : 'recording');
    }
    const result: Record<string, 'tts' | 'recording' | 'mixed'> = {
      fr: frSources.size === 1 ? (Array.from(frSources)[0] as 'tts' | 'recording') : 'mixed',
    };

    // Translated languages: check SceneSegment.audioSource
    const { listSegmentsByScene } = await import('./studio');
    const allSegments = (await Promise.all(
      scenesResult.data.map((s) => listSegmentsByScene((s as Record<string, unknown>).id as string)),
    )).flat();

    const byLang = new Map<string, Set<string>>();
    for (const seg of allSegments) {
      if (seg.language === 'fr') continue;
      const source = seg.audioSource || (seg.ttsGenerated ? 'tts' : 'recording');
      if (!byLang.has(seg.language)) byLang.set(seg.language, new Set());
      byLang.get(seg.language)!.add(source);
    }

    for (const [lang, sources] of byLang) {
      result[lang] = sources.size === 1 ? (Array.from(sources)[0] as 'tts' | 'recording') : 'mixed';
    }
    return result;
  } catch {
    return {};
  }
}

// Cache guide names to avoid repeated lookups within a single request
let _guideNameCache: Map<string, string> | null = null;

async function resolveGuideName(guideId: string): Promise<string> {
  if (!_guideNameCache) {
    const profiles = await appsync.listGuideProfiles();
    _guideNameCache = new Map(profiles.map((p) => [p.id, p.displayName]));
  }
  return _guideNameCache.get(guideId) ?? '';
}

// City descriptions — static for known cities, empty for unknown
const CITY_DESCRIPTIONS: Record<string, string> = {
  grasse: 'Capitale mondiale du parfum, perchee dans les collines de la Cote d\'Azur.',
  paris: 'La Ville Lumiere et ses quartiers historiques.',
  lyon: 'Capitale de la gastronomie, entre Rhone et Saone.',
  nice: 'Reine de la Cote d\'Azur, entre Promenade des Anglais et Vieux-Nice baroque.',
  cannes: 'Glamour et cinema sur la Croisette, entre palaces et vieille ville du Suquet.',
  antibes: 'Cite des remparts et de Picasso, entre port antique et Cap d\'Antibes sauvage.',
  menton: 'Perle de la France aux portes de l\'Italie, jardins exotiques et citrons dores.',
  'saint-paul-de-vence': 'Village medieval perche, galeries d\'art et panoramas sur la Mediterranee.',
  mougins: 'Village d\'art et de gastronomie niché dans les collines au-dessus de Cannes.',
  vence: 'Cite episcopale millenaire, chapelle Matisse et ruelles provencales.',
};

async function getRealCities(): Promise<City[]> {
  const tours = await appsync.listGuideTours({ status: 'published' });
  const cityMap = new Map<string, { name: string; count: number }>();
  for (const t of tours) {
    const city = t.city;
    const existing = cityMap.get(city);
    if (existing) {
      existing.count++;
    } else {
      cityMap.set(city, { name: city, count: 1 });
    }
  }
  return Array.from(cityMap.entries()).map(([, { name, count }]) => {
    const slug = generateSlug(name);
    return {
      id: slug,
      name,
      slug,
      description: CITY_DESCRIPTIONS[slug] ?? '',
      tourCount: count,
    };
  });
}

async function getRealToursByCity(citySlug: string): Promise<Tour[]> {
  const tours = await appsync.listGuideTours({ status: 'published' });
  const filtered = tours.filter((t) => generateSlug(t.city) === citySlug);
  const mapped = await Promise.all(
    filtered.map(async (t) => {
      // Resolve cover image: heroImageUrl > first scene photo > undefined
      let imageUrl: string | undefined;
      const raw = t as Record<string, unknown>;
      if (raw.heroImageUrl) {
        imageUrl = raw.heroImageUrl as string;
      } else if (raw.sessionId) {
        try {
          const scenesResult = await appsync.listPublicScenesBySession(raw.sessionId as string);
          if (scenesResult.ok && scenesResult.data.length > 0) {
            const firstScene = scenesResult.data
              .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((a.sceneIndex as number) ?? 0) - ((b.sceneIndex as number) ?? 0))[0] as Record<string, unknown>;
            const photos = firstScene.photosRefs as string[] | undefined;
            if (photos?.[0]) imageUrl = photos[0];
          }
        } catch { /* non-blocking */ }
      }
      return {
        id: t.id,
        title: t.title,
        slug: generateSlug(t.title),
        city: t.city,
        citySlug: generateSlug(t.city),
        guideId: t.guideId,
        guideName: await resolveGuideName(t.guideId),
        description: t.description || '',
        shortDescription: (t.description || '').substring(0, 100),
        duration: t.duration || 0,
        distance: t.distance || 0,
        poiCount: t.poiCount || 0,
        isFree: false,
        status: (t.status || 'draft') as Tour['status'],
        availableLanguages: Array.isArray((t as Record<string, unknown>).availableLanguages) ? (t as Record<string, unknown>).availableLanguages as string[] : [(t as Record<string, unknown>).language as string ?? 'fr'],
        createdAt: ((t as Record<string, unknown>).createdAt as string) ?? '',
        imageUrl,
      };
    }),
  );
  return mapped.sort((a, b) => a.title.localeCompare(b.title));
}

async function getRealTourBySlug(citySlug: string, tourSlug: string): Promise<TourDetail | null> {
  const tours = await appsync.listGuideTours({ status: 'published' });
  const tour = tours.find((t) => generateSlug(t.city) === citySlug && generateSlug(t.title) === tourSlug);
  if (!tour) return null;

  // Fetch scenes as POIs + reviews + stats in parallel
  const sessionId = tour.sessionId;
  const [reviews, stats, scenesResult] = await Promise.all([
    appsync.listTourReviews(tour.id),
    appsync.getTourStats(tour.id),
    sessionId ? appsync.listPublicScenesBySession(sessionId) : Promise.resolve({ ok: false as const, data: [] }),
  ]);

  const guideName = await resolveGuideName(tour.guideId);

  // Map StudioScenes to POIs for the catalogue detail page
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
    id: tour.id,
    title: tour.title,
    slug: generateSlug(tour.title),
    city: tour.city,
    citySlug: generateSlug(tour.city),
    guideId: tour.guideId,
    guideName,
    description: tour.description || '',
    shortDescription: (tour.description || '').substring(0, 100),
    duration: tour.duration || 0,
    distance: tour.distance || 0,
    poiCount: tour.poiCount || 0,
    isFree: false,
    status: (tour.status || 'draft') as Tour['status'],
    availableLanguages: Array.isArray((tour as Record<string, unknown>).availableLanguages) ? (tour as Record<string, unknown>).availableLanguages as string[] : [(tour as Record<string, unknown>).language as string ?? 'fr'],
    createdAt: ((tour as Record<string, unknown>).createdAt as string) ?? '',
    languageAudioTypes: tour.sessionId ? await getLanguageAudioTypes(tour.sessionId) : {},
    pois,
    reviews: reviews.map((r: { id: string; userId: string; rating: number; comment?: string | null; visitedAt?: number | null; language?: string | null; createdAt: string }) => ({
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

// Cache cities within the same server render to avoid N+1
let _citiesCache: City[] | null = null;

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
  const tours = await appsync.listGuideTours({ status: 'published' });
  return Promise.all(
    tours.map(async (t) => ({
      id: t.id,
      title: t.title,
      slug: generateSlug(t.title),
      city: t.city,
      citySlug: generateSlug(t.city),
      guideId: t.guideId,
      guideName: await resolveGuideName(t.guideId),
      description: t.description || '',
      shortDescription: (t.description || '').substring(0, 100),
      duration: t.duration || 0,
      distance: t.distance || 0,
      poiCount: t.poiCount || 0,
      isFree: false, // isFree not in schema — requires future field addition
      status: (t.status || 'draft') as Tour['status'],
      availableLanguages: Array.isArray((t as Record<string, unknown>).availableLanguages) ? (t as Record<string, unknown>).availableLanguages as string[] : [(t as Record<string, unknown>).language as string ?? 'fr'],
      createdAt: ((t as Record<string, unknown>).createdAt as string) ?? '',
    })),
  );
}
