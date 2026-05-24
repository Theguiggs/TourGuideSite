'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import AuthGuard from '@/components/AuthGuard';
import { StudioHeader } from '@/components/studio/shell';

type NavKey = 'dashboard' | 'tours' | 'studio' | 'profile' | 'revenue';

interface NavItem {
  key: NavKey;
  label: string;
  icon: string;
  href: string;
  accent?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '⌂', href: '/guide/dashboard' },
  { key: 'tours', label: 'Mes Parcours', icon: '◉', href: '/guide/tours' },
  { key: 'studio', label: 'Ouvrir le Studio', icon: '＋', href: '/guide/studio', accent: true },
  { key: 'profile', label: 'Mon Profil', icon: '◐', href: '/guide/profile' },
  { key: 'revenue', label: 'Revenus', icon: '€', href: '/guide/revenue' },
];

function resolveActive(pathname: string): NavKey {
  if (pathname.startsWith('/guide/tours')) return 'tours';
  if (pathname.startsWith('/guide/profile')) return 'profile';
  if (pathname.startsWith('/guide/revenue')) return 'revenue';
  if (pathname.startsWith('/guide/studio')) return 'studio';
  return 'dashboard';
}

/**
 * <GuideNav> — sidebar legacy pour /guide/{dashboard,tours,profile,revenue}.
 * Style port du <StudioSidebar> Murmure : avatar ocre, glyphes typo, active ink/paper.
 */
function GuideNav() {
  const pathname = usePathname() ?? '';
  const { user, signOut } = useAuth();
  const active = resolveActive(pathname);
  const initial = (user?.displayName ?? 'G').trim().charAt(0).toUpperCase() || 'G';
  const subtitle = user?.role === 'admin' ? 'Admin' : 'Guide';

  return (
    <aside
      className="w-60 shrink-0 bg-paper border-r border-line py-6 px-4 box-border min-h-full flex flex-col"
      data-testid="guide-sidebar"
    >
      {/* Profil */}
      <div className="px-3 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ocre text-paper flex items-center justify-center font-display text-h6">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-caption font-semibold text-ink truncate">
              {user?.displayName ?? 'Invité'}
            </div>
            <div className="text-meta text-ink-60">{subtitle}</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="mt-4 flex-1" aria-label="Navigation Guide">
        {NAV_ITEMS.map((it) => {
          const isActive = it.key === active;
          const isAccent = !!it.accent && !isActive;
          return (
            <Link
              key={it.key}
              href={it.href}
              data-testid={`guide-nav-${it.key}`}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-md mb-0.5 text-caption no-underline transition',
                isActive
                  ? 'bg-ink text-paper font-semibold'
                  : isAccent
                    ? 'bg-grenadine-soft text-grenadine font-medium'
                    : 'text-ink-80 hover:bg-paper-soft font-medium',
              ].join(' ')}
            >
              <span aria-hidden="true" className="text-meta opacity-80">
                {it.icon}
              </span>
              <span className="flex-1">{it.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-line text-meta">
        <Link
          href="/catalogue"
          className="flex items-center gap-2 text-ink-60 hover:text-ink no-underline py-1"
        >
          <span aria-hidden="true">↗</span>
          Voir l&apos;app touriste
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          data-testid="guide-nav-logout"
          className="flex items-center gap-2 text-ink-60 hover:text-ink py-1 mt-1 w-full text-left"
        >
          <span aria-hidden="true">⏏</span>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isPublicPage = pathname === '/guide/login' || pathname === '/guide/signup';
  const isStudioPage = pathname.startsWith('/guide/studio');

  if (isPublicPage) {
    return <>{children}</>;
  }

  // Studio routes ship their own Murmure shell (StudioHeader + StudioSidebar).
  if (isStudioPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  // Other /guide/* routes (dashboard, tours, profile, revenue) reuse the
  // Studio shell visuals: StudioHeader + Murmure-style sidebar.
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-paper-soft">
        <StudioHeader />
        <div className="flex-1 grid grid-cols-[240px_1fr] min-h-0">
          <GuideNav />
          <main className="overflow-y-auto bg-paper-soft p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
