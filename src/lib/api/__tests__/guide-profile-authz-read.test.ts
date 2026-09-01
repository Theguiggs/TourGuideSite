/**
 * La LECTURE d'autorisation du portail — `listGuideProfilePageByUserId`.
 *
 * Le mock global d'`appsync-client` est levé ici : c'est la vraie implémentation
 * qu'on met à l'épreuve. Ce qui se joue :
 *
 *  1. la lecture passe par l'INDEX, pas par un balayage filtré — seul l'index
 *     rend le `nextToken` interprétable comme « il reste des lignes À CE SUB » ;
 *  2. AUCUN `selectionSet` explicite n'est passé — c'est le piège DORMANT :
 *     `owner` n'est pas dans `model_introspection.fields`, il n'arrive que par
 *     le jeu de sélection PAR DÉFAUT (`resolveOwnerFields`). Un `selectionSet`
 *     explicite le retirerait en silence et la comparaison porterait sur
 *     `undefined` — le juge verrouillerait TOUT LE MONDE ;
 *  3. une lecture en échec se distingue d'une lecture vide.
 */

jest.unmock('@/lib/api/appsync-client');

const mockIndexQuery = jest.fn();
const mockListScan = jest.fn();

jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    models: {
      GuideProfile: {
        listGuideProfileByUserId: (...a: unknown[]) => mockIndexQuery(...a),
        list: (...a: unknown[]) => mockListScan(...a),
      },
    },
  }),
}));

jest.mock('aws-amplify', () => ({
  Amplify: {
    getConfig: () => ({ API: { GraphQL: { endpoint: 'https://example.test/graphql' } } }),
  },
}));

jest.mock('@/lib/amplify/config', () => ({ configureAmplify: jest.fn() }));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import outputs from '../../../../amplify_outputs.json';
import { listGuideProfilePageByUserId } from '../appsync-client';
import { BORNE_LECTURE_PROFILS } from '@/lib/auth/guide-qualification';

const SUB = '4418d408-8091-7086-42d5-ff563a43379c';

/** Les options réellement transmises au client Amplify. */
function dernieresOptions(): Record<string, unknown> {
  return (mockIndexQuery.mock.calls.at(-1)?.[1] ?? {}) as Record<string, unknown>;
}

describe('listGuideProfilePageByUserId — la lecture qui nourrit le juge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIndexQuery.mockResolvedValue({ data: [], nextToken: null });
  });

  it("interroge l'INDEX par userId, et jamais le balayage filtré", async () => {
    await listGuideProfilePageByUserId(SUB, 'iam');

    expect(mockIndexQuery).toHaveBeenCalledTimes(1);
    expect(mockIndexQuery.mock.calls[0][0]).toEqual({ userId: SUB });
    // Un `list({filter})` est un BALAYAGE de table : son `nextToken` est non nul
    // dès que la TABLE dépasse une page, sans rapport avec les doublons.
    expect(mockListScan).not.toHaveBeenCalled();
  });

  it('borne la page et porte le mode IAM du portail', async () => {
    await listGuideProfilePageByUserId(SUB, 'iam');

    expect(dernieresOptions()).toEqual({ limit: BORNE_LECTURE_PROFILS, authMode: 'iam' });
  });

  // ------------------------------------------------------------------
  // LE PIÈGE DORMANT — `owner` doit rester dans le jeu de sélection.
  // ------------------------------------------------------------------
  it("ne passe AUCUN `selectionSet` explicite — sinon `owner` disparaîtrait", async () => {
    await listGuideProfilePageByUserId(SUB, 'iam');

    const options = dernieresOptions();
    if ('selectionSet' in options) {
      // Un `selectionSet` explicite reste permis, mais UNIQUEMENT s'il remet
      // `owner` : sans lui, le juge ne compare plus rien.
      expect(options.selectionSet).toContain('owner');
    } else {
      expect(options).not.toHaveProperty('selectionSet');
    }
  });

  it("`owner` n'est PAS un champ du modèle : il ne tient qu'à la règle d'auth", () => {
    // Les deux moitiés du piège, constatées sur le contrat réel du backend.
    const modele = (
      outputs as unknown as {
        data: {
          model_introspection: {
            models: {
              GuideProfile: {
                fields: Record<string, unknown>;
                attributes: Array<{ type: string; properties: Record<string, unknown> }>;
              };
            };
          };
        };
      }
    ).data.model_introspection.models.GuideProfile;

    // 1. Un `selectionSet` bâti sur les champs du modèle n'aurait PAS `owner`.
    expect(Object.keys(modele.fields)).not.toContain('owner');

    // 2. Il n'arrive dans le jeu de sélection par défaut que parce que
    //    `resolveOwnerFields` lit ce `ownerField` dans les règles d'auth.
    const reglesAuth = modele.attributes.find((a) => a.type === 'auth')?.properties as
      | { rules: Array<{ allow: string; ownerField?: string }> }
      | undefined;
    expect(reglesAuth?.rules.some((r) => r.allow === 'owner' && r.ownerField === 'owner')).toBe(
      true,
    );
  });

  it("l'index interrogé est bien celui que le backend expose", () => {
    const modele = (
      outputs as unknown as {
        data: {
          model_introspection: {
            models: {
              GuideProfile: {
                attributes: Array<{ type: string; properties: Record<string, unknown> }>;
              };
            };
          };
        };
      }
    ).data.model_introspection.models.GuideProfile;

    const index = modele.attributes.find(
      (a) => a.type === 'key' && (a.properties as { name?: string }).name === 'guideProfilesByUserId',
    )?.properties as { queryField?: string; fields?: string[] } | undefined;

    expect(index?.queryField).toBe('listGuideProfileByUserId');
    expect(index?.fields).toEqual(['userId']);
  });

  // ------------------------------------------------------------------
  // LA TRONCATURE ET L'ÉCHEC — deux choses différentes, et différentes du vide.
  // ------------------------------------------------------------------
  it('déclare la vue tronquée dès que le nextToken est non nul', async () => {
    mockIndexQuery.mockResolvedValue({
      data: [{ owner: `${SUB}::${SUB}`, profileStatus: 'active' }],
      nextToken: 'encore-des-lignes',
    });

    await expect(listGuideProfilePageByUserId(SUB, 'iam')).resolves.toMatchObject({
      ok: true,
      tronquee: true,
    });
  });

  it('une page complète et vide reste une lecture RÉUSSIE, pas un échec', async () => {
    await expect(listGuideProfilePageByUserId(SUB, 'iam')).resolves.toEqual({
      ok: true,
      lignes: [],
      tronquee: false,
    });
  });

  it("des erreurs GraphQL ne se déguisent pas en « aucun profil »", async () => {
    mockIndexQuery.mockResolvedValue({ data: [], errors: [{ message: 'Unauthorized' }] });

    await expect(listGuideProfilePageByUserId(SUB, 'iam')).resolves.toMatchObject({ ok: false });
  });

  it('une exception réseau non plus', async () => {
    mockIndexQuery.mockRejectedValue(new Error('ECONNRESET'));

    await expect(listGuideProfilePageByUserId(SUB, 'iam')).resolves.toMatchObject({ ok: false });
  });
});
