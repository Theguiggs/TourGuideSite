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
 * LA MODÉRATION S'Y AJOUTE, ET C'EST LE MÊME MÉCANISME. `profileStatus` et
 * `verified` ont quitté `$ownerAllowedFields0` eux aussi : un guide SUSPENDU se
 * remettait `active` en une mutation sur sa propre ligne, et n'importe quel guide
 * se décernait le badge « vérifié ». Un formulaire qui les enverrait EN
 * MODIFICATION recevrait `Unauthorized on [...]`. Seul le groupe `admin` les
 * écrit, par `adminUpdateGuideProfileStatus`, qui n'emprunte pas la fonction des
 * guides.
 *
 * ET À LA CRÉATION, `verified` NE PART PLUS. Le schéma lui laisse encore
 * `create` — une dette explicitement assumée dans
 * `amplify/data/guide-profile-model.ts`, laissée ouverte le temps que le portail
 * cesse de l'envoyer. C'est fait : la dernière épreuve du premier bloc l'épingle,
 * et c'est elle qui autorise le backend à retirer ce `create`.
 *
 * CE QUE CE FICHIER NE PROUVE PAS : il constate ce que le portail ENVOIE, jamais
 * ce qu'AppSync en fait. Le comportement du résolveur est établi par le VTL
 * synthétisé côté backend, pas ici.
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
// Import de TYPE seulement : effacé à l'exécution, donc `guide.ts` n'est jamais
// chargé ici. On n'éprouve que sa SIGNATURE, et c'est tout ce qui compte —
// c'est elle qui protège les écrans.
import type { updateGuideProfile } from '../guide';

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

  it("n'envoie PLUS `verified` — c'est ce qui libère le `create` du backend", async () => {
    // LE POINT DE BASCULE. Le schéma laisse encore `create` sur `verified`, et
    // UNIQUEMENT parce que le portail vivant envoyait `verified: false` : le
    // retirer avant cette passe aurait cassé l'inscription guide au déploiement.
    // La dette est écrite noir sur blanc dans
    // `amplify/data/guide-profile-model.ts` (« À retirer une fois le portail
    // passé »). Cette épreuve est la contrepartie : tant qu'elle est verte, le
    // backend peut retirer ce `create` sans rien casser.
    //
    // ET CE N'EST PAS UNE PERTE : `verified` est nullable, et TOUS ses lecteurs
    // (`guides-public.ts`, `guides-public-server.ts`, `guide.ts`,
    // `tours-server.ts`, l'écran admin) le lisent en `?? false`. L'absence et le
    // `false` se lisent donc exactement pareil.
    await createGuideProfileMutation({ userId: SUB, displayName: 'Guide', city: 'Biarritz' });

    expect(entree(mockCreate)).not.toHaveProperty('verified');
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

  it('LE TYPE l’interdit — première moitié de la barrière', () => {
    // Si `userId` réapparaissait dans le type des modifications, ce
    // `@ts-expect-error` deviendrait inutile et `tsc --noEmit` tomberait. C'est
    // ce qui protège les appelants TYPÉS ; le filtre à l'exécution, éprouvé plus
    // bas, protège les autres.
    const interdit = () =>
      updateGuideProfileMutation('profil-1', {
        // @ts-expect-error `userId` n'est pas modifiable : le backend répondrait
        // `Unauthorized on [userId]`.
        userId: SUB,
      });
    expect(typeof interdit).toBe('function');
  });
});

// ------------------------------------------------------------------
// LA MODÉRATION — `profileStatus` et `verified` en MODIFICATION.
//
// Ils ont quitté `$ownerAllowedFields0` avec le correctif : un guide SUSPENDU se
// remettait `active` en une mutation sur sa propre ligne, et n'importe quel guide
// se décernait le badge « vérifié ». Les envoyer ferait répondre
// `Unauthorized on [...]` et casserait la mutation ENTIÈRE, y compris les champs
// légitimes qui l'accompagnent.
// ------------------------------------------------------------------
describe('updateGuideProfileMutation — les champs de MODÉRATION ne partent jamais', () => {
  it("aucune modification d'écran ne les porte", async () => {
    await updateGuideProfileMutation('profil-1', {
      displayName: 'Nouveau nom',
      bio: 'Bonjour',
      city: 'Biarritz',
      specialties: ['a'],
      languages: ['fr'],
      yearsExperience: 3,
      photoUrl: 'k.jpg',
    });

    const input = entree(mockUpdate);
    expect(input).not.toHaveProperty('profileStatus');
    expect(input).not.toHaveProperty('verified');
  });

  it.each(['profileStatus', 'verified', 'userId'])(
    'REFUSE à l’exécution une entrée qui porte `%s`, et n’appelle même pas AppSync',
    async (champ) => {
      // LA MUTATION QUI FAIT TOMBER CETTE ÉPREUVE : retirer `champ` de
      // `CHAMPS_INTERDITS_EN_MODIFICATION`, ou le filtre entier.
      //
      // Le `as never` simule ce que le TYPE ne peut pas voir : `guide.ts`
      // reconstruit son entrée par `Object.fromEntries`, qui rend un
      // `{[k: string]: …}` — un champ ajouté là passerait la compilation.
      const resultat = await updateGuideProfileMutation('profil-1', {
        displayName: 'Nouveau nom',
        [champ]: champ === 'verified' ? true : 'active',
      } as never);

      expect(resultat.ok).toBe(false);
      expect(mockUpdate).not.toHaveBeenCalled();
    },
  );

  it("nomme le champ refusé — un « Unauthorized » d'AppSync ne dirait pas lequel", async () => {
    const resultat = await updateGuideProfileMutation('profil-1', {
      profileStatus: 'active',
      verified: true,
    } as never);

    expect(resultat).toMatchObject({ ok: false });
    expect((resultat as { error: string }).error).toContain('profileStatus');
    expect((resultat as { error: string }).error).toContain('verified');
  });

  it("LE TYPE les interdit AUSSI — c'est la moitié qui protège les écrans", () => {
    const statutInterdit = () =>
      updateGuideProfileMutation('profil-1', {
        // @ts-expect-error `profileStatus` n'est plus modifiable par le
        // propriétaire : seul le groupe `admin` l'écrit.
        profileStatus: 'active',
      });
    const badgeInterdit = () =>
      updateGuideProfileMutation('profil-1', {
        // @ts-expect-error `verified` n'est plus modifiable par le propriétaire :
        // c'est un signal de confiance public, réservé à l'admin.
        verified: true,
      });
    expect(typeof statutInterdit).toBe('function');
    expect(typeof badgeInterdit).toBe('function');
  });

  it("et `updateGuideProfile` (guide.ts) ne les expose pas davantage", () => {
    // La couche que les ÉCRANS appellent vraiment ; `updateGuideProfileMutation`
    // est en dessous. Son `Partial<Pick<GuideProfile, …>>` n'énumère que les
    // champs éditables : ajouter `profileStatus` ou `verified` à cette liste
    // rendrait ces `@ts-expect-error` inutiles, et `tsc --noEmit` tomberait.
    //
    // C'est la SEULE barrière de ce niveau-là : `updateGuideProfile` reconstruit
    // son entrée par `Object.fromEntries`, dont le type est un index de chaînes —
    // il ne transmet donc aucune contrainte à la couche du dessous.
    const interdits = (fn: typeof updateGuideProfile) => [
      // @ts-expect-error `profileStatus` n'est pas un champ éditable du profil :
      // seul le groupe `admin` l'écrit.
      () => fn('profil-1', { profileStatus: 'active' }),
      // @ts-expect-error `verified` n'est pas un champ éditable du profil : c'est
      // un signal de confiance public, réservé à l'admin.
      () => fn('profil-1', { verified: true }),
    ];
    expect(typeof interdits).toBe('function');
  });

  it("l’union littérale d’`adminUpdateGuideProfileStatus` est la DERNIÈRE garde du domaine", () => {
    // `profileStatus` est passé d'`a.enum()` à `a.string()` au schéma (Gen 2
    // refuse une autorisation de champ sur un enum, et c'est cette autorisation
    // qui retire `update` au propriétaire). Le type dérivé du schéma est donc
    // `string | null` : il n'écarte plus rien.
    //
    // Ce qui écarte encore une valeur hors domaine est cette union-ci, écrite à
    // la main. L'élargir en `string` ferait passer `'actif'`, `'Suspended'` ou
    // n'importe quoi — sans erreur nulle part, et avec pour seul effet visible un
    // guide dont le statut ne veut plus rien dire pour le juge.
    const horsDomaine = () =>
      // @ts-expect-error `'actif'` n'est pas un statut : le domaine est
      // `pending_moderation | active | suspended | rejected`.
      adminUpdateGuideProfileStatus('profil-1', 'actif');
    expect(typeof horsDomaine).toBe('function');
  });

  it("le passage ADMIN, lui, continue de passer — il ne traverse pas ce filtre", async () => {
    // C'est la contrepartie indispensable : une garde qui casserait la modération
    // ne serait pas une garde, mais une panne. `adminUpdateGuideProfileStatus`
    // appelle `GuideProfile.update` directement, en `userPool`, sous le groupe
    // `admin` — qui garde l'écriture au schéma.
    const resultat = await adminUpdateGuideProfileStatus('profil-1', 'suspended');

    expect(resultat.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(entree(mockUpdate)).toEqual({ id: 'profil-1', profileStatus: 'suspended' });
  });
});
