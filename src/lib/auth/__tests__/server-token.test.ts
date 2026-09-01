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

/** Le parc vivant, relevé le 2026-09-01 (cf. guide-qualification.test.ts). */
const PARC_VIVANT = [
  { nom: 'E2E Guide (1)', sub: '34385438-f0c1-708d-edb6-7254fdf3c203' },
  { nom: 'E2E Guide (2)', sub: 'a4e854b8-0001-70c8-fb8d-a8199917905e' },
  { nom: 'Guillaume STEFFEN', sub: '4418d408-8091-7086-42d5-ff563a43379c' },
] as const;

const ATTAQUANT = 'attaquant-sub-2222-3333';

const propre = (sub: string, profileStatus = 'active') => ({
  owner: `${sub}::${sub}`,
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

  it('recognizes an admin group without a profile lookup', async () => {
    mockVerifyJwt.mockResolvedValue({ sub: 'admin-1', 'cognito:groups': ['admin'] });
    const verified = await requireServerRole(requete(), ['admin']);

    expect(verified.roles).toEqual(['admin', 'guide']);
    expect(mockListGuideProfilePageByUserId).not.toHaveBeenCalled();
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
  it("un profil 'suspended' planté sous le sub d'un guide ne lui retire rien", async () => {
    const sub = PARC_VIVANT[2].sub;
    mockVerifyJwt.mockResolvedValue({ sub, 'cognito:groups': [] });
    // Le chemin IAM du portail lit TOUT : la ligne plantée SORT de la lecture.
    // Elle porte l'`owner` de l'attaquant, seul champ que le résolveur borne.
    mockListGuideProfilePageByUserId.mockResolvedValue(
      page([propre(ATTAQUANT, 'suspended'), propre(sub)]),
    );

    const verified = await requireServerRole(requete(), ['guide', 'admin']);
    expect(verified.roles).toEqual(['guide']);
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
    const sub = PARC_VIVANT[2].sub;
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
