/**
 * forfait-purchase API — forfait « visites IA », 19,90 €, 12 mois sans reconduction.
 */

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockShouldUseStubs = jest.fn();
jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => mockShouldUseStubs(),
}));

const mockCreate = jest.fn();
const mockConfirm = jest.fn();
const mockListEntitlements = jest.fn();
jest.mock('@/lib/api/appsync-client', () => ({
  getClient: () => ({
    mutations: {
      createForfaitPaymentIntent: (...a: unknown[]) => mockCreate(...a),
      confirmForfaitPurchase: (...a: unknown[]) => mockConfirm(...a),
    },
    models: {
      UserEntitlement: { list: (...a: unknown[]) => mockListEntitlements(...a) },
    },
  }),
}));

import {
  createForfaitPaymentIntent,
  confirmForfaitPurchase,
  hasActiveForfait,
  FORFAIT_PRICE_CENTS,
} from '../forfait-purchase';

const DAY = 24 * 3600 * 1000;

describe('forfait-purchase API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldUseStubs.mockReturnValue(false);
  });

  it('n’envoie AUCUN montant au serveur — le prix est imposé côté serveur', async () => {
    mockCreate.mockResolvedValue({
      data: JSON.stringify({ ok: true, value: { clientSecret: 'pi_1_secret_x', amountCents: 1990 } }),
    });

    const res = await createForfaitPaymentIntent();

    expect(res.ok).toBe(true);
    // Premier argument = les variables de la mutation : doit rester vide.
    expect(mockCreate).toHaveBeenCalledWith({}, expect.objectContaining({ authMode: 'userPool' }));
  });

  it('remonte l’erreur du serveur plutôt qu’un succès silencieux', async () => {
    mockCreate.mockResolvedValue({
      data: JSON.stringify({ ok: false, error: { code: 2630, message: 'Authentication required' } }),
    });

    const res = await createForfaitPaymentIntent();

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.message).toContain('Authentication');
  });

  it('confirme un achat et renvoie l’expiration', async () => {
    const expiresAtMs = Date.now() + 365 * DAY;
    mockConfirm.mockResolvedValue({
      data: JSON.stringify({ ok: true, value: { expiresAtMs, alreadyActive: false } }),
    });

    const res = await confirmForfaitPurchase('pi_1');

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.expiresAtMs).toBe(expiresAtMs);
  });

  describe('hasActiveForfait', () => {
    it('reconnaît un forfait actif non expiré', async () => {
      mockListEntitlements.mockResolvedValue({
        data: [{ active: true, expiresAtMs: Date.now() + 30 * DAY }],
      });

      await expect(hasActiveForfait()).resolves.toBe(true);
    });

    it('ignore un forfait expiré', async () => {
      mockListEntitlements.mockResolvedValue({
        data: [{ active: true, expiresAtMs: Date.now() - DAY }],
      });

      await expect(hasActiveForfait()).resolves.toBe(false);
    });

    it('ignore un entitlement désactivé', async () => {
      mockListEntitlements.mockResolvedValue({
        data: [{ active: false, expiresAtMs: Date.now() + 30 * DAY }],
      });

      await expect(hasActiveForfait()).resolves.toBe(false);
    });

    it('accepte un entitlement sans expiration (achat à vie / canal Play)', async () => {
      mockListEntitlements.mockResolvedValue({ data: [{ active: true, expiresAtMs: null }] });

      await expect(hasActiveForfait()).resolves.toBe(true);
    });

    it('ne bloque pas l’achat si la lecture échoue', async () => {
      mockListEntitlements.mockRejectedValue(new Error('network'));

      // false → le bouton d'achat reste affiché. Un double achat serait de toute
      // façon idempotent côté serveur.
      await expect(hasActiveForfait()).resolves.toBe(false);
    });
  });

  describe('mode stub', () => {
    beforeEach(() => mockShouldUseStubs.mockReturnValue(true));

    it('renvoie un clientSecret factice au bon montant', async () => {
      const res = await createForfaitPaymentIntent();

      expect(res.ok).toBe(true);
      if (res.ok) expect(res.value.amountCents).toBe(FORFAIT_PRICE_CENTS);
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
