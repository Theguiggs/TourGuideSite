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

    it("lit toujours sous l'identité du visiteur", async () => {
      // `UserEntitlement` est lisible par son propriétaire. Une lecture invité
      // serait refusée, l'échec avalé par le `catch`, et la fonction répondrait
      // « pas de droit » à un porteur de forfait — sans erreur nulle part.
      mockListEntitlements.mockResolvedValue({ data: [] });

      await hasActiveForfait();

      expect(mockListEntitlements).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ authMode: 'userPool' }),
      );
    });

    it('borne le balayage si le serveur renvoie un jeton qui n’avance pas', async () => {
      // Une question booléenne ne doit jamais tourner sans fin.
      mockListEntitlements.mockResolvedValue({ data: [], nextToken: 'toujours-la-meme' });

      await expect(hasActiveForfait()).resolves.toBe(false);
      // Un tour pour découvrir le jeton, un second pour constater qu'il ne
      // bouge pas — puis on s'arrête, au lieu de balayer sans fin.
      expect(mockListEntitlements).toHaveBeenCalledTimes(2);
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

    it('suit la pagination : un droit relégué en 2e page compte quand même', async () => {
      // DynamoDB filtre APRÈS chaque page balayée : une 1re page vide n'est pas
      // une absence de droit. Sans pagination, le porteur de forfait restait
      // devant un aperçu flouté alors qu'il avait payé.
      mockListEntitlements
        .mockResolvedValueOnce({ data: [], nextToken: 'page-2' })
        .mockResolvedValueOnce({ data: [{ active: true, expiresAtMs: Date.now() + 30 * DAY }] });

      await expect(hasActiveForfait()).resolves.toBe(true);
      expect(mockListEntitlements).toHaveBeenCalledTimes(2);
      expect(mockListEntitlements).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ nextToken: 'page-2' }),
      );
    });

    it('s’arrête dès qu’un droit actif est trouvé', async () => {
      mockListEntitlements.mockResolvedValueOnce({
        data: [{ active: true, expiresAtMs: null }],
        nextToken: 'page-2',
      });

      await expect(hasActiveForfait()).resolves.toBe(true);
      expect(mockListEntitlements).toHaveBeenCalledTimes(1);
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
