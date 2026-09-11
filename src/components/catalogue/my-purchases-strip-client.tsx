'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getMyPurchasesClient } from '@/lib/api/purchases-client';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';
import { MyPurchasesStrip } from '@/components/catalogue/my-purchases-strip';
import type { PurchasedTour } from '@/types/purchase';

/**
 * Self-fetching "Mes achats" strip for /catalogue. Resolves the owner-scoped
 * purchases client-side (localStorage Cognito session) — the SSR catalogue is
 * owner-agnostic and can't see this app's localStorage tokens. Renders nothing
 * for guests or empty purchase lists.
 *
 * Pour un visiteur connecté, la place de la bande est réservée par un
 * squelette pendant la lecture : la bande apparaissait d'un coup au-dessus de
 * la grille des villes, qui sautait vers le bas.
 */
export function MyPurchasesStripClient({locale = 'fr'}: {locale?: 'fr' | 'en'}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [purchases, setPurchases] = useState<PurchasedTour[] | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const onChanged = () => setRefreshTick((t) => t + 1);
    window.addEventListener(PURCHASES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(PURCHASES_CHANGED_EVENT, onChanged);
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    let cancelled = false;
    getMyPurchasesClient().then((res) => {
      if (!cancelled) setPurchases(res.purchases);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, user?.id, refreshTick]);

  if (isLoading || !isAuthenticated) return null;

  if (purchases === null) {
    return (
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12"
        role="status"
        aria-busy="true"
        aria-label={locale === 'en' ? 'Loading my purchases' : 'Chargement de mes achats'}
        data-testid="my-purchases-strip-skeleton"
      >
        <div className="mb-10 animate-pulse">
          <div className="h-6 w-40 rounded bg-paper-deep mb-4" />
          <div className="flex gap-3 overflow-hidden pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-40 rounded-lg border border-line overflow-hidden">
                <div className="h-24 bg-paper-deep" />
                <div className="p-2">
                  <div className="h-3 w-3/4 rounded bg-paper-deep" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (purchases.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
      <MyPurchasesStrip purchases={purchases} locale={locale} />
    </div>
  );
}
