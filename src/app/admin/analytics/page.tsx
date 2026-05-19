'use client';

import { useEffect, useState } from 'react';
import { getStudioAnalytics, type StudioAnalyticsSummary } from '@/lib/api/studio-analytics';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AdminAnalyticsPage';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  editing: 'En cours d\u2019\u00e9dition',
  recording: 'Enregistrement',
  ready: 'Pr\u00eat',
  submitted: 'Soumis',
  published: 'Publi\u00e9',
  revision_requested: 'R\u00e9vision demand\u00e9e',
  rejected: 'Rejet\u00e9',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-paper-deep',
  editing: 'bg-mer',
  recording: 'bg-mer',
  ready: 'bg-olive',
  submitted: 'bg-ocre',
  published: 'bg-olive',
  revision_requested: 'bg-ocre',
  rejected: 'bg-grenadine',
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<StudioAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await getStudioAnalytics();
        setData(result);
        logger.info(SERVICE_NAME, 'Analytics loaded');
      } catch (e) {
        logger.error(SERVICE_NAME, 'Failed to load analytics', { error: String(e) });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="p-6" aria-busy="true">
        <h1 className="text-2xl font-bold text-ink mb-6">Analytics Studio</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="bg-paper-deep rounded-lg h-32 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const { funnel, statusDistribution, tourCosts, totalCostUSD, averageCostPerTourUSD } = data;
  const isEmpty = funnel.fieldSessions === 0 && statusDistribution.length === 0 && tourCosts.length === 0;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-ink mb-6">Analytics Studio</h1>

      {isEmpty && (
        <div className="bg-ocre-soft border border-ocre rounded-lg p-4 mb-6 text-sm text-ocre" role="status">
          Aucune donnée disponible. Cette vue se remplira au fur et à mesure que des guides publieront des tours.
        </div>
      )}

      {/* Funnel */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-ink mb-3">Funnel de production</h2>
        <div className="bg-card border border-line rounded-lg p-4">
          {Object.entries(funnel).map(([key, value], index) => {
            const labels: Record<string, string> = {
              fieldSessions: 'Sessions terrain',
              studioCreated: 'Studios créés',
              transcribed: 'Transcrits',
              recorded: 'Enregistrés',
              submitted: 'Soumis',
              published: 'Publiés',
            };
            const maxVal = funnel.fieldSessions;
            const pct = maxVal > 0 ? Math.round((value / maxVal) * 100) : 0;

            return (
              <div key={key} className="flex items-center gap-3 mb-2" data-testid={`funnel-${key}`}>
                <span className="w-32 text-sm text-ink-60 text-right">{labels[key] || key}</span>
                <div className="flex-1 bg-paper-deep rounded-full h-6 relative">
                  <div
                    className="bg-grenadine h-6 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${pct}%` }}
                  >
                    <span className="text-xs text-white font-medium">{value}</span>
                  </div>
                </div>
                <span className="w-10 text-xs text-ink-40 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Status distribution */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-ink mb-3">Distribution des statuts</h2>
        <div className="bg-card border border-line rounded-lg p-4">
          <div className="flex h-8 rounded-full overflow-hidden mb-3">
            {statusDistribution.map((item) => (
              <div
                key={item.status}
                className={`${STATUS_COLORS[item.status] ?? 'bg-paper-deep'} transition-all`}
                style={{ width: `${item.percentage}%` }}
                title={`${STATUS_LABELS[item.status] ?? item.status}: ${item.count} (${item.percentage}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {statusDistribution.map((item) => (
              <div key={item.status} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${STATUS_COLORS[item.status] ?? 'bg-paper-deep'}`} />
                <span className="text-ink-60">{STATUS_LABELS[item.status] ?? item.status}: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tour costs */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-ink mb-3">Coût unitaire par tour</h2>
        <div className="bg-card border border-line rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-paper-soft">
              <tr>
                <th className="text-left px-4 py-2 text-ink-60 font-medium">Tour</th>
                <th className="text-right px-4 py-2 text-ink-60 font-medium">Transcribe (min)</th>
                <th className="text-right px-4 py-2 text-ink-60 font-medium">S3 (Mo)</th>
                <th className="text-right px-4 py-2 text-ink-60 font-medium">Coût (USD)</th>
              </tr>
            </thead>
            <tbody>
              {tourCosts.map((tour) => (
                <tr key={tour.tourId} className="border-t border-line" data-testid={`cost-${tour.tourId}`}>
                  <td className="px-4 py-2 text-ink">{tour.tourTitle}</td>
                  <td className="px-4 py-2 text-right text-ink-60">{tour.transcribeMinutes}</td>
                  <td className="px-4 py-2 text-right text-ink-60">{tour.s3StorageMB}</td>
                  <td className="px-4 py-2 text-right font-medium text-ink">${tour.estimatedCostUSD.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-paper-soft border-t">
              <tr>
                <td className="px-4 py-2 font-medium text-ink">Total</td>
                <td colSpan={2} />
                <td className="px-4 py-2 text-right font-bold text-grenadine">${totalCostUSD.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-ink-60 text-xs">Moyenne par tour</td>
                <td colSpan={2} />
                <td className="px-4 py-2 text-right text-ink-60 text-xs">${averageCostPerTourUSD.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
