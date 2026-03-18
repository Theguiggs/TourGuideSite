'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getGuideDashboardStats, getGuideTours, getGuideRevenueSummary } from '@/lib/api/guide';
import { trackEvent, GuideAnalyticsEvents } from '@/lib/analytics';
import type { GuideDashboardStats, GuideTourSummary, GuideRevenueSummary } from '@/types/guide';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  published: { label: 'Publie', className: 'bg-green-100 text-green-700' },
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
  editing: { label: 'En edition', className: 'bg-blue-100 text-blue-700' },
  pending_moderation: { label: 'En moderation', className: 'bg-yellow-100 text-yellow-700' },
  rejected: { label: 'Refuse', className: 'bg-red-100 text-red-700' },
  archived: { label: 'Archive', className: 'bg-gray-100 text-gray-500' },
};

const EMPTY_STATS: GuideDashboardStats = { totalListens: 0, revenueThisMonth: 0, averageRating: 0, pendingToursCount: 0 };
const EMPTY_REVENUE: GuideRevenueSummary = { thisMonth: 0, total: 0, currency: 'EUR' };

export default function GuideDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<GuideDashboardStats>(EMPTY_STATS);
  const [tours, setTours] = useState<GuideTourSummary[]>([]);
  const [revenue, setRevenue] = useState<GuideRevenueSummary>(EMPTY_REVENUE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.guideId) return;
    trackEvent(GuideAnalyticsEvents.GUIDE_PORTAL_DASHBOARD_VIEW);
    Promise.all([
      getGuideDashboardStats(user.guideId),
      getGuideTours(user.guideId),
      getGuideRevenueSummary(user.guideId),
    ])
      .then(([s, t, r]) => {
        setStats(s);
        setTours(t);
        setRevenue(r);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.guideId]);

  if (authLoading) {
    return <div className="text-gray-500">Chargement...</div>;
  }

  const publishedTours = tours.filter((t) => t.status === 'published');
  const pendingTours = tours.filter((t) => t.status !== 'published');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Ecoutes totales</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalListens}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Revenus ce mois</p>
          <p className="text-2xl font-bold text-teal-700">{stats.revenueThisMonth.toFixed(2)} &euro;</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Note moyenne</p>
          <p className="text-2xl font-bold text-amber-600">{stats.averageRating.toFixed(1)} ★</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">En attente</p>
          <p className="text-2xl font-bold text-gray-900">{stats.pendingToursCount}</p>
        </div>
      </div>

      {/* Published Tours */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Parcours publies</h2>
        {publishedTours.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucun parcours publie.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Titre</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Ville</th>
                  <th className="text-right px-4 py-3 font-medium">Ecoutes</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Completion</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {publishedTours.map((tour) => (
                  <tr key={tour.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{tour.title}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{tour.city}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{tour.listens}</td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">{tour.completionRate}%</td>
                    <td className="px-4 py-3 text-right text-amber-600 hidden md:table-cell">{tour.rating > 0 ? `${tour.rating} ★` : '-'}</td>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parcours en cours</h2>
          <div className="space-y-3">
            {pendingTours.map((tour) => {
              const badge = STATUS_BADGES[tour.status] ?? STATUS_BADGES.draft;
              return (
                <div key={tour.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{tour.title}</p>
                    <p className="text-sm text-gray-500">{tour.city}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                    {(tour.status === 'editing' || tour.status === 'rejected') && tour.sessionId && (
                      <Link
                        href={`/guide/studio/${tour.sessionId}`}
                        className="text-teal-700 text-sm font-medium hover:underline"
                      >
                        Editer
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
          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-gray-500">Revenus totaux</p>
          <p className="text-xl font-bold text-gray-900">{revenue?.total.toFixed(2)} &euro;</p>
          <p className="text-teal-700 text-sm mt-2">Voir details →</p>
        </Link>
        <Link
          href="/guide/profile"
          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-gray-500">Mon profil</p>
          <p className="text-xl font-bold text-gray-900">{user?.displayName}</p>
          <p className="text-teal-700 text-sm mt-2">Modifier →</p>
        </Link>
      </div>
    </div>
  );
}
