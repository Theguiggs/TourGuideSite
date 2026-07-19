'use client';

import { useEffect, useState } from 'react';
import { listOwnedTourIds } from '@/lib/api/tour-purchase';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * Set of tourIds the current user owns — resolved client-side (the SSR catalogue
 * pages are owner-agnostic). Per-user "Acheté" badging across any list.
 *
 * Module-level cache keyed by user id: every <TourPriceBadge> island mounted on
 * the same page shares ONE `listOwnedTourIds()` request instead of one each.
 * Cleared on sign-out / user change so it never leaks across identities.
 */
let cacheKey: string | null = null;
let cachePromise: Promise<Set<string>> | null = null;

/** Test-only: drop the module cache so each test starts clean. */
export function __resetOwnedTourIdsCache(): void {
  cacheKey = null;
  cachePromise = null;
}

export function useOwnedTourIds(): Set<string> {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? null;
  const [owned, setOwned] = useState<Set<string>>(new Set());
  // Bumped on 'murmure:purchases-changed' (new purchase / recovered pending) to
  // force a refetch so "Acheté" badges update without a page reload.
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const onChanged = () => {
      cacheKey = null;
      cachePromise = null;
      setRefreshTick((t) => t + 1);
    };
    window.addEventListener(PURCHASES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(PURCHASES_CHANGED_EVENT, onChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Resolve via a promise in every branch so setOwned is only ever called from
    // an async callback (never synchronously in the effect body).
    if (!isAuthenticated || !userId) {
      cacheKey = null;
      cachePromise = null;
    } else if (cacheKey !== userId || !cachePromise) {
      cacheKey = userId;
      cachePromise = listOwnedTourIds();
    }
    const pending = cachePromise ?? Promise.resolve(new Set<string>());
    pending.then((ids) => {
      if (!cancelled) setOwned(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, refreshTick]);

  return owned;
}
