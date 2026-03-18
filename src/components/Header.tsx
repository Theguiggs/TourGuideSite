'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-teal-700">TourGuide</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/catalogue" className="text-gray-600 hover:text-teal-700 font-medium">
              Catalogue
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/guide/dashboard" className="text-gray-600 hover:text-teal-700 font-medium">
                  {user?.displayName}
                </Link>
                <button
                  onClick={signOut}
                  className="text-gray-500 hover:text-red-600 font-medium text-sm"
                >
                  Deconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/guide/login" className="text-gray-600 hover:text-teal-700 font-medium">
                  Espace Guide
                </Link>
                <Link
                  href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
                  className="bg-teal-700 text-white px-4 py-2 rounded-lg hover:bg-teal-800 font-medium"
                >
                  Telecharger l&apos;app
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
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
          <div className="md:hidden pb-4 border-t border-gray-100">
            <Link
              href="/catalogue"
              className="block py-3 text-gray-600 hover:text-teal-700 font-medium"
              onClick={() => setMenuOpen(false)}
            >
              Catalogue
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href="/guide/dashboard"
                  className="block py-3 text-teal-700 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="block py-3 text-gray-500 hover:text-red-600 font-medium"
                >
                  Deconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/guide/login"
                  className="block py-3 text-gray-600 hover:text-teal-700 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Espace Guide
                </Link>
                <Link
                  href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
                  className="block py-3 text-teal-700 font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  Telecharger l&apos;app
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
