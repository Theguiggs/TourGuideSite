'use client';
import { translate, extendCopy } from '@/lib/i18n/translate';

/**
 * Bandeau de consentement à la mesure d'audience.
 *
 * Affiché tant qu'aucun choix n'est enregistré ; les deux boutons ont le même
 * poids visuel (refuser doit être aussi simple qu'accepter). Rien n'est
 * mesuré avant « Accepter » : voir `AmplitudeProvider`.
 */

import Link from 'next/link';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { readCookieConsent, subscribeCookieConsent, writeCookieConsent } from '@/lib/cookie-consent';
import { localeFromPath } from '@/lib/site';
import { useStoredStudioLocale } from '@/lib/i18n/studio-locale';

const COPY = extendCopy({
  fr: {
    text: 'Murmure mesure l’audience de son site (Amplitude, hébergé dans l’UE, sans adresse IP) pour comprendre ce qui est consulté. Aucune publicité, aucun suivi entre sites.',
    more: 'En savoir plus',
    accept: 'Accepter',
    refuse: 'Refuser',
    privacy: '/confidentialite',
  },
  en: {
    text: 'Murmure measures site audience (Amplitude, hosted in the EU, no IP address) to understand what is being read. No advertising, no cross-site tracking.',
    more: 'Learn more',
    accept: 'Accept',
    refuse: 'Refuse',
    privacy: '/en/privacy',
  },
});

const getServerSnapshot = () => 'pending' as const;

export default function CookieConsentBanner() {
  const pathname = usePathname() ?? '';
  const studioLocale = useStoredStudioLocale();
  const locale = /^\/(guide|admin)(\/|$)/.test(pathname) ? studioLocale : localeFromPath(pathname);
  const copy = COPY[locale];
  const consent = useSyncExternalStore(subscribeCookieConsent, readCookieConsent, getServerSnapshot);
  const banner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (consent !== null || !banner.current) return;
    const measure = () => document.body.style.setProperty('--visitor-consent-height', `${banner.current?.getBoundingClientRect().height ?? 0}px`);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(banner.current);
    return () => { observer?.disconnect(); document.body.style.removeProperty('--visitor-consent-height'); };
  }, [consent]);

  // 'pending' = rendu serveur / hydratation : on ne montre rien tant que le
  // navigateur n'a pas dit s'il connaît déjà un choix.
  if (consent !== null) return null;

  return (
    <div
      ref={banner}
      role="dialog"
      aria-live="polite"
      aria-label={translate(locale, 'Mesure d’audience', 'Audience measurement')}
      data-testid="cookie-consent-banner"
      className="fixed inset-x-0 z-50 border-t border-line bg-paper px-4 py-4 shadow-lg sm:px-6"
      style={{ bottom: 'var(--visitor-overlay-height, var(--visitor-nav-height, 0px))' }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-caption text-ink-80 m-0">
          {copy.text}{' '}
          <Link href={copy.privacy} className="text-grenadine underline underline-offset-2">
            {copy.more}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => writeCookieConsent('refused')}
            className="min-h-11 rounded-pill border border-line bg-paper px-4 py-2 font-sans text-caption font-semibold text-ink hover:bg-paper-soft"
          >
            {copy.refuse}
          </button>
          <button
            type="button"
            onClick={() => writeCookieConsent('accepted')}
            className="min-h-11 rounded-pill border border-ink bg-ink px-4 py-2 font-sans text-caption font-semibold text-paper hover:opacity-90"
          >
            {copy.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
