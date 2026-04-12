'use client';

import { useEffect, useRef } from 'react';
import { useStudioConsentStore, selectHasConsented, selectLoadConsent } from '@/lib/stores/studio-consent-store';
import { RgpdConsentBanner } from '@/components/studio/rgpd-consent-banner';
import { logger } from '@/lib/logger';
import { broadcastSync } from '@/lib/studio/broadcast-sync';

const SERVICE_NAME = 'StudioLayout';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const hasConsented = useStudioConsentStore(selectHasConsented);
  const loadConsent = useStudioConsentStore(selectLoadConsent);
  const mainRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col min-h-[60vh]">
      {!hasConsented ? (
        <RgpdConsentBanner />
      ) : (
        <div ref={mainRef} tabIndex={-1} className="outline-none">
          {children}
        </div>
      )}
    </div>
  );
}
