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

  if (!summary) return <div className="text-caption text-ink-40">Chargement des revenus…</div>;

  const maxRevenue = Math.max(...months.map((m) => m.guideShare), 1);

  const handleExport = () => {
    const header = 'Mois,Ecoutes,Revenu brut,Part guide (70%),Part Murmure (30%)';
    const rows = months.map(
      (m) => `${m.month},${m.listens},${m.grossRevenue.toFixed(2)},${m.guideShare.toFixed(2)},${m.tourguideShare.toFixed(2)}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenus-murmure-${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-h4 text-ink leading-none">Revenus</h1>
        <button
          onClick={handleExport}
          className="text-caption text-grenadine font-medium hover:underline underline-offset-2"
        >
          Télécharger le relevé (CSV) →
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card border border-line rounded-md p-4">
          <p className="text-meta text-ink-60">Ce mois</p>
          <p className="font-display text-h4 text-grenadine mt-1 leading-none">{summary.thisMonth.toFixed(2)} €</p>
        </div>
        <div className="bg-card border border-line rounded-md p-4">
          <p className="text-meta text-ink-60">Total cumulé</p>
          <p className="font-display text-h4 text-ink mt-1 leading-none">{summary.total.toFixed(2)} €</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-card border border-line rounded-md p-6 mb-8">
        <h2 className="font-display text-h6 text-ink mb-4">Revenus mensuels (votre part 70%)</h2>
        <div className="flex items-end gap-2 h-40">
          {months.slice().reverse().map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-grenadine rounded-t-sm transition-all hover:opacity-80"
                style={{ height: `${(m.guideShare / maxRevenue) * 100}%`, minHeight: 4 }}
                title={`${m.guideShare.toFixed(2)} EUR`}
              />
              <span className="text-meta text-ink-60">{m.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue per Tour */}
      <div className="bg-card border border-line rounded-md overflow-hidden mb-8">
        <h2 className="font-display text-h6 text-ink p-4 pb-0">Par parcours</h2>
        <table className="w-full text-caption">
          <thead className="bg-paper-soft text-ink-60">
            <tr>
              <th className="text-left px-4 py-3 font-semibold tg-eyebrow">Parcours</th>
              <th className="text-right px-4 py-3 font-semibold tg-eyebrow">Écoutes</th>
              <th className="text-right px-4 py-3 font-semibold tg-eyebrow">Revenus</th>
              <th className="text-right px-4 py-3 font-semibold tg-eyebrow">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {tourRevenue.map((t) => (
              <tr key={t.tourId} className="hover:bg-paper-soft transition">
                <td className="px-4 py-3 font-medium text-ink">{t.tourTitle}</td>
                <td className="px-4 py-3 text-right text-ink-60">{t.listens}</td>
                <td className="px-4 py-3 text-right text-ink">{t.revenue.toFixed(2)} €</td>
                <td className="px-4 py-3 text-right text-ink-60">{t.percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Split info */}
      <div className="bg-paper-soft border border-line rounded-md p-4 text-caption text-ink-80">
        <p>
          <strong>Répartition :</strong> Votre part (70%) | Murmure (30%) — calculé sur le revenu brut par écoute complétée.
        </p>
      </div>
    </div>
  );
}
