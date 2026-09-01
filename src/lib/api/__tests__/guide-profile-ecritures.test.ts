/**
 * Les ÉCRITURES de `GuideProfile` face au verrou de champ posé sur `userId`.
 *
 * Le correctif backend donne à `userId` une autorisation AU NIVEAU DU CHAMP :
 * `.to(['create','read'])`, SANS `update`. Deux conséquences, silencieuses
 * toutes les deux, et c'est pour cela que ce fichier existe :
 *
 *  1. À LA CRÉATION, `input.userId` doit valoir EXACTEMENT le `sub` de l'appelant.
 *     Le VTL compare `$ctx.args.input.userId == $ctx.identity.claims.get("sub")`
 *     avec une liste de revendications de repli VIDE : ni `username`, ni
 *     `sub::username`, ni rien d'autre ne passe — `$util.unauthorized()`. Et il
 *     faut le mode `userPool` : en IAM le bloc de propriété est court-circuité,
 *     donc rien ne serait vérifié.
 *  2. À LA MODIFICATION, une entrée qui PORTE `userId` reçoit
 *     `Unauthorized on [userId]`, MÊME AVEC LA BONNE VALEUR — le champ n'est plus
 *     dans `$ownerAllowedFields0`. Une mutation d'écran qui renverrait
 *     bêtement tout le profil casserait donc l'édition de profil entière.
 *
 * CE QUE CE FICHIER NE PROUVE PAS : il constate ce que le portail ENVOIE, jamais
 * ce qu'AppSync en fait. Le comportement du résolveur est établi par le VTL
 * synthétisé côté backend, pas ici. Et il ne couvre pas les appelants non typés :
 * la barrière contre `userId` en modification est de nature TYPE (voir la dernière
 * épreuve), pas un filtre à l'exécution.
 */

jest.unmock('@/lib/api/appsync-client');

const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    models: {
      GuideProfile: {
        create: (...a: unknown[]) => mockCreate(...a),
        update: (...a: unknown[]) => mockUpdate(...a),
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

import {
  adminUpdateGuideProfileStatus,
  createGuideProfileMutation,
  updateGuideProfileMutation,
} from '../appsync-client';
import { PARC_VIVANT } from '@/lib/auth/__tests__/parc-vivant';

/** Un `sub` réel : la valeur que le résolveur comparera à `$ctx.identity.claims.sub`. */
const SUB = PARC_VIVANT[1].sub;

const entree = (mock: jest.Mock) => (mock.mock.calls.at(-1)?.[0] ?? {}) as Record<string, unknown>;
const options = (mock: jest.Mock) => (mock.mock.calls.at(-1)?.[1] ?? {}) as Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({ data: { id: 'nouveau' } });
  mockUpdate.mockResolvedValue({ data: { id: 'nouveau' } });
});

describe('createGuideProfileMutation — `userId` doit valoir le `sub`, NU', () => {
  it('transmet le `sub` TEL QUEL, sans le composer ni le préfixer', async () => {
    await createGuideProfileMutation({ userId: SUB, displayName: 'Guide', city: 'Biarritz' });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    // Égalité stricte : c'est exactement ce que compare le résolveur.
    expect(entree(mockCreate).userId).toBe(SUB);
    // Et surtout PAS la forme composite qu'écrivait `allow.owner()`.
    expect(entree(mockCreate).userId).not.toBe(`${SUB}::${SUB}`);
  });

  it('appelle en mode `userPool` — en IAM, le bloc de propriété serait court-circuité', async () => {
    await createGuideProfileMutation({ userId: SUB, displayName: 'Guide', city: 'Biarritz' });

    expect(options(mockCreate)).toMatchObject({ authMode: 'userPool' });
  });

  it("n'envoie AUCUN champ `owner` — il n'existe plus dans l'entrée du modèle", async () => {
    await createGuideProfileMutation({ userId: SUB, displayName: 'Guide', city: 'Biarritz' });

    expect(entree(mockCreate)).not.toHaveProperty('owner');
  });

  it('pose le profil en modération, jamais actif d’emblée', async () => {
    // Sans quoi l'inscription guide s'auto-approuverait : le juge ne ferme QUE
    // l'usurpation, la modération est ce qui borne l'inscription.
    await createGuideProfileMutation({ userId: SUB, displayName: 'Guide', city: 'Biarritz' });

    expect(entree(mockCreate).profileStatus).toBe('pending_moderation');
  });
});

describe('updateGuideProfileMutation — `userId` ne doit JAMAIS partir', () => {
  it("n'envoie pas `userId` sur une modification d'écran ordinaire", async () => {
    await updateGuideProfileMutation('profil-1', {
      displayName: 'Nouveau nom',
      bio: 'Bonjour',
      city: 'Biarritz',
    });

    const input = entree(mockUpdate);
    // Le champ est hors de `$ownerAllowedFields0` : l'envoyer, même avec la bonne
    // valeur, ferait répondre `Unauthorized on [userId]` et casserait l'édition.
    expect(input).not.toHaveProperty('userId');
    expect(input).not.toHaveProperty('owner');
    expect(input).toMatchObject({ id: 'profil-1', displayName: 'Nouveau nom' });
  });

  it('ne l’envoie pas davantage quand tous les champs éditables sont fournis', async () => {
    await updateGuideProfileMutation('profil-1', {
      displayName: 'N',
      bio: 'B',
      city: 'C',
      specialties: ['a'],
      languages: ['fr'],
      yearsExperience: 3,
      photoUrl: 'k.jpg',
    });

    expect(entree(mockUpdate)).not.toHaveProperty('userId');
  });

  it('le passage admin par le statut ne l’envoie pas non plus', async () => {
    await adminUpdateGuideProfileStatus('profil-1', 'active');

    const input = entree(mockUpdate);
    expect(input).toEqual({ id: 'profil-1', profileStatus: 'active' });
    expect(options(mockUpdate)).toMatchObject({ authMode: 'userPool' });
  });

  it('LE TYPE l’interdit — c’est là qu’est la barrière, pas à l’exécution', () => {
    // Si `userId` réapparaissait dans le type des modifications, ce
    // `@ts-expect-error` deviendrait inutile et `tsc --noEmit` tomberait. C'est
    // la seule chose qui empêche un appelant d'envoyer le champ : la fonction ne
    // filtre RIEN à l'exécution.
    const interdit = () =>
      updateGuideProfileMutation('profil-1', {
        // @ts-expect-error `userId` n'est pas modifiable : le backend répondrait
        // `Unauthorized on [userId]`.
        userId: SUB,
      });
    expect(typeof interdit).toBe('function');
  });
});
