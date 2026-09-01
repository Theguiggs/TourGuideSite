/** @jest-environment node */

import { NextRequest } from 'next/server';

const mockVerifyJwt = jest.fn();
const mockListGuideProfilePageByUserId = jest.fn();

jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn(() => ({ verify: mockVerifyJwt })),
  },
}));
jest.mock('@/lib/api/appsync-client', () => ({
  listGuideProfilePageByUserId: (...args: unknown[]) => mockListGuideProfilePageByUserId(...args),
}));

import {
  __resetServerRoleCacheForTests,
  requireServerRole,
  ServerAuthError,
  verifyServerToken,
} from '../server-token';

// Le relevé du vivant est UNIQUE et partagé — DEUX guides, pas trois.
// Voir `./parc-vivant.ts`.
import { PARC_VIVANT } from './parc-vivant';

const ATTAQUANT = 'attaquant-sub-2222-3333';

/**
 * Une ligne telle que le client la rend DEPUIS LA BASCULE : `userId` nu, et pas
 * de `owner` — `resolveOwnerFields` rend `['userId']`, donc `owner` n'est plus
 * dans le jeu de sélection par défaut. Une ligne qui en porterait un ici
 * mentirait sur la production.
 */
const propre = (sub: string, profileStatus = 'active') => ({
  userId: sub,
  profileStatus,
});
const page = (lignes: unknown[], tronquee = false) => ({ ok: true, lignes, tronquee });

const requete = (jeton = 'valid') =>
  new NextRequest('http://localhost/protected', {
    headers: { Authorization: `Bearer ${jeton}` },
  });

describe('server Cognito token verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetServerRoleCacheForTests();
    mockListGuideProfilePageByUserId.mockResolvedValue(page([]));
  });

  it('rejects a missing bearer token', async () => {
    await expect(
      verifyServerToken(new NextRequest('http://localhost/protected')),
    ).rejects.toMatchObject<Partial<ServerAuthError>>({ status: 401 });
    expect(mockVerifyJwt).not.toHaveBeenCalled();
  });

  it('rejects a token that fails signature or claim verification', async () => {
    mockVerifyJwt.mockRejectedValue(new Error('invalid signature'));
    await expect(verifyServerToken(requete('forged'))).rejects.toMatchObject<
      Partial<ServerAuthError>
    >({ status: 401 });
  });

  it('rejects a verified tourist from a guide route', async () => {
    mockVerifyJwt.mockResolvedValue({ sub: 'tourist-1', 'cognito:groups': [] });
    await expect(requireServerRole(requete(), ['guide', 'admin'])).rejects.toMatchObject<
      Partial<ServerAuthError>
    >({ status: 403 });
    expect(mockListGuideProfilePageByUserId).toHaveBeenCalledWith('tourist-1', 'iam');
  });

  // ------------------------------------------------------------------
  // LE GROUPE `admin` — LE COURT-CIRCUIT A DISPARU, PAS SON RÉSULTAT.
  //
  // L'épreuve qui tenait ici s'appelait « recognizes an admin group WITHOUT a
  // profile lookup » et ÉPINGLAIT le court-circuit
  // `if (groups.includes('admin')) return ['admin','guide']`, placé avant le
  // juge. C'est ce court-circuit qui faisait prononcer `guide` à un autre
  // endroit que sur mobile, et diverger les deux surfaces sans que rien ne
  // tombe. Il est parti ; la règle vit désormais DANS le juge
  // (`GROUPE_PERSONNEL`, avant la disqualification).
  //
  // L'épreuve est donc RÉEXPRIMÉE, pas supprimée : ce qui est épinglé n'est plus
  // « on ne lit pas le profil », c'est « on le lit, et le verdict est le même ».
  // ------------------------------------------------------------------
  it('un admin SANS `GuideProfile` obtient `admin` ET `guide` — par le juge, pas avant lui', async () => {
    mockVerifyJwt.mockResolvedValue({ sub: 'admin-1', 'cognito:groups': ['admin'] });
    mockListGuideProfilePageByUserId.mockResolvedValue(page([]));

    const verified = await requireServerRole(requete(), ['admin']);

    expect(verified.roles).toEqual(['admin', 'guide']);
    // LA MUTATION QUI FAIT TOMBER CETTE LIGNE : remettre le court-circuit. Le
    // profil ne serait plus lu, `guide` serait prononcé hors du juge, et la
    // divergence avec le mobile se rouvrirait en silence.
    expect(mockListGuideProfilePageByUserId).toHaveBeenCalledWith('admin-1', 'iam');
  });

  it('un admin DISQUALIFIÉ garde `admin` ET `guide` — la précédence est dans le juge', async () => {
    // `admin` est une appartenance posée par Cognito, pas un statut de profil :
    // un admin qui modère sa propre ligne ne doit pas se retirer ses fonctions.
    // La mutation qui fait tomber ceci : déplacer `GROUPE_PERSONNEL` APRÈS le
    // test de disqualification dans `roleGuide`.
    mockVerifyJwt.mockResolvedValue({ sub: 'admin-1', 'cognito:groups': ['admin'] });
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre('admin-1', 'suspended')]));

    const verified = await requireServerRole(requete(), ['admin']);
    expect(verified.roles).toEqual(['admin', 'guide']);
  });

  it('un admin garde ses deux rôles même sur lecture RATÉE', async () => {
    // Le non-verdict ne renverse rien : le groupe se suffit à lui-même. C'est ce
    // que faisait le court-circuit, et il ne faut pas le perdre en le retirant.
    mockVerifyJwt.mockResolvedValue({ sub: 'admin-1', 'cognito:groups': ['admin'] });
    mockListGuideProfilePageByUserId.mockResolvedValue({ ok: false, erreur: 'AppSync 5xx' });

    const verified = await requireServerRole(requete(), ['admin']);
    expect(verified.roles).toEqual(['admin', 'guide']);
  });

  it("un admin qui EST aussi un guide réel n'obtient pas `guide` en double", async () => {
    const sub = PARC_VIVANT[1].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': ['admin'] });
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(sub)]));

    const verified = await requireServerRole(requete(), ['admin']);
    expect(verified.roles).toEqual(['admin', 'guide']);
  });

  it("le groupe `admin` NE se déduit PAS d'un profil : un guide réel n'est pas admin", async () => {
    // Le sens inverse de la précédence — sans quoi `composeRoles` accorderait
    // l'administration à quiconque possède une ligne active.
    const sub = PARC_VIVANT[0].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(sub)]));

    const verified = await verifyServerToken(requete());
    expect(verified.roles).toEqual(['guide']);
    await expect(requireServerRole(requete(), ['admin'])).rejects.toMatchObject<
      Partial<ServerAuthError>
    >({ status: 403 });
  });

  // ------------------------------------------------------------------
  // CONTRÔLE NÉGATIF — les guides réels gardent leur rôle. Un correctif de
  // sécurité qui casse les comptes légitimes est un incident, pas un correctif.
  // ------------------------------------------------------------------
  it.each(PARC_VIVANT)('le guide réel $nom garde son rôle', async ({ sub }) => {
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(sub)]));

    const verified = await requireServerRole(requete(), ['guide', 'admin']);
    expect(verified.roles).toEqual(['guide']);
  });

  it.each(['suspended', 'rejected'])('rejects a %s guide profile', async (profileStatus) => {
    const sub = PARC_VIVANT[0].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(sub, profileStatus)]));

    await expect(requireServerRole(requete(), ['guide', 'admin'])).rejects.toMatchObject<
      Partial<ServerAuthError>
    >({ status: 403 });
  });

  // ------------------------------------------------------------------
  // ATTAQUE 1 — révocation croisée.
  // ------------------------------------------------------------------
  it("une ligne 'suspended' au `userId` d'un ATTAQUANT ne retire rien au guide", async () => {
    const sub = PARC_VIVANT[1].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    // Le chemin IAM du portail lit TOUT. Depuis la bascule, une telle ligne ne
    // peut plus apparaître dans la page d'un autre `sub` (clé de partition), mais
    // le tri se fait quand même ici — il couvre les lignes héritées et garde ce
    // chemin juste si le schéma reculait.
    mockListGuideProfilePageByUserId.mockResolvedValue(
      page([propre(ATTAQUANT, 'suspended'), propre(sub)]),
    );

    const verified = await requireServerRole(requete(), ['guide', 'admin']);
    expect(verified.roles).toEqual(['guide']);
  });

  // ------------------------------------------------------------------
  // LA COMPARAISON EST STRICTE — la forme composite ne qualifie PLUS.
  // ------------------------------------------------------------------
  it("une ligne au `userId` composite `sub::…` ne qualifie plus personne", async () => {
    const sub = PARC_VIVANT[0].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    // L'ancien juge, qui comparait `owner`, acceptait cette forme : Amplify
    // l'écrivait dans `owner`. Le résolveur ne peut plus l'écrire dans `userId`
    // (`$ownerClaimsList0` est VIDE et la revendication est `sub`), donc une
    // ligne de cette forme n'a plus aucune provenance légitime.
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(`${sub}::${sub}`)]));

    await expect(requireServerRole(requete(), ['guide', 'admin'])).rejects.toMatchObject<
      Partial<ServerAuthError>
    >({ status: 403 });
  });

  // ------------------------------------------------------------------
  // ATTAQUE 2 — élévation par la ligne d'autrui.
  // ------------------------------------------------------------------
  it("le profil d'un guide légitime ne promeut pas l'attaquant qui l'a listé", async () => {
    mockVerifyJwt.mockResolvedValue({ sub: ATTAQUANT, 'cognito:groups': [] });
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(PARC_VIVANT[0].sub)]));

    await expect(requireServerRole(requete(), ['guide', 'admin'])).rejects.toMatchObject<
      Partial<ServerAuthError>
    >({ status: 403 });
  });

  // ------------------------------------------------------------------
  // ATTAQUE 3 — le suspendu qui se re-qualifie par un doublon actif.
  // ------------------------------------------------------------------
  it("un guide suspendu ne se re-qualifie pas via un second profil 'active'", async () => {
    const sub = PARC_VIVANT[1].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    mockListGuideProfilePageByUserId.mockResolvedValue(
      page([propre(sub, 'active'), propre(sub, 'suspended')]),
    );

    await expect(requireServerRole(requete(), ['guide', 'admin'])).rejects.toMatchObject<
      Partial<ServerAuthError>
    >({ status: 403 });
  });

  // ------------------------------------------------------------------
  // LA BORNE — vue tronquée : refus, et refus NON mémorisé.
  // ------------------------------------------------------------------
  it('une vue tronquée refuse, même si tout ce qui est vu est actif et à soi', async () => {
    const sub = PARC_VIVANT[0].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(sub)], true));

    await expect(requireServerRole(requete(), ['guide', 'admin'])).rejects.toMatchObject<
      Partial<ServerAuthError>
    >({ status: 403 });
  });

  it("un refus de vue tronquée n'est PAS mis en cache — le guide retrouve son rôle au coup suivant", async () => {
    const sub = PARC_VIVANT[0].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    mockListGuideProfilePageByUserId.mockResolvedValueOnce(page([propre(sub)], true));

    await expect(requireServerRole(requete(), ['guide'])).rejects.toMatchObject<
      Partial<ServerAuthError>
    >({ status: 403 });

    // La lecture suivante est complète : le rôle revient IMMÉDIATEMENT, sans
    // attendre les 60 s du cache. Si le refus avait été mémorisé, la lecture ne
    // serait même pas relancée et l'attente durerait une minute entière.
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(sub)]));
    const verified = await requireServerRole(requete(), ['guide']);
    expect(verified.roles).toEqual(['guide']);
    expect(mockListGuideProfilePageByUserId).toHaveBeenCalledTimes(2);
  });

  it("une lecture RATÉE refuse sans mémoriser non plus", async () => {
    const sub = PARC_VIVANT[1].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    mockListGuideProfilePageByUserId.mockResolvedValueOnce({ ok: false, erreur: 'AppSync 5xx' });

    await expect(requireServerRole(requete(), ['guide'])).rejects.toMatchObject<
      Partial<ServerAuthError>
    >({ status: 403 });

    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(sub)]));
    const verified = await requireServerRole(requete(), ['guide']);
    expect(verified.roles).toEqual(['guide']);
    expect(mockListGuideProfilePageByUserId).toHaveBeenCalledTimes(2);
  });

  it("une lecture ratée ne retire pas le rôle à un membre du groupe `guide`", async () => {
    mockVerifyJwt.mockResolvedValue({ sub: 'guide-groupe', 'cognito:groups': ['guide'] });
    mockListGuideProfilePageByUserId.mockResolvedValue({ ok: false, erreur: 'timeout' });

    const verified = await requireServerRole(requete(), ['guide']);
    expect(verified.roles).toEqual(['guide']);
  });

  // ------------------------------------------------------------------
  // LE CACHE — il sert toujours les VRAIS verdicts.
  // ------------------------------------------------------------------
  it('caches a guide role across job polling requests', async () => {
    const sub = PARC_VIVANT[1].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(sub)]));

    await requireServerRole(requete(), ['guide']);
    await requireServerRole(requete(), ['guide']);

    expect(mockVerifyJwt).toHaveBeenCalledTimes(2);
    expect(mockListGuideProfilePageByUserId).toHaveBeenCalledTimes(1);
  });

  it('mémorise aussi le refus `disqualifie` — c\'est un verdict, lui', async () => {
    const sub = PARC_VIVANT[0].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    mockListGuideProfilePageByUserId.mockResolvedValue(page([propre(sub, 'suspended')]));

    await expect(requireServerRole(requete(), ['guide'])).rejects.toBeInstanceOf(ServerAuthError);
    await expect(requireServerRole(requete(), ['guide'])).rejects.toBeInstanceOf(ServerAuthError);
    expect(mockListGuideProfilePageByUserId).toHaveBeenCalledTimes(1);
  });
});
