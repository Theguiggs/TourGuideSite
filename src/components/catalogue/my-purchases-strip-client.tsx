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
 */
export function MyPurchasesStripClient({locale = 'fr'}: {locale?: 'fr' | 'en'}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [purchases, setPurchases] = useState<PurchasedTour[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const onChanged = () => setRefreshTick((t) => t + 1);
    window.addEventListener(PURCHASES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(PURCHASES_CHANGED_EVENT, onChanged);
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setPurchases([]);
      return;
    }
    let cancelled = false;
    getMyPurchasesClient().then((res) => {
      if (!cancelled) setPurchases(res.purchases);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, user?.id, refreshTick]);

  if (purchases.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
      <MyPurchasesStrip purchases={purchases} locale={locale} />
    </div>
  );
}
