'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

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
  const locale = pathname.startsWith('/en/') || pathname === '/en' ? 'en' : 'fr';
  // `<html lang>` vient du serveur (proxy + layout racine) ; le Studio, qui
  // a sa propre bascule de langue, l'écrit lui-même sans concurrent ici.

  const isStudio = pathname.startsWith('/guide/studio');
  // Pages legacy /guide/{dashboard,tours,profile,revenue} embarquent désormais
  // le même shell que le Studio (StudioHeader + sidebar Murmure). On supprime
  // donc la chrome publique sur ces routes pour éviter la double barre haute.
  const isGuideShell = /^\/guide\/(dashboard|tours|profile|revenue)(\/|$)/.test(pathname);

  // Un seul repère <main> par page (lot 4) : le Studio et l'admin posent le
  // leur, la chrome publique le sien. Le lien d'évitement vise `#contenu`.
  const skipLabel = locale === 'en' ? 'Skip to content' : 'Aller au contenu';
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
    <>
      {skipLink}
      <Header locale={locale} />
      <main id="contenu" className="min-h-screen">{children}</main>
      <Footer locale={locale} />
    </>
  );
}
