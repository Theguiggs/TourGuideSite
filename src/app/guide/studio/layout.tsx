'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  useStudioConsentStore,
  selectHasConsented,
  selectLoadConsent,
} from '@/lib/stores/studio-consent-store';
import { RgpdConsentBanner } from '@/components/studio/rgpd-consent-banner';
import { logger } from '@/lib/logger';
import { broadcastSync } from '@/lib/studio/broadcast-sync';
import {
  StudioHeader,
  StudioSidebar,
  type SidebarKey,
} from '@/components/studio/shell';
import { Toaster } from '@/components/studio/feedback';
import { StudioLocaleProvider } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'StudioLayout';

/** Mappe le pathname courant vers la clé de sidebar à mettre en surbrillance. */
function resolveSidebarKey(pathname: string): SidebarKey {
  // Ordre important : tester les routes les plus spécifiques d'abord.
  if (pathname.startsWith('/guide/studio/profil')) return 'profile';
  if (pathname.startsWith('/guide/studio/revenus')) return 'revenus';
  if (pathname.startsWith('/guide/studio/avis')) return 'reviews';
  if (pathname.startsWith('/guide/studio/nouveau')) return 'create';
  if (pathname.startsWith('/guide/studio/tours')) return 'tours';
  // /guide/studio/{sessionId}/... → on est en train d'éditer un tour
  if (/^\/guide\/studio\/[^/]+/.test(pathname)) return 'tours';
  // /guide/studio (racine) → dashboard
  return 'dashboard';
}

function StudioLayoutContent({ children }: { children: React.ReactNode }) {
  const hasConsented = useStudioConsentStore(selectHasConsented);
  const loadConsent = useStudioConsentStore(selectLoadConsent);
  const mainRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);

  const activeKey = useMemo(() => resolveSidebarKey(pathname ?? ''), [pathname]);

  useEffect(() => {
    loadConsent();
    broadcastSync.initialize();
    logger.info(SERVICE_NAME, 'Studio layout mounted');
    return () => {
      broadcastSync.destroy();
    };
  }, [loadConsent]);

  useEffect(() => {
    if (hasConsented && mainRef.current) {
      mainRef.current.focus();
    }
  }, [hasConsented]);

  // RGPD : tant que le consentement n'est pas donné, on n'affiche que le bandeau.
  if (!hasConsented) {
    return (
      <div className="flex flex-col min-h-[60vh]">
        <RgpdConsentBanner />
      </div>
    );
  }

  return (
    <div
      ref={mainRef}
      tabIndex={-1}
      className="outline-none flex flex-col min-h-screen bg-paper-soft"
    >
      <StudioHeader
        menuOpen={navigationOpen}
        onMenuToggle={() => setNavigationOpen((value) => !value)}
      />
      <div className="relative flex-1 min-h-0 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <StudioSidebar active={activeKey} className="hidden lg:flex" />
        {navigationOpen && (
          <>
            <button
              type="button"
              aria-label="Fermer la navigation"
              onClick={() => setNavigationOpen(false)}
              className="fixed inset-0 top-16 z-40 bg-ink/30 lg:hidden"
            />
            <div className="fixed bottom-0 left-0 top-16 z-50 lg:hidden">
              <StudioSidebar
                active={activeKey}
                onNavigate={() => setNavigationOpen(false)}
                className="shadow-lg"
              />
            </div>
          </>
        )}
        <main className="min-w-0 overflow-y-auto bg-paper-soft">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudioLocaleProvider>
      <StudioLayoutContent>{children}</StudioLayoutContent>
    </StudioLocaleProvider>
  );
}
