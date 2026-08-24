/**
 * Qui demande le contenu publié — le chemin navigateur.
 *
 * Le Lambda ne reçoit un `sub` Cognito QUE sur un appel `userPool` : c'est la
 * seule façon pour lui de savoir si le demandeur porte un droit (achat à l'unité
 * ou forfait). Un appel `identityPool` est un appel anonyme, et se fait tronquer.
 *
 * Le mock global d'`appsync-client` est levé ici : c'est la vraie implémentation
 * qu'on met à l'épreuve.
 */

jest.unmock('@/lib/api/appsync-client');

const mockQuery = jest.fn();
const mockFetchAuthSession = jest.fn();

jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    queries: { getPublishedTourContent: (...a: unknown[]) => mockQuery(...a) },
  }),
}));

jest.mock('aws-amplify', () => ({
  Amplify: {
    getConfig: () => ({ API: { GraphQL: { endpoint: 'https://example.test/graphql' } } }),
  },
}));

jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: (...a: unknown[]) => mockFetchAuthSession(...a),
}));

jest.mock('@/lib/amplify/config', () => ({ configureAmplify: jest.fn() }));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { getPublishedTourContent } from '../appsync-client';

const CONTENT = { tourId: 'tour-1', scenes: [], walkPath: [] };

/** Le mode d'auth du dernier appel réellement parti vers AppSync. */
function lastAuthMode(): unknown {
  return mockQuery.mock.calls.at(-1)?.[1];
}

describe('getPublishedTourContent — identité de la requête', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ data: CONTENT });
  });

  it('signe la requête quand le visiteur est authentifié', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: { accessToken: { payload: {} } } });

    await expect(getPublishedTourContent('tour-1')).resolves.toMatchObject({ ok: true });

    expect(lastAuthMode()).toEqual({ authMode: 'userPool' });
  });

  it('reste anonyme sans session — le rendu public, inchangé', async () => {
    mockFetchAuthSession.mockResolvedValue({});

    await expect(getPublishedTourContent('tour-1')).resolves.toMatchObject({ ok: true });

    expect(lastAuthMode()).toEqual({ authMode: 'identityPool' });
  });

  it('retombe sur l’anonyme si la session est illisible, sans casser la lecture', async () => {
    mockFetchAuthSession.mockRejectedValue(new Error('token expired'));

    await expect(getPublishedTourContent('tour-1')).resolves.toMatchObject({ ok: true });

    expect(lastAuthMode()).toEqual({ authMode: 'identityPool' });
  });

  it('ne casse pas la page quand la requête elle-même échoue', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: { accessToken: { payload: {} } } });
    mockQuery.mockRejectedValue(new Error('network'));

    await expect(getPublishedTourContent('tour-1')).resolves.toEqual({
      ok: false,
      error: 'Contenu public indisponible',
    });
  });
});
