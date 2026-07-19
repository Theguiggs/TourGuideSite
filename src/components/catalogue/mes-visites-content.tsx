'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { getMyPurchasesClient } from '@/lib/api/purchases-client';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';
import { PurchasedTourCard } from '@/components/catalogue/purchased-tour-card';
import type { PurchasedTour } from '@/types/purchase';

/**
 * Client-rendered "Mes achats". Auth is resolved from the localStorage Cognito
 * session (useAuth), and purchases via the browser AppSync client — the SSR path
 * (cookies) can't see this app's localStorage tokens. Mirrors useOwnedTourIds.
 */
export function MesVisitesContent({locale = 'fr'}: {locale?: 'fr' | 'en'}) {
  const catalogueHref = locale === 'en' ? '/en/catalogue' : '/catalogue';
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchasedTour[]>([]);
  const [error, setError] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Refetch when a purchase is recorded (new buy / recovered pending).
  useEffect(() => {
    const onChanged = () => setRefreshTick((t) => t + 1);
    window.addEventListener(PURCHASES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(PURCHASES_CHANGED_EVENT, onChanged);
  }, []);

  useEffect(() => {
    if (authLoading) return; // wait until the session is resolved
    if (!isAuthenticated) {
      return;
    }
    let cancelled = false;
    getMyPurchasesClient()
      .then((res) => {
        if (cancelled) return;
        setPurchases(res.purchases);
        setError(!!res.error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user?.id, refreshTick]);

  if (authLoading || (isAuthenticated && loading)) {
    return (
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-line overflow-hidden">
            <div className="h-40 bg-paper-deep animate-pulse" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-paper-deep rounded animate-pulse w-3/4" />
              <div className="h-3 bg-paper-deep rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mt-8 text-center py-16 bg-paper-soft rounded-xl">
        <p className="text-ink-60 mb-4">
          {locale === 'en'
            ? 'Sign in to find your purchased tours.'
            : 'Connectez-vous pour retrouver vos visites achetées.'}
        </p>
        <Link
          href={`/guide/login?returnTo=${encodeURIComponent(locale === 'en' ? '/en/my-purchases' : '/mes-visites')}`}
          className="inline-block bg-grenadine text-paper text-sm font-bold px-5 py-2.5 rounded-pill hover:opacity-90 transition no-underline"
        >
          {locale === 'en' ? 'Sign in' : 'Se connecter'}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 text-center py-16 bg-paper-soft rounded-xl">
        <p className="text-ink-60 mb-4">
          {locale === 'en'
            ? 'Your purchases cannot be loaded right now. Your tours are safe - please try again shortly.'
            : 'Impossible de charger vos achats pour le moment. Vos visites ne sont pas perdues — réessayez dans quelques instants.'}
        </p>
        <button
          onClick={() => {
            setLoading(true);
            setError(false);
            setRefreshTick((t) => t + 1);
          }}
          className="text-grenadine font-medium hover:underline"
        >
          {locale === 'en' ? 'Try again' : 'Réessayer'}
        </button>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="mt-8 text-center py-16 bg-paper-soft rounded-xl">
        <p className="text-ink-60 mb-4">
          {locale === 'en' ? 'You have not purchased any tours yet.' : "Vous n'avez pas encore d'achat."}
        </p>
        <Link href={catalogueHref} className="text-grenadine font-medium hover:underline">
          {locale === 'en' ? 'Browse the catalogue →' : 'Parcourir le catalogue →'}
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-ink-60 mb-8">
        {locale === 'en'
          ? `${purchases.length} tour${purchases.length > 1 ? 's' : ''}, yours to keep.`
          : `${purchases.length} ${purchases.length > 1 ? 'visites' : 'visite'} à vous, pour toujours.`}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {purchases.map((purchase) => (
          <PurchasedTourCard key={purchase.tour.id} purchase={purchase} locale={locale} />
        ))}
      </div>
    </>
  );
}
