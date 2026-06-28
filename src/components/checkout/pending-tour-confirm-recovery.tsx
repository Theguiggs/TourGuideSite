'use client';

/**
 * Replays any pending tour-purchase confirmation on load (mon-1.3b robustness).
 * Mounted once globally. When the user is authenticated, it retries
 * confirmTourPurchase for each persisted paymentIntentId so a payment taken just
 * before the tab died still grants the tour. Renders nothing.
 *
 * confirmTourPurchase is idempotent and Stripe-verified, so replays are safe:
 * - ok            → granted, drop the pending, refresh ownership UI.
 * - NOT_PAID/INVALID/MISMATCH after a grace period → abandoned, drop it.
 * - transient (network) → keep for the next load.
 */

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { confirmTourPurchase } from '@/lib/api/tour-purchase';
import {
  listPendingTourConfirms,
  removePendingTourConfirm,
} from '@/lib/checkout/pending-tour-confirm';
import { emitPurchasesChanged } from '@/lib/checkout/purchase-events';

// confirm-tour-purchase Lambda error codes that mean "will never succeed".
const NOT_PAID = 2622;
const INVALID = 2621;
const MISMATCH = 2623;
// Keep retrying a non-succeeding PI only briefly (payment may still be processing).
const STALE_DROP_MS = 15 * 60 * 1000;

export function PendingTourConfirmRecovery() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    (async () => {
      const pendings = listPendingTourConfirms();
      if (pendings.length === 0) return;
      let recovered = false;

      for (const p of pendings) {
        if (cancelled) return;
        const res = await confirmTourPurchase(p.paymentIntentId);
        if (res.ok) {
          removePendingTourConfirm(p.paymentIntentId);
          recovered = true;
        } else if (
          (res.error.code === NOT_PAID ||
            res.error.code === INVALID ||
            res.error.code === MISMATCH) &&
          Date.now() - p.ts > STALE_DROP_MS
        ) {
          // Definitively not granting — stop retrying.
          removePendingTourConfirm(p.paymentIntentId);
        }
        // Otherwise transient (network / auth) → keep for the next load.
      }

      if (recovered && !cancelled) {
        // Let TourPriceBadge / "Mes achats" / the checkout card refresh ownership.
        emitPurchasesChanged();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return null;
}
