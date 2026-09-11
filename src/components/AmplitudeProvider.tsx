'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { initAmplitude } from '@/lib/amplitude';
import { readCookieConsent, subscribeCookieConsent } from '@/lib/cookie-consent';
import CookieConsentBanner from '@/components/CookieConsentBanner';

const getServerSnapshot = () => null;

/**
 * Amplitude ne démarre qu'avec le consentement du visiteur. Avant lui, `track`
 * est un no-op (`initialized` reste faux) : aucun identifiant n'est écrit,
 * aucun événement ne part. Le bandeau vit ici pour que la décision et son
 * effet soient au même endroit.
 */
export default function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  const consent = useSyncExternalStore(subscribeCookieConsent, readCookieConsent, getServerSnapshot);
  // Sans clé au build (développement, CI), rien ne peut être mesuré : on ne
  // demande pas un consentement qui ne servirait à rien.
  const measurable = Boolean(process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY);

  useEffect(() => {
    if (measurable && consent === 'accepted') initAmplitude();
  }, [consent, measurable]);

  return (
    <>
      {children}
      {measurable && <CookieConsentBanner />}
    </>
  );
}
