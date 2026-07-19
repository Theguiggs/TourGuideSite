'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ChevronDown,
  Compass,
  HelpCircle,
  LogOut,
  Menu,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { useStudioLocale } from '@/lib/i18n/studio-locale';
import { MurmureLogo } from '@/components/shell/MurmureLogo';

interface StudioHeaderProps {
  menuOpen?: boolean;
  onMenuToggle?: () => void;
}

const COPY = {
  fr: {
    studio: 'Studio',
    explore: 'Explorer',
    help: 'Aide',
    profile: 'Mon profil',
    signOut: 'Se déconnecter',
    openNavigation: 'Ouvrir la navigation',
    closeNavigation: 'Fermer la navigation',
    chooseLanguage: 'Choisir la langue',
  },
  en: {
    studio: 'Studio',
    explore: 'Explore',
    help: 'Help',
    profile: 'My profile',
    signOut: 'Sign out',
    openNavigation: 'Open navigation',
    closeNavigation: 'Close navigation',
    chooseLanguage: 'Choose language',
  },
} as const;

export function StudioHeader({ menuOpen = false, onMenuToggle = () => undefined }: StudioHeaderProps) {
  const { user, signOut } = useAuth();
  const { locale, setLocale } = useStudioLocale();
  const [accountOpen, setAccountOpen] = useState(false);
  const copy = COPY[locale];
  const initial = (user?.displayName ?? 'S').trim().charAt(0).toUpperCase() || 'S';
  const publicHelpHref = locale === 'en' ? '/en/help' : '/aide';
  const publicCatalogueHref = locale === 'en' ? '/en/catalogue' : '/catalogue';

  return (
    <header
      className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8"
      data-testid="studio-header"
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label={menuOpen ? copy.closeNavigation : copy.openNavigation}
          aria-expanded={menuOpen}
          className="inline-flex h-10 w-10 items-center justify-center text-ink-60 hover:text-ink lg:hidden"
        >
          {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        <Link href="/guide/studio" className="no-underline">
          <MurmureLogo size={26} contextLabel={copy.studio} />
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href={publicCatalogueHref}
          className="hidden items-center gap-1.5 text-caption font-semibold text-ink-60 no-underline transition hover:text-ink md:inline-flex"
        >
          <Compass size={17} aria-hidden="true" />
          {copy.explore}
        </Link>
        <Link
          href={publicHelpHref}
          aria-label={copy.help}
          title={copy.help}
          className="hidden h-9 w-9 items-center justify-center text-ink-60 no-underline transition hover:text-ink sm:inline-flex"
        >
          <HelpCircle size={18} aria-hidden="true" />
        </Link>

        <div
          className="inline-flex overflow-hidden rounded-md border border-line"
          aria-label={copy.chooseLanguage}
        >
          {(['fr', 'en'] as const).map((targetLocale) => (
            <button
              key={targetLocale}
              type="button"
              onClick={() => setLocale(targetLocale)}
              aria-pressed={locale === targetLocale}
              className={`min-h-8 px-2 text-meta font-bold transition ${
                locale === targetLocale ? 'bg-ink text-paper' : 'bg-paper text-ink-60 hover:text-ink'
              }`}
            >
              {targetLocale.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            data-testid="studio-header-user"
            className="flex h-10 items-center gap-2 rounded-md px-1.5 transition hover:bg-paper-soft"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-grenadine text-meta font-bold text-paper">
              {initial}
            </span>
            <span className="hidden max-w-32 truncate text-caption font-semibold text-ink lg:inline">
              {user?.displayName ?? (locale === 'en' ? 'Guest' : 'Invité')}
            </span>
            <ChevronDown size={15} className="hidden text-ink-40 sm:block" aria-hidden="true" />
          </button>

          {accountOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-52 rounded-md border border-line bg-card py-1 shadow-md"
            >
              <Link
                href="/guide/studio/profil"
                role="menuitem"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-caption text-ink-80 no-underline hover:bg-paper-soft"
              >
                <UserRound size={16} aria-hidden="true" />
                {copy.profile}
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAccountOpen(false);
                  void signOut();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-caption text-ink-80 hover:bg-paper-soft"
              >
                <LogOut size={16} aria-hidden="true" />
                {copy.signOut}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
