'use client';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { getMyPurchasesClient } from '@/lib/api/purchases-client';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';
import { PurchasedTourCard } from '@/components/catalogue/purchased-tour-card';
import type { PurchasedTour } from '@/types/purchase';
import { visitorAuthUrl } from '@/lib/auth/visitor-routes';
import { useLibraryResumes } from './use-library-resumes';

/**
 * Client-rendered "Mes achats". Auth is resolved from the localStorage Cognito
 * session (useAuth), and purchases via the browser AppSync client — the SSR path
 * (cookies) can't see this app's localStorage tokens. Mirrors useOwnedTourIds.
 */
export function MesVisitesContent({locale = 'fr'}: {locale?: InterfaceLocale}) {
  const { user, isAuthenticated } = useAuth();
  return <LibrarySession key={`${user?.id ?? isAuthenticated}`} locale={locale} />;
}

function LibrarySession({locale}: {locale: InterfaceLocale}) {
  const catalogueHref = translate(locale, '/catalogue', '/en/catalogue');
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchasedTour[]>([]);
  const [error, setError] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const resumes = useLibraryResumes(purchases);

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
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, user?.id, refreshTick]);

  if (authLoading || (isAuthenticated && loading)) {
    return (
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-busy="true" aria-label={translate(locale, 'Chargement de vos achats', 'Loading your purchases')}>
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
          {translate(locale, 'Connectez-vous pour retrouver vos visites achetées.', 'Sign in to find your purchased tours.')}
        </p>
        <Link
          href={visitorAuthUrl(locale, 'login', translate(locale, '/mes-achats', '/en/my-purchases'))}
          className="inline-block bg-grenadine text-paper text-body font-bold px-5 py-2.5 rounded-pill hover:opacity-90 transition no-underline"
        >
          {translate(locale, 'Se connecter', 'Sign in')}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 text-center py-16 bg-paper-soft rounded-xl">
        <p className="text-ink-60 mb-4">
          {translate(locale, 'Impossible de charger vos achats pour le moment. Vos visites ne sont pas perdues — réessayez dans quelques instants.', 'Your purchases cannot be loaded right now. Your tours are safe - please try again shortly.')}
        </p>
        <button
          onClick={() => {
            setLoading(true);
            setError(false);
            setRefreshTick((t) => t + 1);
          }}
          className="min-h-11 px-4 text-grenadine font-medium hover:underline"
        >
          {translate(locale, 'Réessayer', 'Try again')}
        </button>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="mt-8 text-center py-16 bg-paper-soft rounded-xl">
        <p className="text-ink-60 mb-4">
          {translate(locale, "Vous n'avez pas encore d'achat.", 'You have not purchased any tours yet.')}
        </p>
        <Link href={catalogueHref} className="text-grenadine font-medium hover:underline">
          {translate(locale, 'Parcourir le catalogue →', 'Browse the catalogue →')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-ink-60 mb-8">
        {translate(locale, `${purchases.length} ${purchases.length > 1 ? 'visites achetées' : 'visite achetée'}.`, `${purchases.length} purchased tour${purchases.length > 1 ? 's' : ''}.`)}
      </p>
      {resumes.length > 0 && <section className="mb-10" aria-labelledby="library-resume-title">
        <h2 id="library-resume-title" className="font-display text-h4 text-ink mb-2">{translate(locale, 'Reprendre une écoute', 'Continue listening')}</h2>
        <p className="text-body text-ink-80 mb-4">{translate(locale, 'Progression mémorisée sur cet appareil. Le lecteur vérifie la scène et la langue disponibles.', 'Progress saved on this device. The player checks the available scene and language.')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map(id => <PurchasedTourCard key={id} purchase={purchases.find(p => p.tour.id === id)!} locale={locale} resume />)}
        </div>
      </section>}
      {resumes.length > 0 && purchases.some(p => !resumes.includes(p.tour.id)) && <h2 className="font-display text-h4 mb-4">{translate(locale, 'Vos autres visites', 'Your other tours')}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {purchases.filter(p => !resumes.includes(p.tour.id)).map((purchase) => (
          <PurchasedTourCard key={purchase.tour.id} purchase={purchase} locale={locale} />
        ))}
      </div>
    </>
  );
}
