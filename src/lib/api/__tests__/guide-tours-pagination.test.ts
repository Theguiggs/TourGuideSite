/**
 * Régression 2026-09-11 : le compte guide n'affichait que 100 visites sur 118.
 *
 * `GuideTour.list` rend une page par appel (100 lignes lues, filtre appliqué
 * après). Sans boucle sur `nextToken`, tout ce qui dépasse la première page
 * disparaît silencieusement. Ce test rejoue la table réelle : deux pages,
 * 118 visites du même guide, et exige que toutes arrivent à l'écran.
 */
import { paginateAll } from '../paginate';

jest.mock('@/config/api-mode', () => ({ shouldUseStubs: () => false }));

const listMock = jest.fn();
jest.mock('../appsync-client', () => ({
  getClient: () => ({ models: { GuideTour: { list: listMock } } }),
  listGuideTours: jest.fn(),
  createGuideTourMutation: jest.fn(),
}));

import { getGuideTours } from '../guide';

const GUIDE_ID = '159473d2-8509-4d01-aa14-180d87772225';
const tour = (i: number) => ({
  id: `seed-${i}`, guideId: GUIDE_ID, title: `Visite ${i}`, city: 'Nice', status: 'draft', sessionId: `s-${i}`,
});

describe('paginateAll', () => {
  it('suit nextToken jusqu\'à épuisement et concatène les pages dans l\'ordre', async () => {
    const pages = [
      { data: [1, 2], nextToken: 'p2' },
      { data: [3], nextToken: 'p3' },
      { data: [4, 5], nextToken: null },
    ];
    const fetcher = jest.fn(async (token: string | null | undefined) => {
      if (!token) return pages[0];
      return token === 'p2' ? pages[1] : pages[2];
    });

    await expect(paginateAll(fetcher)).resolves.toEqual([1, 2, 3, 4, 5]);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.map((c) => c[0])).toEqual([null, 'p2', 'p3']);
  });

  it('tolère une page sans data', async () => {
    await expect(paginateAll(async () => ({ data: undefined as unknown as number[] }))).resolves.toEqual([]);
  });
});

describe('getGuideTours — table de plus d\'une page', () => {
  beforeEach(() => listMock.mockReset());

  it('rend les 118 visites du guide, pas seulement la première page de 100', async () => {
    const all = Array.from({ length: 118 }, (_, i) => tour(i + 1));
    listMock
      .mockResolvedValueOnce({ data: all.slice(0, 100), nextToken: 'page-2' })
      .mockResolvedValueOnce({ data: all.slice(100), nextToken: null });

    const tours = await getGuideTours(GUIDE_ID);

    expect(tours).toHaveLength(118);
    expect(tours.map((t) => t.id)).toEqual(all.map((t) => t.id));
    expect(listMock).toHaveBeenCalledTimes(2);
    // La seconde requête repart bien du jeton rendu par la première, avec le même filtre.
    expect(listMock.mock.calls[1][0]).toMatchObject({
      filter: { guideId: { eq: GUIDE_ID } },
      authMode: 'userPool',
      nextToken: 'page-2',
    });
  });

  it('une seule page : un seul appel, aucun jeton envoyé', async () => {
    listMock.mockResolvedValueOnce({ data: [tour(1)], nextToken: null });

    const tours = await getGuideTours(GUIDE_ID);

    expect(tours).toHaveLength(1);
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock.mock.calls[0][0].nextToken).toBeUndefined();
  });
});
