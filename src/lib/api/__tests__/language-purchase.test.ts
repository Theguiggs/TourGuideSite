import {
  createPaymentIntent,
  confirmLanguagePurchase,
  listLanguagePurchases,
  refundLanguagePurchase,
  __resetLanguagePurchaseStubs,
} from '../language-purchase';

// Force stub mode
jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => true,
  shouldUseRealApi: () => false,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('LanguagePurchaseAPI', () => {
  beforeEach(() => {
    __resetLanguagePurchaseStubs();
  });

  it('createPaymentIntent returns clientSecret and paymentIntentId', async () => {
    const result = await createPaymentIntent('session-1', ['en', 'es'], 'standard');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.clientSecret).toBeTruthy();
      expect(result.value.paymentIntentId).toBeTruthy();
      expect(result.value.clientSecret).toMatch(/^pi_stub_secret_/);
      expect(result.value.paymentIntentId).toMatch(/^pi_stub_/);
    }
  });

  it('confirmLanguagePurchase returns purchases with correct sessionId', async () => {
    const result = await confirmLanguagePurchase('session-1', ['en', 'es'], 'pro', 'pi_test_123');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0].sessionId).toBe('session-1');
      expect(result.value[0].language).toBe('en');
      expect(result.value[1].language).toBe('es');
      expect(result.value[0].qualityTier).toBe('pro');
      expect(result.value[0].stripePaymentIntentId).toBe('pi_test_123');
    }
  });

  it('listLanguagePurchases returns list filtered by session', async () => {
    const result = await listLanguagePurchases('session-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThanOrEqual(2);
      for (const purchase of result.value) {
        expect(purchase.sessionId).toBe('session-1');
      }
    }
  });

  it('refundLanguagePurchase returns purchase with status refunded', async () => {
    // First confirm a purchase so it exists in stub state
    await confirmLanguagePurchase('session-1', ['en'], 'standard', 'pi_refund_test');

    const result = await refundLanguagePurchase('purchase-session-1-en');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('refunded');
      expect(result.value.refundedAt).toBeTruthy();
    }
  });
});
