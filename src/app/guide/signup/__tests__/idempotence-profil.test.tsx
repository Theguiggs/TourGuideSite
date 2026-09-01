/**
 * LE TEST QUI DÉCIDE SI UN GUIDE AURA UN PROFIL — `/guide/signup`, étape 2.
 *
 * Ce test d'idempotence n'est pas un confort : il décide de CRÉER ou NON le
 * `GuideProfile`, donc d'accorder ou non le rôle guide. Se tromper coûte cher
 * dans un sens (compte confirmé mais sans profil, en silence) et peu dans
 * l'autre (doublon, que `getOwnGuideProfile` et `qualifieGuide` absorbent tous
 * les deux).
 *
 * CE QUI EST MIS À L'ÉPREUVE ICI : la vraie chaîne. `appsync-client` est
 * DÉMOQUÉ, seul le client Amplify est simulé — et il sert LES DEUX voies de
 * lecture, l'index (`listGuideProfileByUserId`) et le balayage filtré (`list`),
 * pour qu'un retour au balayage soit servi lui aussi et tombe sur ses propres
 * défauts, au lieu de tomber sur un mock absent.
 *
 * CE QUE CE FICHIER NE PROUVE PAS : que DynamoDB se comporte comme simulé. Les
 * hypothèses tenues pour vraies sont écrites au-dessus des cas qui en dépendent.
 */

jest.unmock('@/lib/api/appsync-client');

const mockIndexQuery = jest.fn();
const mockListScan = jest.fn();
const mockCreate = jest.fn();
const mockPush = jest.fn();
const mockRefreshUser = jest.fn();
const mockFetchAuthSession = jest.fn();

jest.mock('aws-amplify/api', () => {
  const client = {
    models: {
      GuideProfile: {
        listGuideProfileByUserId: (...a: unknown[]) => mockIndexQuery(...a),
        list: (...a: unknown[]) => mockListScan(...a),
        create: (...a: unknown[]) => mockCreate(...a),
      },
    },
  };
  return { generateClient: () => client };
});

jest.mock('aws-amplify', () => ({
  Amplify: {
    getConfig: () => ({ API: { GraphQL: { endpoint: 'https://example.test/graphql' } } }),
  },
}));

jest.mock('@/lib/amplify/config', () => ({ configureAmplify: jest.fn() }));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('aws-amplify/auth', () => ({
  signUp: jest.fn(() => Promise.resolve({})),
  confirmSignUp: jest.fn(() => Promise.resolve({})),
  signIn: jest.fn(() => Promise.resolve({})),
  signOut: jest.fn(() => Promise.resolve()),
  fetchAuthSession: (...a: unknown[]) => mockFetchAuthSession(...a),
  resendSignUpCode: jest.fn(() => Promise.resolve()),
}));

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@/lib/auth/auth-context', () => ({ useAuth: () => ({ refreshUser: mockRefreshUser }) }));

jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  GuideAnalyticsEvents: { GUIDE_SIGNUP_STARTED: 'started', GUIDE_SIGNUP_COMPLETED: 'completed' },
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GuideSignupPage from '../page';

const SUB = '4418d408-8091-7086-42d5-ff563a43379c';
const AUTRUI = 'sub-de-quelqu-un-d-autre-9999';

/** Sa ligne à lui, telle que l'index la rend. */
const SA_LIGNE = {
  id: 'profil-a-lui',
  userId: SUB,
  displayName: 'Marie Dupont',
  profileStatus: 'active',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchAuthSession.mockResolvedValue({ tokens: { accessToken: { payload: { sub: SUB } } } });
  mockRefreshUser.mockResolvedValue({ ok: true });
  mockCreate.mockResolvedValue({ data: { id: 'profil-neuf', userId: SUB } });
  mockIndexQuery.mockResolvedValue({ data: [], nextToken: null });
  mockListScan.mockResolvedValue({ data: [], nextToken: null });
});

/**
 * Mène l'inscription de bout en bout, jusqu'au bout de l'étape 2.
 * On attend la redirection : c'est le seul signal fiable que la décision
 * « créer ou non » est prise, y compris quand elle est « non ».
 */
async function inscritUnGuide() {
  render(<GuideSignupPage />);

  fireEvent.change(screen.getByLabelText(/Nom complet/), { target: { value: 'Marie Dupont' } });
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'marie@exemple.com' } });
  fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'MotDePasse1!' } });
  fireEvent.change(screen.getByLabelText(/Ville principale/), { target: { value: 'Grasse' } });
  fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }));

  const champCode = await screen.findByLabelText(/Code de confirmation/);
  fireEvent.change(champCode, { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /Confirmer et accéder/ }));

  await waitFor(() => expect(mockPush).toHaveBeenCalled());
}

describe('idempotence — un guide qui reprend son signup ne prend pas un second profil', () => {
  it('ne recrée rien quand sa ligne est déjà là', async () => {
    mockIndexQuery.mockResolvedValue({ data: [SA_LIGNE], nextToken: null });
    mockListScan.mockResolvedValue({ data: [SA_LIGNE], nextToken: null });

    await inscritUnGuide();

    expect(mockCreate).not.toHaveBeenCalled();
  });

  /**
   * LE DÉFAUT VIVANT — et il va dans le sens INVERSE de celui qu'on redoutait.
   *
   * HYPOTHÈSE TENUE POUR VRAIE : DynamoDB lit une page de 1 Mo PUIS applique le
   * filtre. Un `list({filter:{userId}})` rend donc `data: []` avec un `nextToken`
   * non nul dès que la ligne du guide tombe au-delà de la première page — cas
   * banal quand la table `GuideProfile` grossit. `data?.[0] ?? null` valait alors
   * `null` pour un guide parfaitement légitime, et le signup lui fabriquait un
   * SECOND profil.
   *
   * L'index n'a pas ce défaut : sa clé de partition EST `userId`, sa page ne
   * contient que les lignes de ce `sub`.
   */
  it('ne recrée rien quand le balayage filtré, lui, ne verrait pas sa ligne', async () => {
    mockIndexQuery.mockResolvedValue({ data: [SA_LIGNE], nextToken: null });
    mockListScan.mockResolvedValue({ data: [], nextToken: 'page-2' });

    await inscritUnGuide();

    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("le guide n'est jamais PRIVÉ de son profil", () => {
  /**
   * DÉFENSE EN PROFONDEUR, et il faut le dire : depuis la bascule
   * `ownerDefinedIn('userId').identityClaim('sub')`, une ligne d'autrui ne PEUT
   * PLUS apparaître dans la page d'index d'un `sub` — la clé de partition
   * l'interdit, et le balayage filtre sur le même `userId`. Ce cas simule donc
   * ce qui est impossible aujourd'hui : il tient le jour où la règle de
   * propriété s'écarterait de `userId` (retour d'un champ `owner`, forme
   * `sub::username`), où une page pourrait de nouveau porter une ligne que le
   * juge refuse. Le coût de le garder est nul ; le coût de sa disparition serait
   * un guide sans profil, en silence.
   */
  it("une ligne qui n'est pas la sienne ne lui fait pas sauter la création", async () => {
    const ligneEtrangere = { id: 'profil-autrui', userId: AUTRUI, profileStatus: 'active' };
    mockIndexQuery.mockResolvedValue({ data: [ligneEtrangere], nextToken: null });
    mockListScan.mockResolvedValue({ data: [ligneEtrangere], nextToken: null });

    await inscritUnGuide();

    expect(mockCreate).toHaveBeenCalledTimes(1);
    // Et la ligne créée porte SON `sub`, nu — jamais l'`userId` d'autrui.
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ userId: SUB });
  });

  /**
   * LE SENS DE L'ERREUR — pannes de lecture, et fenêtre de propagation de l'index.
   *
   * Une lecture qui ne voit rien doit faire CRÉER. C'est l'unique direction
   * tolérable : au pire un doublon (absorbé par `getOwnGuideProfile`, qui préfère
   * la ligne disqualifiante, et par `qualifieGuide`, qui accorde le rôle dès
   * qu'une ligne est à soi), jamais un compte confirmé mais sans profil, qui
   * repartirait en `tourist` sans qu'aucune erreur ne le signale.
   */
  it('crée quand même quand la lecture échoue', async () => {
    mockIndexQuery.mockRejectedValue(new Error('ECONNRESET'));
    mockListScan.mockRejectedValue(new Error('ECONNRESET'));

    await inscritUnGuide();

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("crée quand même quand l'index n'a pas encore propagé la ligne", async () => {
    // Fenêtre de propagation de la GSI : la ligne existe, l'index ne la voit pas
    // encore. Doublon possible, assumé — c'est le bon côté de l'erreur.
    mockIndexQuery.mockResolvedValue({ data: [], nextToken: null });

    await inscritUnGuide();

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
