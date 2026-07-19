'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, PanelsTopLeft, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { localizePublicPath } from '@/lib/i18n/public-routes';
import { MurmureLogo } from '@/components/shell/MurmureLogo';

interface HeaderProps {
  locale?: 'fr' | 'en';
}

const HEADER_COPY = {
  fr: {
    help: 'Aide',
    purchases: 'Mes achats',
    signOut: 'Déconnexion',
    guideSpace: 'Espace Guide',
    studio: 'Créer',
    admin: 'Administrer',
    download: "Télécharger l'app",
    closeMenu: 'Fermer le menu',
    openMenu: 'Ouvrir le menu',
  },
  en: {
    help: 'Help',
    purchases: 'My purchases',
    signOut: 'Sign out',
    guideSpace: 'Guide area',
    studio: 'Create',
    admin: 'Admin',
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
  const accountHref = isAdmin ? '/admin/moderation' : isGuide ? '/guide/studio' : purchasesHref;

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-line">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={homeHref} className="flex items-center gap-2.5 no-underline">
            <MurmureLogo size={26} />
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
                {(isGuide || isAdmin) && (
                  <Link
                    href={accountHref}
                    className="inline-flex items-center gap-1.5 text-caption text-grenadine hover:text-ink font-semibold no-underline transition"
                  >
                    <PanelsTopLeft size={16} aria-hidden="true" />
                    {isAdmin ? copy.admin : copy.studio}
                  </Link>
                )}
                <span className="max-w-32 truncate text-caption font-semibold text-ink">
                  {user?.displayName}
                </span>
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

          <button
            className="md:hidden p-2 text-ink-60 hover:text-ink"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? copy.closeMenu : copy.openMenu}
          >
            {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
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
                    className="flex items-center gap-2 py-3 text-caption text-grenadine font-semibold no-underline"
                    onClick={() => setMenuOpen(false)}
                  >
                    <PanelsTopLeft size={17} aria-hidden="true" />
                    {isAdmin ? copy.admin : copy.studio}
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
