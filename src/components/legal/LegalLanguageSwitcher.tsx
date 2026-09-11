import Link from 'next/link';
import { tg } from '@murmure/design-system/tokens';

interface LegalLanguageSwitcherProps {
  locale: 'fr' | 'en';
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
      aria-label={locale === 'fr' ? 'Choisir la langue' : 'Choose language'}
      className="inline-flex mt-6 border border-line rounded-md overflow-hidden"
    >
      <Link
        href={frenchHref}
        hrefLang="fr"
        aria-current={locale === 'fr' ? 'page' : undefined}
        className="inline-flex min-h-11 items-center px-4 font-sans no-underline"
        style={{
          color: locale === 'fr' ? tg.colors.paper : tg.colors.ink,
          backgroundColor: locale === 'fr' ? tg.colors.grenadine : tg.colors.paper,
          fontWeight: 600,
        }}
      >
        FR
      </Link>
      <Link
        href={englishHref}
        hrefLang="en"
        aria-current={locale === 'en' ? 'page' : undefined}
        className="inline-flex min-h-11 items-center px-4 font-sans no-underline border-l border-line"
        style={{
          color: locale === 'en' ? tg.colors.paper : tg.colors.ink,
          backgroundColor: locale === 'en' ? tg.colors.grenadine : tg.colors.paper,
          fontWeight: 600,
        }}
      >
        EN
      </Link>
    </nav>
  );
}
