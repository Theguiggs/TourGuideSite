import {
  mapWithConcurrency,
  parsePublishedTourContent,
  queryPublishedTourContent,
  type PublishedTourContentQueryClient,
} from '../published-tour-content';

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
