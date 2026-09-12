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
import { useAuth } from '@/lib/auth/auth-context';
import { getOwnGuideProfile } from '@/lib/api/appsync-client';
import { shouldUseStubs } from '@/config/api-mode';
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
  const { user } = useAuth();
  // Le bandeau n'est montré qu'une fois le profil consulté : sinon il
  // apparaît puis disparaît quand le profil confirme le consentement.
  const [profileChecked, setProfileChecked] = useState(false);
  const hydrateFromProfile = useStudioConsentStore((st) => st.hydrateFromProfile);

  const activeKey = useMemo(() => resolveSidebarKey(pathname ?? ''), [pathname]);

  useEffect(() => {
    loadConsent();
    broadcastSync.initialize();
    logger.info(SERVICE_NAME, 'Studio layout mounted');
    return () => {
      broadcastSync.destroy();
    };
  }, [loadConsent]);

  // Consentement porté par le profil : un guide qui a accepté sur un autre
  // navigateur ne relit pas le bandeau (lot 6.2).
  const userId = user?.id ?? null;
  const needsProfileCheck = !hasConsented && Boolean(userId) && !shouldUseStubs();
  useEffect(() => {
    if (!needsProfileCheck || !userId) return;
    let cancelled = false;
    getOwnGuideProfile(userId, 'userPool')
      .then((profile) => {
        if (cancelled || !profile) return;
        const row = profile as { rgpdConsentVersion?: string | null; rgpdConsentAt?: string | null };
        hydrateFromProfile(row.rgpdConsentVersion, row.rgpdConsentAt);
      })
      .catch(() => { /* le bandeau reste : c'est le comportement sûr */ })
      .finally(() => { if (!cancelled) setProfileChecked(true); });
    return () => { cancelled = true; };
  }, [needsProfileCheck, userId, hydrateFromProfile]);

  useEffect(() => {
    if (hasConsented && mainRef.current) {
      mainRef.current.focus();
    }
  }, [hasConsented]);

  // RGPD : tant que le consentement n'est pas donné, on n'affiche que le bandeau.
  if (needsProfileCheck && !profileChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-busy="true">
        <p className="text-ink-60">Chargement…</p>
      </div>
    );
  }
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
        <main id="contenu" className="min-w-0 overflow-y-auto bg-paper-soft">{children}</main>
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
