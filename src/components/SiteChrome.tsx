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
  const isStudio = pathname.startsWith('/guide/studio');
  // Pages legacy /guide/{dashboard,tours,profile,revenue} embarquent désormais
  // le même shell que le Studio (StudioHeader + sidebar Murmure). On supprime
  // donc la chrome publique sur ces routes pour éviter la double barre haute.
  const isGuideShell = /^\/guide\/(dashboard|tours|profile|revenue)(\/|$)/.test(pathname);

  if (isStudio || isGuideShell) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
