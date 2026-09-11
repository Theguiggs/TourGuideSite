jest.mock('server-only', () => ({}), { virtual: true });

jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: jest.fn(() => false),
}));

jest.mock('../appsync-server-public', () => ({
  listGuideToursServer: jest.fn(),
  listGuideProfilesServer: jest.fn(),
  listTourReviewsServer: jest.fn(),
  getTourStatsServer: jest.fn(),
  getPublishedTourContentServer: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import * as publicApi from '../appsync-server-public';
import { getAllToursWithCoords, getTourBySlug, getToursByCity } from '../tours-server';
import { clearCache } from '@/lib/server/ttl-cache';

const tour = {
  id: 'tour-1',
  title: 'Visite test',
  city: 'Nice',
  guideId: 'guide-1',
  status: 'published',
  description: 'Description',
  availableLanguages: ['fr'],
  languageAudioTypes: { fr: 'recording' },
};

const content = {
  tourId: 'tour-1',
  scenes: [
    {
      id: 'scene-1',
      order: 1,
      title: 'Promenade',
      description: 'Description approuvée',
      photos: ['photo.jpg'],
      latitude: 43.7,
      longitude: 7.2,
    },
  ],
  walkPath: [],
};

describe('published tour SSR mappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
    jest.mocked(publicApi.listGuideToursServer).mockResolvedValue([tour] as never);
    jest.mocked(publicApi.listGuideProfilesServer).mockResolvedValue([
      { id: 'guide-1', displayName: 'Guide' },
    ] as never);
    jest.mocked(publicApi.listTourReviewsServer).mockResolvedValue([]);
    jest.mocked(publicApi.getTourStatsServer).mockResolvedValue(null);
    jest.mocked(publicApi.getPublishedTourContentServer).mockResolvedValue({
      ok: true,
      data: content,
    });
  });

  it('maps the facade identically during SSR', async () => {
    await expect(getTourBySlug('nice', 'visite-test')).resolves.toMatchObject({
      pois: [
        {
          id: 'scene-1',
          title: 'Promenade',
          description: 'Description approuvée',
          latitude: 43.7,
          longitude: 7.2,
        },
      ],
    });
    await expect(getAllToursWithCoords()).resolves.toEqual([
      expect.objectContaining({ id: 'tour-1', latitude: 43.7, longitude: 7.2 }),
    ]);
  });

  it('uses the approved languages persisted on GuideTour during SSR', async () => {
    jest.mocked(publicApi.listGuideToursServer).mockResolvedValue([
      { ...tour, availableLanguages: ['fr', 'en', 'es', 'de', 'it'] },
    ] as never);

    await expect(getToursByCity('nice')).resolves.toEqual([
      expect.objectContaining({ availableLanguages: ['fr', 'en', 'es', 'de', 'it'] }),
    ]);
  });

  it('ne fabrique aucune langue que la Visite ne vend pas', async () => {
    // `GuideTour` ne porte pas de champ `language` : le 'fr' de repli préfixait
    // une langue fantôme, désormais déclarée « voix de synthèse » à l'affichage.
    jest.mocked(publicApi.listGuideToursServer).mockResolvedValue([
      { ...tour, availableLanguages: ['en'], languageAudioTypes: { en: 'recording' } },
    ] as never);

    await expect(getToursByCity('nice')).resolves.toEqual([
      expect.objectContaining({ availableLanguages: ['en'] }),
    ]);
  });

  it('retombe sur le français, jamais sur [undefined], quand rien n est persisté', async () => {
    jest.mocked(publicApi.listGuideToursServer).mockResolvedValue([
      { ...tour, availableLanguages: undefined },
    ] as never);

    await expect(getToursByCity('nice')).resolves.toEqual([
      expect.objectContaining({ availableLanguages: ['fr'] }),
    ]);
  });

  // Lot 3.2 — une fiche dont le contenu public est indisponible se rend quand
  // même (titre, prix, guide, avis) et annonce l'itinéraire indisponible ; la
  // carte du catalogue garde la visite, sans position. Plus aucun 500.
  it('degrades instead of failing when the published content is unavailable', async () => {
    jest.mocked(publicApi.getPublishedTourContentServer).mockResolvedValue({
      ok: false,
      error: 'Contenu public indisponible',
    });

    await expect(getTourBySlug('nice', 'visite-test')).resolves.toMatchObject({
      id: 'tour-1',
      title: 'Visite test',
      pois: [],
      contentUnavailable: true,
    });
    const withCoords = await getAllToursWithCoords();
    expect(withCoords).toHaveLength(1);
    expect(withCoords[0].id).toBe('tour-1');
    expect(withCoords[0].latitude).toBeUndefined();
    expect(withCoords[0].longitude).toBeUndefined();
  });

  it('reads the published list once per request burst (cache + in-flight dedup)', async () => {
    await Promise.all([getToursByCity('nice'), getTourBySlug('nice', 'visite-test'), getAllToursWithCoords()]);
    expect(publicApi.listGuideToursServer).toHaveBeenCalledTimes(1);
    expect(publicApi.listGuideProfilesServer).toHaveBeenCalledTimes(1);
  });

  it('uses the persisted cover photo for cards without calling the published content', async () => {
    jest.mocked(publicApi.listGuideToursServer).mockResolvedValue([
      { ...tour, sessionId: 'session-1', coverPhotoKey: 'guide-studio/id/session-1/cover.jpg' },
    ] as never);
    const [card] = await getToursByCity('nice');
    expect(card.imageUrl).toBe('guide-studio/id/session-1/cover.jpg');
    expect(publicApi.getPublishedTourContentServer).not.toHaveBeenCalled();
  });

  it('keeps a tour whose image lookup fails instead of dropping the whole city', async () => {
    jest.mocked(publicApi.listGuideToursServer).mockResolvedValue([
      tour,
      { ...tour, id: 'tour-2', title: 'Visite cassée', sessionId: 's2' },
    ] as never);
    jest.mocked(publicApi.getPublishedTourContentServer).mockImplementation(async (id: string) => {
      if (id === 'tour-2') throw new Error('boom');
      return { ok: true as const, data: content };
    });
    const tours = await getToursByCity('nice');
    // Triées par titre : « Visite cassée » avant « Visite test ». Les deux sont là.
    expect(tours.map((t) => t.id)).toEqual(['tour-2', 'tour-1']);
    expect(tours.find((t) => t.id === 'tour-2')?.imageUrl).toBeUndefined();
  });

  it('gives two tours with the same title in the same city distinct, reachable slugs', async () => {
    jest.mocked(publicApi.listGuideToursServer).mockResolvedValue([
      { ...tour, id: 'tour-b', createdAt: '2026-02-01' },
      { ...tour, id: 'tour-a', createdAt: '2026-01-01' },
    ] as never);
    const tours = await getToursByCity('nice');
    expect(tours.map((t) => [t.id, t.slug]).sort()).toEqual([
      ['tour-a', 'visite-test'],
      ['tour-b', 'visite-test-2'],
    ]);
    await expect(getTourBySlug('nice', 'visite-test-2')).resolves.toMatchObject({ id: 'tour-b' });
  });
});
