jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: jest.fn(() => false),
}));

jest.mock('../appsync-client', () => ({
  listGuideTours: jest.fn(),
  listGuideProfiles: jest.fn(),
  listTourReviews: jest.fn(),
  getTourStats: jest.fn(),
  getPublishedTourContent: jest.fn(),
}));

import * as appsync from '../appsync-client';
import { getAllToursWithCoords, getTourBySlug } from '../tours';

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

describe('published tour browser mappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(appsync.listGuideTours).mockResolvedValue([tour] as never);
    jest.mocked(appsync.listGuideProfiles).mockResolvedValue([
      { id: 'guide-1', displayName: 'Guide' },
    ] as never);
    jest.mocked(appsync.listTourReviews).mockResolvedValue([]);
    jest.mocked(appsync.getTourStats).mockResolvedValue(null);
    jest.mocked(appsync.getPublishedTourContent).mockResolvedValue({
      ok: true,
      data: content,
    });
  });

  it('maps the allowlisted facade into POIs and catalogue coordinates', async () => {
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

  it('propagates facade failures instead of rendering empty content', async () => {
    jest.mocked(appsync.getPublishedTourContent).mockResolvedValue({
      ok: false,
      error: 'Contenu public indisponible',
    });

    await expect(getTourBySlug('nice', 'visite-test')).rejects.toThrow(
      'Contenu public indisponible',
    );
    await expect(getAllToursWithCoords()).rejects.toThrow('Contenu public indisponible');
  });
});
