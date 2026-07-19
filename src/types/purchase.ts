import type { Tour } from '@/types/tour';

/** One owned tour joined with its purchase metadata (date + amount paid). */
export interface PurchasedTour {
  tour: Tour;
  /** ISO timestamp of the purchase (TourPurchase.createdAt). */
  purchasedAt: string;
  amountCents?: number;
  source?: string;
}

export interface MyPurchasesResult {
  authenticated: boolean;
  purchases: PurchasedTour[];
  /** True when the purchase list could not be loaded (backend error) — the UI
   *  must NOT present this as "no purchases yet". */
  error?: boolean;
}
