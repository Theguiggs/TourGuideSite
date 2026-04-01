import {
  useLanguagePurchaseStore,
  selectPurchase,
  selectPurchasesBySession,
} from '../language-purchase-store';
import type { TourLanguagePurchase } from '@/types/studio';

const mockPurchase: TourLanguagePurchase = {
  id: 'purchase-1',
  guideId: 'guide-1',
  sessionId: 'session-1',
  language: 'en',
  qualityTier: 'standard',
  provider: 'marianmt',
  purchaseType: 'single',
  amountCents: 199,
  stripePaymentIntentId: 'pi_test',
  moderationStatus: 'draft',
  status: 'active',
  refundedAt: null,
  createdAt: '2026-03-01T00:00:00Z',
  updatedAt: '2026-03-01T00:00:00Z',
};

const mockPurchase2: TourLanguagePurchase = {
  ...mockPurchase,
  id: 'purchase-2',
  language: 'es',
};

const mockPurchaseOtherSession: TourLanguagePurchase = {
  ...mockPurchase,
  id: 'purchase-3',
  sessionId: 'session-2',
  language: 'de',
};

describe('LanguagePurchaseStore', () => {
  beforeEach(() => {
    useLanguagePurchaseStore.getState().resetStore();
  });

  it('setPurchase adds and selectPurchase reads a purchase', () => {
    const { setPurchase } = useLanguagePurchaseStore.getState();
    setPurchase(mockPurchase);

    const selector = selectPurchase('session-1', 'en');
    const result = selector(useLanguagePurchaseStore.getState());
    expect(result).toEqual(mockPurchase);
  });

  it('setPurchases bulk sets and selectPurchasesBySession filters', () => {
    const { setPurchases } = useLanguagePurchaseStore.getState();
    setPurchases([mockPurchase, mockPurchase2, mockPurchaseOtherSession]);

    const selector = selectPurchasesBySession('session-1');
    const results = selector(useLanguagePurchaseStore.getState());
    expect(results).toHaveLength(2);
    expect(results.map((p) => p.language).sort()).toEqual(['en', 'es']);
  });

  it('removePurchase deletes a purchase by composite key', () => {
    const { setPurchase, removePurchase } = useLanguagePurchaseStore.getState();
    setPurchase(mockPurchase);

    const selectorBefore = selectPurchase('session-1', 'en');
    expect(selectorBefore(useLanguagePurchaseStore.getState())).toEqual(mockPurchase);

    removePurchase('session-1', 'en');

    const selectorAfter = selectPurchase('session-1', 'en');
    expect(selectorAfter(useLanguagePurchaseStore.getState())).toBeNull();
  });

  it('resetStore clears all state', () => {
    const state = useLanguagePurchaseStore.getState();
    state.setPurchase(mockPurchase);
    state.setLoading(true);
    state.setError('some error');

    state.resetStore();

    const after = useLanguagePurchaseStore.getState();
    expect(after.purchases).toEqual({});
    expect(after.loading).toBe(false);
    expect(after.error).toBeNull();
  });
});
