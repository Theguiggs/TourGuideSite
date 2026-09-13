'use client';
import { translate } from '@/lib/i18n/translate';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Header from './Header';
import { setStoredStudioLocale, useStoredStudioLocale, notifyServiceWorkerLocale } from '@/lib/i18n/studio-locale';
import Footer from './Footer';
import { VisitorBottomNav } from './auth/visitor-bottom-nav';
import { localeFromPath } from '@/lib/site';

interface SiteChromeProps {
  children: React.ReactNode;
}

/**
 * <SiteChrome> — wrapper client qui rend `<Header>` + `<main>` + `<Footer>`
 * en conditionnant Header/Footer selon la route.
 *
 * Le Studio Murmure (`/guide/studio/*`) embarque son propre shell complet
 * (StudioHeader + StudioSidebar + StudioToaster) — on doit donc supprimer
 * la chrome publique pour éviter la double barre haute legacy.
 */
export function SiteChrome({ children }: SiteChromeProps) {
  const pathname = usePathname() ?? '';
  // Les pages publiques du Studio n'ont pas de variante `/en/…` : leur langue
  // est celle du Studio (stockage local), basculée par bouton dans l'en-tête.
  const isPublicGuidePage = /^\/guide\/(login|signup|reset-password)$/.test(pathname);
  const studioLocale = useStoredStudioLocale();
  const isAdminPage = /^\/admin(\/|$)/.test(pathname);
  const isProtectedPath = /^\/(guide|admin)(\/|$)/.test(pathname);
  const locale = isProtectedPath
    ? studioLocale
    : localeFromPath(pathname);
  useEffect(() => {
    if (!/^\/(guide|admin)(\/|$)/.test(pathname)) setStoredStudioLocale(localeFromPath(pathname));
  }, [pathname]);
  useEffect(() => {
    document.documentElement.lang = locale;
    const notify = () => notifyServiceWorkerLocale(locale);
    notify();
    navigator.serviceWorker?.addEventListener('controllerchange', notify);
    return () => navigator.serviceWorker?.removeEventListener('controllerchange', notify);
  }, [locale]);

  const isStudio = pathname.startsWith('/guide/studio');
  // Pages legacy /guide/{dashboard,tours,profile,revenue} embarquent désormais
  // le même shell que le Studio (StudioHeader + sidebar Murmure). On supprime
  // donc la chrome publique sur ces routes pour éviter la double barre haute.
  const isGuideShell = /^\/guide\/(dashboard|tours|profile|revenue)(\/|$)/.test(pathname);
  const showVisitorNav = !isProtectedPath
    && !/^\/(connexion|inscription|mot-de-passe-oublie|(?:en|es|de|it|nl)\/(sign-in|sign-up|reset-password))$/.test(pathname);

  // Un seul repère <main> par page (lot 4) : le Studio et l'admin posent le
  // leur, la chrome publique le sien. Le lien d'évitement vise `#contenu`.
  const skipLabel = translate(locale, 'Aller au contenu', 'Skip to content');
  const skipLink = (
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-md focus:bg-ink focus:px-4 focus:py-3 focus:text-paper focus:no-underline"
    >
      {skipLabel}
    </a>
  );

  if (isStudio || isGuideShell) {
    return (
      <div className="min-h-screen">
        {skipLink}
        {children}
      </div>
    );
  }

  return (
    <div className={showVisitorNav ? 'visitor-shell' : undefined}>
      {skipLink}
      <Header locale={locale} onLocaleChange={isPublicGuidePage || isAdminPage ? setStoredStudioLocale : undefined} />
      <main id="contenu" className="min-h-screen">{children}</main>
      <Footer locale={locale} />
      {showVisitorNav && <VisitorBottomNav locale={locale} pathname={pathname} />}
    </div>
  );
}
