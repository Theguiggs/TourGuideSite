'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { listStudioSessions } from '@/lib/api/studio';
import { listTourComments } from '@/lib/api/tour-comments';

export type SidebarKey =
  | 'dashboard'
  | 'tours'
  | 'create'
  | 'profile'
  | 'revenus'
  | 'reviews';

interface SidebarItem {
  key: SidebarKey;
  label: string;
  icon: string;
  href: string;
  accent?: boolean;
}

const ITEMS: SidebarItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '⌂', href: '/guide/studio' },
  { key: 'tours', label: 'Mes tours', icon: '◉', href: '/guide/studio/tours' },
  { key: 'create', label: 'Nouveau tour', icon: '＋', href: '/guide/studio/nouveau', accent: true },
  { key: 'profile', label: 'Mon profil', icon: '◐', href: '/guide/studio/profil' },
  { key: 'revenus', label: 'Revenus', icon: '€', href: '/guide/studio/revenus' },
  { key: 'reviews', label: 'Avis', icon: '★', href: '/guide/studio/avis' },
];

interface StudioSidebarProps {
  /** Onglet actif. */
  active: SidebarKey;
  /**
   * Compteurs précomputés (pour les tests / SSR). Si omis, le composant
   * fetch lui-même via listStudioSessions / listTourComments.
   */
  counts?: { tours?: number; reviews?: number };
}

/**
 * <StudioSidebar> — nav latérale du back-office Murmure (240px).
 * Profil header + 6 items + footer (logout, lien app touriste).
 * Port de docs/design/ds/studio-shared.jsx:59-115.
 */
export function StudioSidebar({ active, counts }: StudioSidebarProps) {
  const { user, signOut } = useAuth();
  const [toursCount, setToursCount] = useState<number | null>(counts?.tours ?? null);
  const [reviewsCount, setReviewsCount] = useState<number | null>(counts?.reviews ?? null);

  // Fetch live counters when not provided
  useEffect(() => {
    if (counts !== undefined) return;
    let cancelled = false;
    const guideId = shouldUseStubs() ? 'guide-1' : user?.guideId;
    if (!guideId) return;

    void (async () => {
      try {
        const sessions = await listStudioSessions(guideId);
        if (cancelled) return;
        setToursCount(sessions.length);

        // Reviews badge = sessions needing attention + admin comments unread
        let needAttention = sessions.filter((s) =>
          ['revision_requested', 'rejected'].includes(s.status),
        ).length;

        for (const s of sessions) {
          if (!s.tourId) continue;
          if (['revision_requested', 'rejected'].includes(s.status)) continue;
          try {
            const comments = await listTourComments(s.tourId);
            if (cancelled) return;
            const lastAdmin = [...comments].reverse().find((c) => c.author === 'admin');
            if (lastAdmin) needAttention += 1;
          } catch {
            /* ignore — best-effort */
          }
        }
        if (!cancelled) setReviewsCount(needAttention);
      } catch {
        /* swallow — sidebar reste fonctionnelle */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.guideId, counts]);

  const initial = (user?.displayName ?? 'S').trim().charAt(0).toUpperCase() || 'S';
  const subtitle = user?.role === 'admin' ? 'Admin' : 'Guide';

  return (
    <aside
      className="w-60 shrink-0 bg-paper border-r border-line py-6 px-4 box-border min-h-full flex flex-col"
      data-testid="studio-sidebar"
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
      <nav className="mt-4 flex-1" aria-label="Navigation Studio">
        {ITEMS.map((it) => {
          const isActive = it.key === active;
          const isAccent = !!it.accent && !isActive;
          const badgeValue =
            it.key === 'tours' ? toursCount : it.key === 'reviews' ? reviewsCount : null;
          const isReviewBadge = it.key === 'reviews' && (badgeValue ?? 0) > 0;

          return (
            <Link
              key={it.key}
              href={it.href}
              data-testid={`sidebar-${it.key}`}
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
              {badgeValue !== null && badgeValue > 0 && (
                <span
                  data-testid={`sidebar-${it.key}-badge`}
                  className={[
                    'text-meta font-bold rounded-pill px-2 py-0.5',
                    isReviewBadge
                      ? 'bg-grenadine text-paper'
                      : isActive
                        ? 'bg-paper/20 text-paper'
                        : 'bg-paper-soft text-ink-60',
                  ].join(' ')}
                >
                  {badgeValue}
                </span>
              )}
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
          data-testid="sidebar-logout"
          className="flex items-center gap-2 text-ink-60 hover:text-ink py-1 mt-1"
        >
          <span aria-hidden="true">⏏</span>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
