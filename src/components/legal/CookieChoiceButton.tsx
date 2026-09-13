'use client';

import { tg } from '@murmure/design-system/tokens';
import { resetCookieConsent } from '@/lib/cookie-consent';
import type { InterfaceLocale } from '@/lib/i18n/locales';

/** « Modifier mon choix » : oublie le consentement, le bandeau se représente. */
export function CookieChoiceButton({ locale }: { locale: InterfaceLocale }) {
  return (
    <button
      type="button"
      onClick={resetCookieConsent}
      className="font-sans underline underline-offset-2"
      style={{ color: tg.colors.grenadine, background: 'none', border: 0, padding: 0, cursor: 'pointer', font: 'inherit' }}
    >
      {{fr: 'Modifier mon choix', en: 'Change my choice', es: 'Cambiar mi elección', de: 'Meine Auswahl ändern', it: 'Modifica la mia scelta', nl: 'Mijn keuze wijzigen'}[locale]}
    </button>
  );
}
