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

import * as publicApi from '../appsync-server-public';
import { getAllToursWithCoords, getTourBySlug, getToursByCity } from '../tours-server';

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

  it('propagates facade failures during SSR', async () => {
    jest.mocked(publicApi.getPublishedTourContentServer).mockResolvedValue({
      ok: false,
      error: 'Contenu public indisponible',
    });

    await expect(getTourBySlug('nice', 'visite-test')).rejects.toThrow(
      'Contenu public indisponible',
    );
    await expect(getAllToursWithCoords()).rejects.toThrow('Contenu public indisponible');
  });
});
