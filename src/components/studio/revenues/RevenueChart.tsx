'use client';

import { formatEuros } from '@/lib/studio/revenues-helpers';

interface RevenueChartBar {
  label: string;
  value: number;
}

interface RevenueChartProps {
  data: RevenueChartBar[];
  /** Index of the bar to highlight (default = last). */
  highlightIndex?: number;
}

/**
 * <RevenueChart> — chart 12 mois en barres HTML/CSS pures.
 * Hauteur normalisée vs max. Une barre highlightée (full olive),
 * les autres en olive-soft.
 * Port de docs/design/ds/studio-revenus.jsx:104-134.
 */
export function RevenueChart({ data, highlightIndex }: RevenueChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const hi = highlightIndex ?? data.length - 1;

  return (
    <div className="bg-card border border-line rounded-lg p-7" data-testid="revenue-chart">
      <div className="flex justify-between items-baseline">
        <div className="tg-eyebrow text-olive">Évolution · 12 mois glissants</div>
      </div>
      <div
        className="mt-5 flex items-end gap-2 px-1 pt-5 border-t border-dashed border-line border-b border-line relative"
        style={{ height: 240 }}
      >
        {/* Median gridline at 50% */}
        <div
          className="absolute left-0 right-0 h-px bg-line"
          style={{ top: '50%' }}
          aria-hidden="true"
        />
        {data.map((bar, i) => {
          const isCurrent = i === hi;
          const heightPct = (bar.value / max) * 100;
          return (
            <div
              key={bar.label + i}
              className="flex-1 flex flex-col items-center gap-1.5 relative"
              data-testid="revenue-chart-bar"
              data-current={isCurrent || undefined}
              title={`${bar.label} : ${formatEuros(bar.value, { withCents: false })}`}
            >
              <div
                className={`text-meta font-mono ${
                  isCurrent ? 'text-olive font-bold' : 'text-ink-40'
                }`}
                style={{ height: 14 }}
              >
                {isCurrent ? formatEuros(bar.value, { withCents: false }) : ''}
              </div>
              <div
                className={`w-full max-w-[48px] rounded-t-sm border-b-0 ${
                  isCurrent ? 'bg-olive' : 'bg-olive-soft border border-olive'
                }`}
                style={{
                  height: `${heightPct}%`,
                  minHeight: 2,
                }}
                aria-label={`${bar.label} : ${formatEuros(bar.value, { withCents: false })}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {data.map((bar, i) => (
          <div
            key={bar.label + i}
            className={`flex-1 text-meta text-center ${
              i === hi ? 'text-ink font-bold' : 'text-ink-40'
            }`}
          >
            {bar.label}
          </div>
        ))}
      </div>
    </div>
  );
}
