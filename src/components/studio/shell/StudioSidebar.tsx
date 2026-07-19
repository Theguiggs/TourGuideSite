'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  CircleDollarSign,
  Compass,
  Headphones,
  House,
  LogOut,
  Map,
  MessageSquareText,
  Plus,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { listStudioSessions } from '@/lib/api/studio';
import { listTourComments } from '@/lib/api/tour-comments';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

export type SidebarKey = 'dashboard' | 'tours' | 'create' | 'profile' | 'revenus' | 'reviews';

interface SidebarItem {
  key: SidebarKey;
  icon: LucideIcon;
  href: string;
  accent?: boolean;
}

const ITEMS: SidebarItem[] = [
  { key: 'dashboard', icon: House, href: '/guide/studio' },
  { key: 'tours', icon: Map, href: '/guide/studio/tours' },
  { key: 'create', icon: Plus, href: '/guide/studio/nouveau', accent: true },
  { key: 'profile', icon: UserRound, href: '/guide/studio/profil' },
  { key: 'revenus', icon: CircleDollarSign, href: '/guide/studio/revenus' },
  { key: 'reviews', icon: MessageSquareText, href: '/guide/studio/avis' },
];

const COPY = {
  fr: {
    dashboard: 'Accueil', tours: 'Mes visites', create: 'Nouvelle visite', profile: 'Mon profil',
    revenus: 'Revenus', reviews: 'Avis', navigation: 'Navigation Studio', explore: 'Explorer le catalogue',
    signOut: 'Se déconnecter', roleGuide: 'Guide', roleAdmin: 'Admin', guest: 'Invité',
  },
  en: {
    dashboard: 'Home', tours: 'My tours', create: 'New tour', profile: 'My profile',
    revenus: 'Revenue', reviews: 'Reviews', navigation: 'Studio navigation', explore: 'Explore the catalogue',
    signOut: 'Sign out', roleGuide: 'Guide', roleAdmin: 'Admin', guest: 'Guest',
  },
} as const;

interface StudioSidebarProps {
  active: SidebarKey;
  counts?: { tours?: number; reviews?: number };
  onNavigate?: () => void;
  className?: string;
}

export function StudioSidebar({ active, counts, onNavigate, className = '' }: StudioSidebarProps) {
  const { user, signOut } = useAuth();
  const { locale } = useStudioLocale();
  const copy = COPY[locale];
  const [toursCount, setToursCount] = useState<number | null>(counts?.tours ?? null);
  const [reviewsCount, setReviewsCount] = useState<number | null>(counts?.reviews ?? null);

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
        let needAttention = sessions.filter((session) =>
          ['revision_requested', 'rejected'].includes(session.status),
        ).length;

        for (const session of sessions) {
          if (!session.tourId || ['revision_requested', 'rejected'].includes(session.status)) continue;
          try {
            const comments = await listTourComments(session.tourId);
            if (cancelled) return;
            if ([...comments].reverse().some((comment) => comment.author === 'admin')) needAttention += 1;
          } catch {
            // Counts are optional; navigation remains usable when comments fail.
          }
        }
        if (!cancelled) setReviewsCount(needAttention);
      } catch {
        // Counts are optional; navigation remains usable when sessions fail.
      }
    })();

    return () => { cancelled = true; };
  }, [user?.guideId, counts]);

  const initial = (user?.displayName ?? 'S').trim().charAt(0).toUpperCase() || 'S';
  const catalogueHref = locale === 'en' ? '/en/catalogue' : '/catalogue';

  return (
    <aside
      className={`flex h-full w-60 shrink-0 flex-col border-r border-line bg-paper px-4 py-5 ${className}`}
      data-testid="studio-sidebar"
    >
      <div className="flex items-center gap-3 border-b border-line px-3 pb-4 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ocre font-display text-h6 text-paper">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-caption font-semibold text-ink">
            {user?.displayName ?? copy.guest}
          </div>
          <div className="text-meta text-ink-60">
            {user?.role === 'admin' ? copy.roleAdmin : copy.roleGuide}
          </div>
        </div>
      </div>

      <nav className="mt-2 flex-1 lg:mt-0" aria-label={copy.navigation}>
        {ITEMS.map((item) => {
          const isActive = item.key === active;
          const badgeValue = item.key === 'tours' ? toursCount : item.key === 'reviews' ? reviewsCount : null;
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              data-testid={`sidebar-${item.key}`}
              aria-current={isActive ? 'page' : undefined}
              className={`mb-1 flex min-h-11 items-center gap-3 rounded-md px-3 text-caption no-underline transition ${
                isActive
                  ? 'bg-ink font-semibold text-paper'
                  : item.accent
                    ? 'bg-grenadine-soft font-semibold text-grenadine hover:bg-grenadine hover:text-paper'
                    : 'font-medium text-ink-80 hover:bg-paper-soft'
              }`}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="flex-1">{copy[item.key]}</span>
              {badgeValue !== null && badgeValue > 0 && (
                <span data-testid={`sidebar-${item.key}-badge`} className={`rounded-pill px-2 py-0.5 text-meta font-bold ${
                  item.key === 'reviews' ? 'bg-grenadine text-paper' : isActive ? 'bg-paper/20 text-paper' : 'bg-paper-deep text-ink-60'
                }`}>
                  {badgeValue}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 border-t border-line pt-4 text-meta">
        <Link
          href={catalogueHref}
          onClick={onNavigate}
          className="flex min-h-9 items-center gap-2 px-3 text-ink-60 no-underline hover:text-ink"
        >
          <Compass size={16} aria-hidden="true" />
          {copy.explore}
        </Link>
        <Link
          href={locale === 'en' ? '/en/my-purchases' : '/mes-visites'}
          onClick={onNavigate}
          className="flex min-h-9 items-center gap-2 px-3 text-ink-60 no-underline hover:text-ink"
        >
          <Headphones size={16} aria-hidden="true" />
          {locale === 'en' ? 'My purchases' : 'Mes achats'}
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          data-testid="sidebar-logout"
          className="flex min-h-9 w-full items-center gap-2 px-3 text-left text-ink-60 hover:text-ink"
        >
          <LogOut size={16} aria-hidden="true" />
          {copy.signOut}
        </button>
      </div>
    </aside>
  );
}
