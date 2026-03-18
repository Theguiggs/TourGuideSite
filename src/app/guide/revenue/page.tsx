'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getGuideRevenueMonths, getGuideRevenueTours, getGuideRevenueSummary } from '@/lib/api/guide';
import { trackEvent, GuideAnalyticsEvents } from '@/lib/analytics';
import type { GuideRevenueMonth, GuideRevenueTour, GuideRevenueSummary } from '@/types/guide';

export default function GuideRevenuePage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<GuideRevenueSummary | null>(null);
  const [months, setMonths] = useState<GuideRevenueMonth[]>([]);
  const [tourRevenue, setTourRevenue] = useState<GuideRevenueTour[]>([]);

  useEffect(() => {
    if (!user?.guideId) return;
    trackEvent(GuideAnalyticsEvents.GUIDE_PORTAL_REVENUE_VIEW);
    Promise.all([
      getGuideRevenueSummary(user.guideId),
      getGuideRevenueMonths(user.guideId),
      getGuideRevenueTours(user.guideId),
    ]).then(([s, m, t]) => {
      setSummary(s);
      setMonths(m);
      setTourRevenue(t);
    });
  }, [user?.guideId]);

  if (!summary) return <div className="text-gray-500">Chargement des revenus...</div>;

  const maxRevenue = Math.max(...months.map((m) => m.guideShare), 1);

  const handleExport = () => {
    const header = 'Mois,Ecoutes,Revenu brut,Part guide (70%),Part TourGuide (30%)';
    const rows = months.map(
      (m) => `${m.month},${m.listens},${m.grossRevenue.toFixed(2)},${m.guideShare.toFixed(2)},${m.tourguideShare.toFixed(2)}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenus-tourguide-${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Revenus</h1>
        <button
          onClick={handleExport}
          className="text-sm text-teal-700 font-medium hover:underline"
        >
          Telecharger le releve (CSV)
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Ce mois</p>
          <p className="text-2xl font-bold text-teal-700">{summary.thisMonth.toFixed(2)} &euro;</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total cumule</p>
          <p className="text-2xl font-bold text-gray-900">{summary.total.toFixed(2)} &euro;</p>
        </div>
      </div>

      {/* Revenue Chart (CSS bars) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenus mensuels (votre part 70%)</h2>
        <div className="flex items-end gap-2 h-40">
          {months.slice().reverse().map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-teal-600 rounded-t-sm"
                style={{ height: `${(m.guideShare / maxRevenue) * 100}%`, minHeight: 4 }}
                title={`${m.guideShare.toFixed(2)} EUR`}
              />
              <span className="text-xs text-gray-500">{m.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue per Tour */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        <h2 className="text-lg font-semibold text-gray-900 p-4 pb-0">Par parcours</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Parcours</th>
              <th className="text-right px-4 py-3 font-medium">Ecoutes</th>
              <th className="text-right px-4 py-3 font-medium">Revenus</th>
              <th className="text-right px-4 py-3 font-medium">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tourRevenue.map((t) => (
              <tr key={t.tourId}>
                <td className="px-4 py-3 font-medium text-gray-900">{t.tourTitle}</td>
                <td className="px-4 py-3 text-right text-gray-500">{t.listens}</td>
                <td className="px-4 py-3 text-right text-gray-900">{t.revenue.toFixed(2)} &euro;</td>
                <td className="px-4 py-3 text-right text-gray-500">{t.percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Split info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
        <p>
          <strong>Repartition:</strong> Votre part (70%) | TourGuide (30%) — calcule sur le revenu brut
          par ecoute completee.
        </p>
      </div>
    </div>
  );
}
