/**
 * tour-purchase API tests — Story mon-1.3b.
 */

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockShouldUseStubs = jest.fn();
jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => mockShouldUseStubs(),
}));

const mockCreateTourPI = jest.fn();
const mockConfirm = jest.fn();
jest.mock('@/lib/api/appsync-client', () => ({
  getClient: () => ({
    mutations: {
      createTourPaymentIntent: (...a: unknown[]) => mockCreateTourPI(...a),
      confirmTourPurchase: (...a: unknown[]) => mockConfirm(...a),
    },
  }),
}));

import { createTourPaymentIntent, confirmTourPurchase } from '../tour-purchase';

describe('tour-purchase API (mon-1.3b)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stub mode', () => {
    beforeEach(() => mockShouldUseStubs.mockReturnValue(true));

    it('createTourPaymentIntent returns a stub client secret', async () => {
      const res = await createTourPaymentIntent('paris-marais');
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value.clientSecret).toMatch(/^pi_stub_secret_/);
      expect(mockCreateTourPI).not.toHaveBeenCalled();
    });

    it('confirmTourPurchase resolves a stub grant', async () => {
      const res = await confirmTourPurchase('pi_1');
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value.alreadyOwned).toBe(false);
    });
  });

  describe('real mode', () => {
    beforeEach(() => mockShouldUseStubs.mockReturnValue(false));

    it('maps a successful createTourPaymentIntent envelope', async () => {
      mockCreateTourPI.mockResolvedValue({
        data: { ok: true, value: { clientSecret: 'pi_secret_x', amountCents: 499 } },
      });
      const res = await createTourPaymentIntent('paris-marais');
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value).toEqual({ clientSecret: 'pi_secret_x', amountCents: 499 });
      expect(mockCreateTourPI).toHaveBeenCalledWith({ tourId: 'paris-marais' }, { authMode: 'userPool' });
    });

    it('surfaces a Lambda error envelope as Err', async () => {
      mockCreateTourPI.mockResolvedValue({
        data: { ok: false, error: { code: 2612, message: 'Tour is not individually purchasable' } },
      });
      const res = await createTourPaymentIntent('free-tour');
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe(2612);
    });

    it('maps a successful confirmTourPurchase envelope', async () => {
      mockConfirm.mockResolvedValue({
        data: { ok: true, value: { tourId: 'paris-marais', alreadyOwned: true } },
      });
      const res = await confirmTourPurchase('pi_1');
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value).toEqual({ tourId: 'paris-marais', alreadyOwned: true });
    });

    it('returns Err when the mutation throws', async () => {
      mockConfirm.mockRejectedValue(new Error('network'));
      const res = await confirmTourPurchase('pi_1');
      expect(res.ok).toBe(false);
    });
  });
});
