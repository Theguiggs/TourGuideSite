'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getGuideDashboardStats, getGuideTours, getGuideRevenueSummary } from '@/lib/api/guide';
import { listLanguagePurchases } from '@/lib/api/language-purchase';
import { trackEvent, GuideAnalyticsEvents } from '@/lib/analytics';
import type { GuideDashboardStats, GuideTourSummary, GuideRevenueSummary } from '@/types/guide';
import type { TourLanguagePurchase } from '@/types/studio';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪', pt: '🇵🇹', ja: '🇯🇵', zh: '🇨🇳',
};
const MOD_COLORS: Record<string, string> = {
  draft: 'bg-paper-deep text-ink-60',
  submitted: 'bg-ocre-soft text-ocre',
  approved: 'bg-olive-soft text-olive',
  rejected: 'bg-grenadine-soft text-danger',
  revision_requested: 'bg-ocre-soft text-ocre',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  published: { label: 'Publié', className: 'bg-olive-soft text-olive' },
  draft: { label: 'Brouillon', className: 'bg-paper-deep text-ink-60' },
  editing: { label: 'En édition', className: 'bg-mer-soft text-mer' },
  pending_moderation: { label: 'En modération', className: 'bg-ocre-soft text-ocre' },
  rejected: { label: 'Refusé', className: 'bg-grenadine-soft text-danger' },
  archived: { label: 'Archivé', className: 'bg-paper-deep text-ink-40' },
};

const EMPTY_STATS: GuideDashboardStats = { totalListens: 0, revenueThisMonth: 0, averageRating: 0, pendingToursCount: 0 };
const EMPTY_REVENUE: GuideRevenueSummary = { thisMonth: 0, total: 0, currency: 'EUR' };

export default function GuideDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<GuideDashboardStats>(EMPTY_STATS);
  const [tours, setTours] = useState<GuideTourSummary[]>([]);
  const [revenue, setRevenue] = useState<GuideRevenueSummary>(EMPTY_REVENUE);
  const [purchasesByTour, setPurchasesByTour] = useState<Record<string, TourLanguagePurchase[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.guideId) return;
    trackEvent(GuideAnalyticsEvents.GUIDE_PORTAL_DASHBOARD_VIEW);
    Promise.all([
      getGuideDashboardStats(user.guideId),
      getGuideTours(user.guideId),
      getGuideRevenueSummary(user.guideId),
    ])
      .then(async ([s, t, r]) => {
        setStats(s);
        setTours(t);
        setRevenue(r);
        const pMap: Record<string, TourLanguagePurchase[]> = {};
        await Promise.all(t.filter((tour) => tour.sessionId).map(async (tour) => {
          const result = await listLanguagePurchases(tour.sessionId!);
          if (result.ok) pMap[tour.id] = result.value.filter((p) => p.status === 'active');
        }));
        setPurchasesByTour(pMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.guideId]);

  if (authLoading || loading) {
    return <div className="text-caption text-ink-40">Chargement…</div>;
  }

  const publishedTours = tours.filter((t) => t.status === 'published');
  const pendingTours = tours.filter((t) => t.status !== 'published');

  return (
    <div>
      <h1 className="font-display text-h4 text-ink mb-6 leading-none">Tableau de bord</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-line rounded-md p-4">
          <p className="text-meta text-ink-60">Écoutes totales</p>
          <p className="font-display text-h5 text-ink mt-1 leading-none">{stats.totalListens}</p>
        </div>
        <div className="bg-card border border-line rounded-md p-4">
          <p className="text-meta text-ink-60">Revenus ce mois</p>
          <p className="font-display text-h5 text-grenadine mt-1 leading-none">{stats.revenueThisMonth.toFixed(2)} €</p>
        </div>
        <div className="bg-card border border-line rounded-md p-4">
          <p className="text-meta text-ink-60">Note moyenne</p>
          <p className="font-display text-h5 text-ocre mt-1 leading-none">{stats.averageRating.toFixed(1)} ★</p>
        </div>
        <div className="bg-card border border-line rounded-md p-4">
          <p className="text-meta text-ink-60">En attente</p>
          <p className="font-display text-h5 text-ink mt-1 leading-none">{stats.pendingToursCount}</p>
        </div>
      </div>

      {/* Published Tours */}
      <div className="mb-8">
        <h2 className="font-display text-h6 text-ink mb-4">Parcours publiés</h2>
        {publishedTours.length === 0 ? (
          <p className="text-caption text-ink-40 italic">Aucun parcours publié.</p>
        ) : (
          <div className="bg-card border border-line rounded-md overflow-hidden">
            <table className="w-full text-caption">
              <thead className="bg-paper-soft text-ink-60">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold tg-eyebrow">Titre</th>
                  <th className="text-left px-4 py-3 font-semibold tg-eyebrow hidden sm:table-cell">Ville</th>
                  <th className="text-left px-4 py-3 font-semibold tg-eyebrow">Langues</th>
                  <th className="text-right px-4 py-3 font-semibold tg-eyebrow">Écoutes</th>
                  <th className="text-right px-4 py-3 font-semibold tg-eyebrow hidden md:table-cell">Complétion</th>
                  <th className="text-right px-4 py-3 font-semibold tg-eyebrow hidden md:table-cell">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {publishedTours.map((tour) => (
                  <tr key={tour.id} className="hover:bg-paper-soft transition">
                    <td className="px-4 py-3 font-medium text-ink">{tour.title}</td>
                    <td className="px-4 py-3 text-ink-60 hidden sm:table-cell">{tour.city}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-meta px-1.5 py-0.5 rounded-pill bg-mer-soft text-mer font-medium">
                          🇫🇷 FR
                        </span>
                        {(purchasesByTour[tour.id] ?? []).map((p) => (
                          <span
                            key={p.id}
                            className={`text-meta px-1.5 py-0.5 rounded-pill font-medium ${MOD_COLORS[p.moderationStatus] ?? MOD_COLORS.draft}`}
                          >
                            {LANG_FLAGS[p.language] ?? ''} {p.language.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-ink">{tour.listens}</td>
                    <td className="px-4 py-3 text-right text-ink-60 hidden md:table-cell">{tour.completionRate}%</td>
                    <td className="px-4 py-3 text-right text-ocre hidden md:table-cell">{tour.rating > 0 ? `${tour.rating} ★` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Tours */}
      {pendingTours.length > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-h6 text-ink mb-4">Parcours en cours</h2>
          <div className="space-y-3">
            {pendingTours.map((tour) => {
              const badge = STATUS_BADGES[tour.status] ?? STATUS_BADGES.draft;
              return (
                <div
                  key={tour.id}
                  className="bg-card border border-line rounded-md p-4 flex items-center justify-between hover:shadow-sm transition"
                >
                  <div>
                    <p className="font-medium text-ink">{tour.title}</p>
                    <p className="text-meta text-ink-60">{tour.city}</p>
                    {(purchasesByTour[tour.id] ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(purchasesByTour[tour.id] ?? []).map((p) => (
                          <span
                            key={p.id}
                            className={`text-meta px-1.5 py-0.5 rounded-pill font-medium ${MOD_COLORS[p.moderationStatus] ?? MOD_COLORS.draft}`}
                          >
                            {LANG_FLAGS[p.language] ?? ''} {p.language.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-meta font-bold px-2 py-1 rounded-pill ${badge.className}`}>
                      {badge.label}
                    </span>
                    {(tour.status === 'editing' || tour.status === 'rejected') && tour.sessionId && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}`}
                        className="text-caption text-grenadine font-medium hover:underline underline-offset-2"
                      >
                        Éditer →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revenue & Profile links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/guide/revenue"
          className="bg-card border border-line rounded-md p-4 hover:shadow-md hover:border-grenadine transition no-underline"
        >
          <p className="text-meta text-ink-60">Revenus totaux</p>
          <p className="font-display text-h5 text-ink mt-1 leading-none">{revenue?.total.toFixed(2)} €</p>
          <p className="text-caption text-grenadine font-medium mt-3">Voir détails →</p>
        </Link>
        <Link
          href="/guide/profile"
          className="bg-card border border-line rounded-md p-4 hover:shadow-md hover:border-grenadine transition no-underline"
        >
          <p className="text-meta text-ink-60">Mon profil</p>
          <p className="font-display text-h5 text-ink mt-1 leading-none">{user?.displayName}</p>
          <p className="text-caption text-grenadine font-medium mt-3">Modifier →</p>
        </Link>
      </div>
    </div>
  );
}
