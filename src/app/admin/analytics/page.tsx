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
  draft: 'bg-gray-200',
  editing: 'bg-blue-400',
  recording: 'bg-blue-300',
  ready: 'bg-green-300',
  submitted: 'bg-yellow-400',
  published: 'bg-green-500',
  revision_requested: 'bg-orange-400',
  rejected: 'bg-red-500',
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Studio</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="bg-gray-100 rounded-lg h-32 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const { funnel, statusDistribution, tourCosts, totalCostUSD, averageCostPerTourUSD } = data;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Studio</h1>

      {/* Funnel */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Funnel de production</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
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
            const pct = Math.round((value / maxVal) * 100);

            return (
              <div key={key} className="flex items-center gap-3 mb-2" data-testid={`funnel-${key}`}>
                <span className="w-32 text-sm text-gray-600 text-right">{labels[key] || key}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                  <div
                    className="bg-teal-500 h-6 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${pct}%` }}
                  >
                    <span className="text-xs text-white font-medium">{value}</span>
                  </div>
                </div>
                <span className="w-10 text-xs text-gray-400 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Status distribution */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Distribution des statuts</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex h-8 rounded-full overflow-hidden mb-3">
            {statusDistribution.map((item) => (
              <div
                key={item.status}
                className={`${STATUS_COLORS[item.status] ?? 'bg-gray-300'} transition-all`}
                style={{ width: `${item.percentage}%` }}
                title={`${STATUS_LABELS[item.status] ?? item.status}: ${item.count} (${item.percentage}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {statusDistribution.map((item) => (
              <div key={item.status} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${STATUS_COLORS[item.status] ?? 'bg-gray-300'}`} />
                <span className="text-gray-600">{STATUS_LABELS[item.status] ?? item.status}: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tour costs */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Coût unitaire par tour</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">Tour</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Transcribe (min)</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">S3 (Mo)</th>
                <th className="text-right px-4 py-2 text-gray-500 font-medium">Coût (USD)</th>
              </tr>
            </thead>
            <tbody>
              {tourCosts.map((tour) => (
                <tr key={tour.tourId} className="border-t border-gray-100" data-testid={`cost-${tour.tourId}`}>
                  <td className="px-4 py-2 text-gray-900">{tour.tourTitle}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{tour.transcribeMinutes}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{tour.s3StorageMB}</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">${tour.estimatedCostUSD.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td className="px-4 py-2 font-medium text-gray-900">Total</td>
                <td colSpan={2} />
                <td className="px-4 py-2 text-right font-bold text-teal-700">${totalCostUSD.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-gray-500 text-xs">Moyenne par tour</td>
                <td colSpan={2} />
                <td className="px-4 py-2 text-right text-gray-500 text-xs">${averageCostPerTourUSD.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
