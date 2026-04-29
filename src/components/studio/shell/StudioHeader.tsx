'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { MurmureLogo } from './MurmureLogo';

/**
 * <StudioHeader> — barre haut globale du back-office Murmure.
 * Logo + nav externe (Catalogue / Aide) + avatar user + dropdown.
 * Port de docs/design/ds/studio-shared.jsx:40-56.
 */
export function StudioHeader() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initial = (user?.displayName ?? 'S').trim().charAt(0).toUpperCase() || 'S';

  return (
    <header
      className="bg-paper border-b border-line px-8 py-3 flex items-center justify-between"
      data-testid="studio-header"
    >
      <Link href="/guide/studio" className="no-underline">
        <MurmureLogo size={26} />
      </Link>

      <div className="flex items-center gap-5 text-caption">
        <Link
          href="/catalogue"
          className="text-ink-60 hover:text-ink font-medium no-underline transition"
        >
          Catalogue public
        </Link>
        <Link
          href="/aide"
          className="text-ink-60 hover:text-ink font-medium no-underline transition"
        >
          Aide
        </Link>

        <span className="w-px h-4 bg-line" aria-hidden="true" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            data-testid="studio-header-user"
            className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-paper-soft transition"
          >
            <span className="w-7 h-7 rounded-full bg-grenadine text-paper flex items-center justify-center text-meta font-bold">
              {initial}
            </span>
            <span className="text-caption font-semibold text-ink">
              {user?.displayName ?? 'Invité'}
            </span>
            <span className="text-ink-40 text-meta" aria-hidden="true">
              ▾
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-48 bg-card border border-line rounded-md shadow-md py-1 z-30"
            >
              <Link
                href="/guide/studio/profil"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-caption text-ink-80 hover:bg-paper-soft no-underline"
              >
                Mon profil
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  void signOut();
                }}
                className="block w-full text-left px-3 py-2 text-caption text-ink-80 hover:bg-paper-soft"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
