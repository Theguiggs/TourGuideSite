'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PinNegatif } from '@murmure/design-system/web';
import { useAuth } from '@/lib/auth/auth-context';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, isAdmin, user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-line">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Murmure : PinNegatif grenadine + wordmark DM Serif Display */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
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
              href="/catalogue"
              className="text-caption text-ink-60 hover:text-ink font-medium no-underline transition"
            >
              Catalogue
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href={isAdmin ? '/admin/moderation' : '/guide/dashboard'}
                  className="text-caption text-ink-60 hover:text-ink font-medium no-underline transition"
                >
                  {user?.displayName}
                </Link>
                <button
                  onClick={signOut}
                  className="text-meta text-ink-40 hover:text-grenadine font-medium transition"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/guide/login"
                  className="text-caption text-ink-60 hover:text-ink font-medium no-underline transition"
                >
                  Espace Guide
                </Link>
                <Link
                  href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
                  className="bg-grenadine text-paper text-caption font-bold px-4 py-2 rounded-pill hover:opacity-90 transition no-underline"
                >
                  Télécharger l&apos;app
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-ink-60 hover:text-ink"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
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
              href="/catalogue"
              className="block py-3 text-caption text-ink-60 hover:text-ink font-medium no-underline"
              onClick={() => setMenuOpen(false)}
            >
              Catalogue
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href={isAdmin ? '/admin/moderation' : '/guide/dashboard'}
                  className="block py-3 text-caption text-grenadine font-medium no-underline"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="block py-3 text-caption text-ink-40 hover:text-grenadine font-medium"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/guide/login"
                  className="block py-3 text-caption text-ink-60 hover:text-ink font-medium no-underline"
                  onClick={() => setMenuOpen(false)}
                >
                  Espace Guide
                </Link>
                <Link
                  href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
                  className="block py-3 text-caption text-grenadine font-medium no-underline"
                  onClick={() => setMenuOpen(false)}
                >
                  Télécharger l&apos;app
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
