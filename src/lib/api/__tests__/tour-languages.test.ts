/**
 * « Langues déjà créées » sur la page Mes visites : lues depuis les Paires de
 * narration à la demande, jamais depuis l'ancien registre d'achats.
 */
jest.mock('@/config/api-mode', () => ({ shouldUseStubs: () => false }));

const listMock = jest.fn();
jest.mock('../appsync-client', () => ({
  getClient: () => ({ models: { Pair: { list: listMock } } }),
}));

import { listCreatedLanguagesByTour } from '../tour-languages';

beforeEach(() => listMock.mockReset());

describe('listCreatedLanguagesByTour', () => {
  it('ne compte que les Paires écoutables, groupées par visite, sur toutes les pages', async () => {
    listMock
      .mockResolvedValueOnce({
        data: [
          { tourId: 't1', language: 'en', state: 'ready' },
          { tourId: 't1', language: 'de', state: 'partially_ready' },
          { tourId: 't1', language: 'es', state: 'queued' },
          { tourId: 't1', language: 'it', state: 'failed' },
          { tourId: 't2', language: 'EN', state: 'ready' },
        ],
        nextToken: 'p2',
      })
      .mockResolvedValueOnce({
        data: [
          { tourId: 't1', language: 'EN', state: 'ready' },
          { tourId: 't3', language: 'nl', state: 'fabricating' },
        ],
        nextToken: null,
      });

    const byTour = await listCreatedLanguagesByTour();

    expect(byTour.get('t1')).toEqual(['en', 'de']);
    expect(byTour.get('t2')).toEqual(['en']);
    expect(byTour.has('t3')).toBe(false);
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock).toHaveBeenLastCalledWith({ nextToken: 'p2' });
  });

  it('rend une carte vide quand la lecture échoue : la liste des visites ne doit pas casser', async () => {
    listMock.mockRejectedValueOnce(new Error('Unauthorized'));
    await expect(listCreatedLanguagesByTour()).resolves.toEqual(new Map());
  });
});
