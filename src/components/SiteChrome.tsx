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

  if (isStudio) {
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
