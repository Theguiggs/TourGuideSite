import {
  mapWithConcurrency,
  parsePublishedTourContent,
  queryPublishedTourContent,
  type PublishedTourContentQueryClient,
} from '../published-tour-content';
import outputs from '../../../../amplify_outputs.json';

describe('parsePublishedTourContent', () => {
  it('normalizes the allowlisted public contract', () => {
    expect(
      parsePublishedTourContent({
        tourId: 'tour-1',
        scenes: [
          {
            id: 'scene-1',
            order: 1,
            title: 'Place',
            description: 'Description',
            audioKey: null,
            photos: ['photo.jpg'],
            latitude: 43.7,
            longitude: 7.2,
          },
        ],
        walkPath: [{ latitude: 43.7, longitude: 7.2 }],
      }),
    ).toEqual({
      tourId: 'tour-1',
      scenes: [
        {
          id: 'scene-1',
          order: 1,
          title: 'Place',
          description: 'Description',
          photos: ['photo.jpg'],
          latitude: 43.7,
          longitude: 7.2,
        },
      ],
      walkPath: [{ latitude: 43.7, longitude: 7.2 }],
    });
  });

  it.each([
    null,
    {
      tourId: 'tour-1',
      scenes: [{ id: 'scene-1', order: 1, title: 'Place', description: '', photos: 'secret' }],
      walkPath: [],
    },
    {
      tourId: 'tour-1',
      scenes: [],
      walkPath: [{ latitude: '43.7', longitude: 7.2 }],
    },
    {
      tourId: 'tour-1',
      scenes: [],
      walkPath: [{ latitude: 91, longitude: 7.2 }],
    },
    {
      tourId: 'tour-1',
      scenes: [
        {
          id: 'scene-1',
          order: 1,
          title: 'Place',
          description: '',
          photos: [],
          latitude: 43.7,
        },
      ],
      walkPath: [],
    },
  ])('rejects malformed or expanded payloads', (value) => {
    expect(parsePublishedTourContent(value)).toBeNull();
  });

  it('queries by tourId and rejects AppSync errors or mismatched tours', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        data: { tourId: 'tour-1', scenes: [], walkPath: [] },
      })
      .mockResolvedValueOnce({ data: null, errors: [{ message: 'Denied' }] })
      .mockResolvedValueOnce({
        data: { tourId: 'tour-2', scenes: [], walkPath: [] },
      });
    const client = {
      queries: { getPublishedTourContent: query },
    } as PublishedTourContentQueryClient;

    await expect(queryPublishedTourContent(client, 'tour-1')).resolves.toMatchObject({
      tourId: 'tour-1',
    });
    await expect(queryPublishedTourContent(client, 'tour-1')).rejects.toThrow('Denied');
    await expect(queryPublishedTourContent(client, 'tour-1')).rejects.toThrow(
      'Invalid published tour content response',
    );
    expect(query).toHaveBeenNthCalledWith(
      1,
      { tourId: 'tour-1' },
      { authMode: 'identityPool' },
    );
  });

  it('reste anonyme par défaut, et ne porte une identité que si on la lui donne', async () => {
    // Le rendu serveur n'appelle jamais avec un mode : il DOIT rester public.
    // Seul le chemin navigateur, qui a des jetons, demande `userPool` — le seul
    // mode qui fasse arriver un `sub` jusqu'à `isEntitled` côté Lambda.
    const query = jest
      .fn()
      .mockResolvedValue({ data: { tourId: 'tour-1', scenes: [], walkPath: [] } });
    const client = {
      queries: { getPublishedTourContent: query },
    } as PublishedTourContentQueryClient;

    await queryPublishedTourContent(client, 'tour-1');
    await queryPublishedTourContent(client, 'tour-1', 'userPool');
    await queryPublishedTourContent(client, 'tour-1', 'identityPool');

    expect(query.mock.calls.map((call) => call[1])).toEqual([
      { authMode: 'identityPool' },
      { authMode: 'userPool' },
      { authMode: 'identityPool' },
    ]);
  });

  it('bounds concurrent catalogue projections while preserving order', async () => {
    let active = 0;
    let maxActive = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });

    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(maxActive).toBe(2);
  });
});

describe('published media URL parsing', () => {
  it('keeps only valid HTTPS media URLs from the facade', () => {
    expect(
      parsePublishedTourContent({
        tourId: 'tour-media',
        coverUrl: 'https://media.example/cover.jpg?signature=server',
        mediaExpiresAt: '2026-09-07T12:15:00.000Z',
        scenes: [
          {
            id: 'scene-1',
            order: 1,
            title: 'Place',
            description: 'Description',
            audioKey: 'guide-studio/guide/audio.wav',
            audioUrl: 'https://media.example/audio.wav?signature=server',
            photos: ['guide-photos/guide/photo.jpg'],
            photoUrls: [
              'https://media.example/photo.jpg?signature=server',
              'javascript:alert(1)',
            ],
            translatedAudioUrls: JSON.stringify({
              de: 'https://media.example/de.wav?signature=server',
              en: 'http://media.example/insecure.wav',
            }),
          },
        ],
        walkPath: [],
      }),
    ).toMatchObject({
      coverUrl: 'https://media.example/cover.jpg?signature=server',
      mediaExpiresAt: '2026-09-07T12:15:00.000Z',
      scenes: [
        expect.objectContaining({
          audioUrl: 'https://media.example/audio.wav?signature=server',
          photoUrls: ['https://media.example/photo.jpg?signature=server'],
          translatedAudioUrls: { de: 'https://media.example/de.wav?signature=server' },
        }),
      ],
    });
  });

  it('includes the media fields in the generated client selection model', () => {
    const nonModels = outputs.data.model_introspection.nonModels;
    expect(Object.keys(nonModels.PublicTourScene.fields)).toEqual(
      expect.arrayContaining(['audioUrl', 'photoUrls', 'translatedAudioUrls']),
    );
    expect(Object.keys(nonModels.PublishedTourContent.fields)).toEqual(
      expect.arrayContaining(['coverUrl', 'mediaExpiresAt']),
    );
  });
});
