'use client';

import { tg } from '@murmure/design-system/tokens';
import { resetCookieConsent } from '@/lib/cookie-consent';

/** « Modifier mon choix » : oublie le consentement, le bandeau se représente. */
export function CookieChoiceButton({ locale }: { locale: 'fr' | 'en' }) {
  return (
    <button
      type="button"
      onClick={resetCookieConsent}
      className="font-sans underline underline-offset-2"
      style={{ color: tg.colors.grenadine, background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}
    >
      {locale === 'en' ? 'Change my choice' : 'Modifier mon choix'}
    </button>
  );
}
