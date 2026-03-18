'use client';

import { useEffect, useRef } from 'react';
import { useStudioConsentStore, selectHasConsented, selectLoadConsent } from '@/lib/stores/studio-consent-store';
import { useStudioSessionStore, selectCurrentStep, selectCompletedSteps } from '@/lib/stores/studio-session-store';
import { RgpdConsentBanner } from '@/components/studio/rgpd-consent-banner';
import { StudioProgressBar } from '@/components/studio/progress-bar';
import { logger } from '@/lib/logger';
import { broadcastSync } from '@/lib/studio/broadcast-sync';

const SERVICE_NAME = 'StudioLayout';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  const hasConsented = useStudioConsentStore(selectHasConsented);
  const loadConsent = useStudioConsentStore(selectLoadConsent);
  const currentStep = useStudioSessionStore(selectCurrentStep);
  const completedSteps = useStudioSessionStore(selectCompletedSteps);
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
      <StudioProgressBar currentStep={currentStep} completedSteps={[...completedSteps]} />

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
