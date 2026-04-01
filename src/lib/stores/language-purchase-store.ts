import { create } from 'zustand';
import type { TourLanguagePurchase } from '@/types/studio';

// --- Helper ---

export function getPurchaseKey(sessionId: string, language: string): string {
  return `${sessionId}_${language}`;
}

// --- State interface ---

export interface LanguagePurchaseStoreState {
  purchases: Record<string, TourLanguagePurchase>;
  loading: boolean;
  error: string | null;

  // Actions
  setPurchase: (purchase: TourLanguagePurchase) => void;
  setPurchases: (purchases: TourLanguagePurchase[]) => void;
  removePurchase: (sessionId: string, language: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetStore: () => void;
}

// --- Store ---

export const useLanguagePurchaseStore = create<LanguagePurchaseStoreState>((set) => ({
  purchases: {},
  loading: false,
  error: null,

  setPurchase: (purchase) => {
    const key = getPurchaseKey(purchase.sessionId, purchase.language);
    set((state) => ({
      purchases: { ...state.purchases, [key]: purchase },
    }));
  },

  setPurchases: (purchases) => {
    set((state) => {
      const updated = { ...state.purchases };
      for (const purchase of purchases) {
        const key = getPurchaseKey(purchase.sessionId, purchase.language);
        updated[key] = purchase;
      }
      return { purchases: updated };
    });
  },

  removePurchase: (sessionId, language) => {
    const key = getPurchaseKey(sessionId, language);
    set((state) => {
      const { [key]: _, ...rest } = state.purchases;
      return { purchases: rest };
    });
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  resetStore: () => {
    purchaseCache.clear();
    sessionCache.clear();
    set({ purchases: {}, loading: false, error: null });
  },
}));

// --- Selectors (Zustand v5 — individual, never destructure) ---

const purchaseCache = new Map<string, (s: LanguagePurchaseStoreState) => TourLanguagePurchase | null>();

export function selectPurchase(sessionId: string, language: string) {
  const key = getPurchaseKey(sessionId, language);
  let selector = purchaseCache.get(key);
  if (!selector) {
    selector = (s: LanguagePurchaseStoreState) => s.purchases[key] ?? null;
    purchaseCache.set(key, selector);
  }
  return selector;
}

const sessionCache = new Map<string, (s: LanguagePurchaseStoreState) => TourLanguagePurchase[]>();

export function selectPurchasesBySession(sessionId: string) {
  let selector = sessionCache.get(sessionId);
  if (!selector) {
    selector = (s: LanguagePurchaseStoreState) =>
      Object.entries(s.purchases)
        .filter(([key]) => {
          const parts = key.split('_');
          return parts[0] === sessionId;
        })
        .map(([, value]) => value);
    sessionCache.set(sessionId, selector);
  }
  return selector;
}

export const selectLoading = (s: LanguagePurchaseStoreState) => s.loading;
export const selectError = (s: LanguagePurchaseStoreState) => s.error;
