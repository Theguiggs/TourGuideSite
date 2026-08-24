/**
 * TourLanguagePurchase — le chemin AppSync réel.
 *
 * L'ancienne version de ce fichier mockait `appsync-client` puis appelait le
 * mock : zéro ligne de production traversée, et une couverture « AppSync » de
 * façade. Ici le mock global est levé (`jest.unmock`) et c'est le CLIENT AMPLIFY
 * qui est simulé : `appsync-client` et `language-purchase` s'exécutent pour de
 * vrai.
 *
 * Ce qui est figé :
 *  - un guide ne peut plus écrire `moderationStatus`/`status` en direct ; le refus
 *    arrive dans `result.errors` et DOIT ressortir en `{ok:false}` (sinon
 *    « Dépublier » ment) ;
 *  - la soumission et le retrait passent par la mutation Lambda
 *    `setLanguageModerationStatus`, jamais par `updateTourLanguagePurchase` ;
 *  - la création après paiement reste inchangée (draft + active).
 */

jest.unmock('@/lib/api/appsync-client');

const mockPurchaseCreate = jest.fn();
const mockPurchaseUpdate = jest.fn();
const mockPurchaseListBySession = jest.fn();
const mockSetLanguageModerationStatus = jest.fn();
const mockGuideTourUpdate = jest.fn();
const mockSessionGet = jest.fn();
const mockSceneListBySession = jest.fn();
const mockSegmentListByScene = jest.fn();

jest.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    models: {
      TourLanguagePurchase: {
        create: mockPurchaseCreate,
        update: mockPurchaseUpdate,
        listTourLanguagePurchaseBySessionId: mockPurchaseListBySession,
      },
      GuideTour: { update: mockGuideTourUpdate },
      StudioSession: { get: mockSessionGet },
      StudioScene: { listStudioSceneBySessionId: mockSceneListBySession },
      SceneSegment: { listSceneSegmentBySceneId: mockSegmentListByScene },
    },
    mutations: {
      setLanguageModerationStatus: mockSetLanguageModerationStatus,
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
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  createLanguagePurchaseMutation,
  updateLanguagePurchaseMutation,
  setLanguageModerationStatusMutation,
  listLanguagePurchasesBySession,
  getLanguagePurchase,
} from '../appsync-client';
import {
  submitLanguageForModeration,
  retractLanguageSubmission,
  revokeLanguageAccess,
  confirmLanguagePurchase,
  updateModerationStatusByLang,
} from '../language-purchase';

const SAMPLE_ROW = {
  id: 'purchase-1',
  guideId: 'guide-1',
  sessionId: 'session-1',
  language: 'en',
  qualityTier: 'standard',
  provider: 'marianmt',
  purchaseType: 'free_first',
  amountCents: 0,
  stripePaymentIntentId: null,
  moderationStatus: 'draft',
  status: 'active',
  refundedAt: null,
  createdAt: '2026-03-29T10:00:00.000Z',
  updatedAt: '2026-03-29T10:00:00.000Z',
};

/** Deux scènes complètes : `checkLanguageReadiness` doit passer. */
const SCENES = [
  { id: 'scene-1', title: 'Scene 1' },
  { id: 'scene-2', title: 'Scene 2' },
];
const SEGMENTS = SCENES.map((s) => ({
  sceneId: s.id,
  language: 'en',
  transcriptText: `Text for ${s.id}`,
  audioKey: `audio/${s.id}.mp3`,
}));

// Mode réel : c'est le point de tout ce fichier.
const PREVIOUS_STUBS = process.env.NEXT_PUBLIC_USE_STUBS;
beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'false';
});
afterAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = PREVIOUS_STUBS;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPurchaseCreate.mockResolvedValue({ data: SAMPLE_ROW, errors: undefined });
  mockPurchaseUpdate.mockResolvedValue({ data: SAMPLE_ROW, errors: undefined });
  mockPurchaseListBySession.mockResolvedValue({ data: [SAMPLE_ROW], errors: undefined });
  mockSetLanguageModerationStatus.mockResolvedValue({
    data: { ok: true, moderationStatus: 'submitted', purchaseId: 'purchase-1' },
    errors: undefined,
  });
  mockGuideTourUpdate.mockResolvedValue({ data: { id: 'tour-1' }, errors: undefined });
  mockSessionGet.mockResolvedValue({ data: { id: 'session-1', tourId: 'tour-1', language: 'fr' } });
  mockSceneListBySession.mockResolvedValue({ data: [] });
  mockSegmentListByScene.mockResolvedValue({ data: [] });
});

// ---------------------------------------------------------------------------
// Création — le guide crée toujours sa ligne d'achat après Stripe.
// ---------------------------------------------------------------------------

describe('createLanguagePurchaseMutation', () => {
  it("n'envoie pas moderationStatus, mais envoie status — éprouvé sur bac à sable", async () => {
    const result = await createLanguagePurchaseMutation({
      guideId: 'guide-1',
      sessionId: 'session-1',
      language: 'en',
      qualityTier: 'standard',
      purchaseType: 'free_first',
      amountCents: 0,
    });

    expect(result.ok).toBe(true);
    const sent = mockPurchaseCreate.mock.calls[0][0];
    expect(sent).toMatchObject({ sessionId: 'session-1', language: 'en' });
    // Le cœur de la porte 3. Éprouvé contre un backend déployé le 2026-08-23 :
    // envoyer `moderationStatus` fait refuser la création entière
    // (« Unauthorized on [moderationStatus] »), donc un guide ne peut pas naître
    // « approved ». Le champ reste nul, et c'est sûr : le balayage de publication
    // exige `moderationStatus = 'approved'` et ne matche jamais un nul.
    expect(sent).not.toHaveProperty('moderationStatus');
    // `status` DOIT partir. Le propriétaire garde `create` dessus, et une valeur
    // par défaut de schéma ne sauverait rien : la même épreuve a montré qu'AppSync
    // la compte comme fournie par le client et refuse la création. Quatre filtres
    // du produit comparent ce champ à 'active'.
    expect(sent).toMatchObject({ status: 'active' });
  });

  it("remonte le refus si une création portait quand même un champ d'état (simulé)", async () => {
    // Refus simulé : c'est la réponse qu'AppSync renverrait si un site de création
    // renvoyait `moderationStatus`. Le schéma est la vraie garde ; ce test fige le
    // fait que le refus ressort en {ok:false} au lieu d'être avalé.
    mockPurchaseCreate.mockResolvedValue({
      data: null,
      errors: [{ message: 'Unauthorized on create for field moderationStatus' }],
    });

    const result = await createLanguagePurchaseMutation({
      guideId: 'guide-1',
      sessionId: 'session-1',
      language: 'en',
      qualityTier: 'standard',
      purchaseType: 'free_first',
      amountCents: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('moderationStatus');
    }
  });

  it('remonte un refus serveur au lieu de faire semblant', async () => {
    mockPurchaseCreate.mockResolvedValue({ data: null, errors: [{ message: 'Unauthorized' }] });

    const result = await createLanguagePurchaseMutation({
      guideId: 'guide-1',
      sessionId: 'session-1',
      language: 'es',
      qualityTier: 'pro',
      purchaseType: 'single',
      amountCents: 199,
    });

    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Écriture directe — c'est ici que le refus doit devenir visible.
// ---------------------------------------------------------------------------

describe('updateLanguagePurchaseMutation', () => {
  it('remonte le refus quand le serveur renvoie des errors (auto-approbation)', async () => {
    mockPurchaseUpdate.mockResolvedValue({
      data: null,
      errors: [{ message: 'Not Authorized to access moderationStatus on type TourLanguagePurchase' }],
    });

    const result = await updateLanguagePurchaseMutation('purchase-1', {
      moderationStatus: 'approved',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('moderationStatus');
    }
  });

  it('remonte le refus d\'auto-remboursement (status → refunded)', async () => {
    mockPurchaseUpdate.mockResolvedValue({
      data: null,
      errors: [{ message: 'Not Authorized to access status on type TourLanguagePurchase' }],
    });

    const result = await updateLanguagePurchaseMutation('purchase-1', {
      status: 'refunded',
      refundedAt: '2026-03-29T12:00:00.000Z',
    });

    expect(result.ok).toBe(false);
  });

  it('refuse aussi le cas « champ silencieusement remis à null » (comportement documenté)', async () => {
    // Amplify documente un champ refusé RENVOYÉ tel quel / à null plutôt qu'une
    // mutation rejetée. Sans garde, ce chemin rendait ok:true et « Dépublier »
    // paraissait réussi.
    mockPurchaseUpdate.mockResolvedValue({
      data: { ...SAMPLE_ROW, moderationStatus: 'draft' },
      errors: undefined,
    });

    const result = await updateLanguagePurchaseMutation('purchase-1', {
      moderationStatus: 'approved',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('moderationStatus');
    }
  });

  it('ne renvoie jamais ok:true sur une réponse sans données', async () => {
    mockPurchaseUpdate.mockResolvedValue({ data: null, errors: undefined });

    const result = await updateLanguagePurchaseMutation('purchase-1', { moderationStatus: 'approved' });

    expect(result.ok).toBe(false);
  });

  it('laisse passer une mise à jour de champs non resserrés (montée en gamme)', async () => {
    const upgraded = { ...SAMPLE_ROW, qualityTier: 'pro', provider: 'deepl', amountCents: 299 };
    mockPurchaseUpdate.mockResolvedValue({ data: upgraded, errors: undefined });

    const result = await updateLanguagePurchaseMutation('purchase-1', {
      qualityTier: 'pro',
      provider: 'deepl',
      amountCents: 299,
    });

    expect(result.ok).toBe(true);
    const sent = mockPurchaseUpdate.mock.calls[0][0];
    expect(sent).toMatchObject({ id: 'purchase-1', qualityTier: 'pro' });
    expect(sent.moderationStatus).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// La mutation Lambda — seule voie guide.
// ---------------------------------------------------------------------------

describe('setLanguageModerationStatusMutation', () => {
  it('appelle la mutation custom avec (sessionId, language, moderationStatus)', async () => {
    const result = await setLanguageModerationStatusMutation('session-1', 'en', 'submitted');

    expect(result.ok).toBe(true);
    expect(mockSetLanguageModerationStatus).toHaveBeenCalledWith(
      { sessionId: 'session-1', language: 'en', moderationStatus: 'submitted' },
      { authMode: 'userPool' },
    );
  });

  it('remonte une erreur GraphQL', async () => {
    mockSetLanguageModerationStatus.mockResolvedValue({
      data: null,
      errors: [{ message: 'Unauthorized' }],
    });

    const result = await setLanguageModerationStatusMutation('session-1', 'en', 'draft');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Unauthorized');
    }
  });

  it('remonte un refus applicatif (ok:false dans l\'enveloppe) — propriété, liste blanche', async () => {
    mockSetLanguageModerationStatus.mockResolvedValue({
      data: { ok: false, error: 'Not the purchase owner', code: 2624 },
      errors: undefined,
    });

    const result = await setLanguageModerationStatusMutation('session-1', 'en', 'draft');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Not the purchase owner');
    }
  });
});

// ---------------------------------------------------------------------------
// Routage des deux transitions guide.
// ---------------------------------------------------------------------------

describe('submitLanguageForModeration (mode réel)', () => {
  it('passe par la Lambda et jamais par updateTourLanguagePurchase', async () => {
    const result = await submitLanguageForModeration('session-1', 'en', SCENES, SEGMENTS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.moderationStatus).toBe('submitted');
    }
    expect(mockSetLanguageModerationStatus).toHaveBeenCalledWith(
      { sessionId: 'session-1', language: 'en', moderationStatus: 'submitted' },
      { authMode: 'userPool' },
    );
    expect(mockPurchaseUpdate).not.toHaveBeenCalled();
  });

  it('échoue bruyamment quand le serveur refuse la transition', async () => {
    mockSetLanguageModerationStatus.mockResolvedValue({
      data: { ok: false, error: 'Not the purchase owner', code: 2624 },
      errors: undefined,
    });

    const result = await submitLanguageForModeration('session-1', 'en', SCENES, SEGMENTS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(2614);
      expect(result.error.message).toContain('Not the purchase owner');
    }
  });
});

describe('retractLanguageSubmission (mode réel)', () => {
  it('passe par la Lambda avec draft — « Retirer » et « Dépublier »', async () => {
    mockSetLanguageModerationStatus.mockResolvedValue({
      data: { ok: true, moderationStatus: 'draft', purchaseId: 'purchase-1' },
      errors: undefined,
    });

    const result = await retractLanguageSubmission('session-1', 'en');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.moderationStatus).toBe('draft');
    }
    expect(mockSetLanguageModerationStatus).toHaveBeenCalledWith(
      { sessionId: 'session-1', language: 'en', moderationStatus: 'draft' },
      { authMode: 'userPool' },
    );
    expect(mockPurchaseUpdate).not.toHaveBeenCalled();
  });

  it('« Dépublier » ne ment plus : un refus serveur ressort en ok:false', async () => {
    mockSetLanguageModerationStatus.mockResolvedValue({
      data: { ok: false, error: 'Moderation status "approved" is not a permitted guide transition' },
      errors: undefined,
    });

    const result = await retractLanguageSubmission('session-1', 'en');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(2608);
    }
  });
});

describe('revokeLanguageAccess (mode réel)', () => {
  it('vise le modèle (chemin admin) et coupe l\'accès sans inversion Stripe', async () => {
    const revoked = { ...SAMPLE_ROW, status: 'refunded', refundedAt: '2026-03-29T12:00:00.000Z' };
    mockPurchaseUpdate.mockResolvedValue({ data: revoked, errors: undefined });

    const result = await revokeLanguageAccess('purchase-1');

    expect(result.ok).toBe(true);
    const sent = mockPurchaseUpdate.mock.calls[0][0];
    expect(sent).toMatchObject({ id: 'purchase-1', status: 'refunded' });
    expect(sent.refundedAt).toBeTruthy();
  });

  it('un guide qui tente de se rembourser reçoit une erreur, pas un succès', async () => {
    mockPurchaseUpdate.mockResolvedValue({
      data: null,
      errors: [{ message: 'Not Authorized to access status on type TourLanguagePurchase' }],
    });

    const result = await revokeLanguageAccess('purchase-1');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(2607);
    }
  });
});

// ---------------------------------------------------------------------------
// Lectures (inchangées) — la ligne reste lisible par son propriétaire.
// ---------------------------------------------------------------------------

describe('lectures par session', () => {
  it('listLanguagePurchasesBySession interroge l\'index sessionId', async () => {
    const result = await listLanguagePurchasesBySession('session-1');

    expect(result.ok).toBe(true);
    expect(mockPurchaseListBySession).toHaveBeenCalledWith(
      { sessionId: 'session-1' },
      { authMode: 'userPool' },
    );
    if (result.ok) {
      expect(result.data).toHaveLength(1);
    }
  });

  it('getLanguagePurchase filtre par langue et rend null si absente', async () => {
    const found = await getLanguagePurchase('session-1', 'en');
    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.data?.language).toBe('en');
    }

    const missing = await getLanguagePurchase('session-1', 'ja');
    expect(missing.ok).toBe(true);
    if (missing.ok) {
      expect(missing.data).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// PORTE 3 — les autres sites de création. S'ils renvoyaient les champs d'état,
// tout achat de langue échouerait.
// ---------------------------------------------------------------------------

describe('sites de création de language-purchase.ts', () => {
  it('confirmLanguagePurchase crée avec status, sans moderationStatus', async () => {
    mockPurchaseCreate.mockResolvedValue({ data: SAMPLE_ROW, errors: undefined });
    mockSceneListBySession.mockResolvedValue({ data: [] });

    await confirmLanguagePurchase('session-1', ['en'], 'standard', 'pi_test');

    expect(mockPurchaseCreate).toHaveBeenCalled();
    const sent = mockPurchaseCreate.mock.calls[0][0];
    expect(sent).toMatchObject({ sessionId: 'session-1', language: 'en', status: 'active' });
    expect(sent).not.toHaveProperty('moderationStatus');
  });
});

// ---------------------------------------------------------------------------
// PORTE 2 — les trois champs de GuideTour qui publient vers le mobile.
//
// ⚠️ Les refus ci-dessous sont SIMULÉS : c'est la réponse qu'AppSync renverrait.
// La vraie garde est la règle de champ du schéma, qu'aucun test hors bac à sable
// ne peut exercer. Ce qui est réellement prouvé ici : le chemin administrateur
// écrit toujours les trois champs, et un refus ressort au lieu d'être avalé ou
// contourné par une écriture DynamoDB brute.
// ---------------------------------------------------------------------------

describe('surface de publication GuideTour (chemin administrateur)', () => {
  it('l\'approbation écrit les trois champs via AppSync', async () => {
    const approvedRow = { ...SAMPLE_ROW, moderationStatus: 'approved' };
    mockPurchaseUpdate.mockResolvedValue({ data: approvedRow, errors: undefined });

    const result = await updateModerationStatusByLang('session-1', 'en', 'approved');

    expect(result.ok).toBe(true);
    expect(mockGuideTourUpdate).toHaveBeenCalledTimes(1);
    const sent = mockGuideTourUpdate.mock.calls[0][0];
    expect(sent.id).toBe('tour-1');
    expect(sent.availableLanguages).toEqual(['fr', 'en']);
    expect(typeof sent.languageAudioTypes).toBe('string');
    // `translatedAudioKeys` part en objet, donc AppSync rejette la mutation
    // entière : l'approbation ne publie rien aujourd'hui. C'est délibéré et
    // épinglé ici — l'écriture remplace les trois cartes sans fusionner, et la
    // débloquer avant d'ajouter la fusion échangerait une panne masquée contre
    // une perte de données. Voir deferred-work.md.
    expect(typeof sent.translatedAudioKeys).toBe('object');
  });

  it('un refus de cette écriture ne se replie plus sur DynamoDB brut', async () => {
    const approvedRow = { ...SAMPLE_ROW, moderationStatus: 'approved' };
    mockPurchaseUpdate.mockResolvedValue({ data: approvedRow, errors: undefined });
    // Refus simulé : ce que le serveur renverrait à un jeton non administrateur.
    mockGuideTourUpdate.mockResolvedValue({
      data: null,
      errors: [{ message: 'Not Authorized to access availableLanguages on type GuideTour' }],
    });

    // Ne lève pas, ne tente aucun repli : l'approbation reste ok, l'échec de
    // publication est journalisé en erreur (le repli DynamoDB a été supprimé).
    await expect(updateModerationStatusByLang('session-1', 'en', 'approved')).resolves.toMatchObject({ ok: true });
    expect(mockGuideTourUpdate).toHaveBeenCalledTimes(1);
  });

  it('n\'écrit rien sur GuideTour quand le verdict n\'est pas « approved »', async () => {
    mockPurchaseUpdate.mockResolvedValue({
      data: { ...SAMPLE_ROW, moderationStatus: 'rejected' },
      errors: undefined,
    });

    await updateModerationStatusByLang('session-1', 'en', 'rejected', { 'scene-1': 'à revoir' });

    expect(mockGuideTourUpdate).not.toHaveBeenCalled();
  });
});
