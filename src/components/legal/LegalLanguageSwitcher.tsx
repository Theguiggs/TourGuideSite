import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';
import { SITE_LOCALES, type InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';

interface LegalLanguageSwitcherProps {
  locale: InterfaceLocale;
  frenchHref: string;
  englishHref: string;
}

export function LegalLanguageSwitcher({
  locale,
  frenchHref,
  englishHref,
}: LegalLanguageSwitcherProps) {
  return (
    <nav
      aria-label={{fr: 'Choisir la langue', en: 'Choose language', es: 'Elegir idioma', de: 'Sprache wählen', it: 'Scegli la lingua', nl: 'Taal kiezen'}[locale]}
      className="inline-flex max-w-full flex-wrap mt-6 border border-line rounded-md overflow-hidden"
    >
      {SITE_LOCALES.map(language => <Link
        key={language}
        href={language === 'en' ? englishHref : localizePublicPath(frenchHref, language)}
        hrefLang={language}
        aria-current={locale === language ? 'page' : undefined}
        className="inline-flex min-h-11 items-center px-4 font-sans no-underline"
        style={{
          color: locale === language ? tg.colors.paper : tg.colors.ink,
          backgroundColor: locale === language ? tg.colors.grenadine : tg.colors.paper,
          fontWeight: 600,
        }}
      >
        {language.toUpperCase()}
      </Link>)}
    </nav>
  );
}
