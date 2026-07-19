'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { PinNegatif } from '@murmure/design-system/web';
import { useAuth } from '@/lib/auth/auth-context';
import { localizePublicPath } from '@/lib/i18n/public-routes';

interface HeaderProps {
  locale?: 'fr' | 'en';
}

const HEADER_COPY = {
  fr: {
    help: 'Aide',
    purchases: 'Mes achats',
    signOut: 'Déconnexion',
    guideSpace: 'Espace Guide',
    download: "Télécharger l'app",
    closeMenu: 'Fermer le menu',
    openMenu: 'Ouvrir le menu',
  },
  en: {
    help: 'Help',
    purchases: 'My purchases',
    signOut: 'Sign out',
    guideSpace: 'Guide area',
    download: 'Download the app',
    closeMenu: 'Close menu',
    openMenu: 'Open menu',
  },
} as const;

export default function Header({ locale = 'fr' }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() ?? '/';
  const { isAuthenticated, isAdmin, isGuide, user, signOut } = useAuth();
  const copy = HEADER_COPY[locale];
  const homeHref = locale === 'en' ? '/en' : '/';
  const catalogueHref = locale === 'en' ? '/en/catalogue' : '/catalogue';
  const helpHref = locale === 'en' ? '/en/help' : '/aide';
  // Tourists have no dashboard — their account destination is their purchases.
  const purchasesHref = locale === 'en' ? '/en/my-purchases' : '/mes-visites';
  const accountHref = isAdmin ? '/admin/moderation' : isGuide ? '/guide/dashboard' : purchasesHref;

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-line">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Murmure : PinNegatif grenadine + wordmark DM Serif Display */}
          <Link href={homeHref} className="flex items-center gap-2.5 no-underline">
            <PinNegatif size={26} bg="grenadine" fg="paper" />
            <span
              className="font-display text-ink leading-none"
              style={{ fontSize: '1.375rem', letterSpacing: '-0.01em' }}
            >
              Murmure
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href={catalogueHref}
              className="text-caption text-ink-60 hover:text-ink font-medium no-underline transition"
            >
              Catalogue
            </Link>
            <Link
              href={helpHref}
              className="text-caption text-ink-60 hover:text-ink font-medium no-underline transition"
            >
              {copy.help}
            </Link>
            <nav
              aria-label={locale === 'fr' ? 'Choisir la langue' : 'Choose language'}
              className="inline-flex overflow-hidden rounded-md border border-line"
            >
              {(['fr', 'en'] as const).map((targetLocale) => (
                <Link
                  key={targetLocale}
                  href={localizePublicPath(pathname, targetLocale)}
                  hrefLang={targetLocale}
                  aria-current={locale === targetLocale ? 'page' : undefined}
                  className={`px-2.5 py-1.5 text-meta font-bold no-underline ${
                    locale === targetLocale ? 'bg-ink text-paper' : 'bg-paper text-ink-60'
                  }`}
                >
                  {targetLocale.toUpperCase()}
                </Link>
              ))}
            </nav>
            {isAuthenticated ? (
              <>
                <Link
                  href={purchasesHref}
                  className="text-caption text-ink-60 hover:text-ink font-medium no-underline transition"
                >
                  {copy.purchases}
                </Link>
                <Link
                  href={accountHref}
                  className="text-caption text-ink-60 hover:text-ink font-medium no-underline transition"
                >
                  {user?.displayName}
                </Link>
                <button
                  onClick={signOut}
                  className="text-meta text-ink-40 hover:text-grenadine font-medium transition"
                >
                  {copy.signOut}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/guide/login"
                  className="text-caption text-ink-60 hover:text-ink font-medium no-underline transition"
                >
                  {copy.guideSpace}
                </Link>
                <Link
                  href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
                  className="bg-grenadine text-paper text-caption font-bold px-4 py-2 rounded-pill hover:opacity-90 transition no-underline"
                >
                  {copy.download}
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-ink-60 hover:text-ink"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? copy.closeMenu : copy.openMenu}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-line">
            <Link
              href={catalogueHref}
              className="block py-3 text-caption text-ink-60 hover:text-ink font-medium no-underline"
              onClick={() => setMenuOpen(false)}
            >
              Catalogue
            </Link>
            <Link
              href={helpHref}
              className="block py-3 text-caption text-ink-60 hover:text-ink font-medium no-underline"
              onClick={() => setMenuOpen(false)}
            >
              {copy.help}
            </Link>
            <div className="flex gap-2 py-3" aria-label={locale === 'fr' ? 'Choisir la langue' : 'Choose language'}>
              {(['fr', 'en'] as const).map((targetLocale) => (
                <Link
                  key={targetLocale}
                  href={localizePublicPath(pathname, targetLocale)}
                  hrefLang={targetLocale}
                  aria-current={locale === targetLocale ? 'page' : undefined}
                  className={`px-3 py-2 rounded-md text-meta font-bold no-underline ${
                    locale === targetLocale ? 'bg-ink text-paper' : 'bg-paper-deep text-ink-60'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {targetLocale.toUpperCase()}
                </Link>
              ))}
            </div>
            {isAuthenticated ? (
              <>
                <Link
                  href={purchasesHref}
                  className="block py-3 text-caption text-ink-60 hover:text-ink font-medium no-underline"
                  onClick={() => setMenuOpen(false)}
                >
                  {copy.purchases}
                </Link>
                {(isGuide || isAdmin) && (
                  <Link
                    href={accountHref}
                    className="block py-3 text-caption text-grenadine font-medium no-underline"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="block py-3 text-caption text-ink-40 hover:text-grenadine font-medium"
                >
                  {copy.signOut}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/guide/login"
                  className="block py-3 text-caption text-ink-60 hover:text-ink font-medium no-underline"
                  onClick={() => setMenuOpen(false)}
                >
                  {copy.guideSpace}
                </Link>
                <Link
                  href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
                  className="block py-3 text-caption text-grenadine font-medium no-underline"
                  onClick={() => setMenuOpen(false)}
                >
                  {copy.download}
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
