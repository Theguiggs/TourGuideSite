'use client';

import { cityFamily, FAMILY_META } from '@/components/studio/shell';
import { formatEuros } from '@/lib/studio/revenues-helpers';

interface RevenueTourRowProps {
  city: string;
  title: string;
  listens: number;
  revenue: number;
  percentage: number;
  isLast?: boolean;
}

/**
 * <RevenueTourRow> — ligne de la table "Détail par tour" sur la page Revenus.
 * Bande couleur ville + city eyebrow + titre display + listens + revenue + %.
 * Port de docs/design/ds/studio-revenus.jsx:144-162.
 */
export function RevenueTourRow({
  city,
  title,
  listens,
  revenue,
  percentage,
  isLast = false,
}: RevenueTourRowProps) {
  const fam = cityFamily(city);
  const meta = FAMILY_META[fam];

  return (
    <div
      data-testid="revenue-tour-row"
      className={`grid items-center gap-3.5 py-3 ${isLast ? '' : 'border-b border-line'}`}
      style={{ gridTemplateColumns: '4px 1fr 80px 90px 60px' }}
    >
      <span className={`block w-1 h-7 rounded-sm ${meta.bg}`} aria-hidden="true" />
      <div className="min-w-0">
        <div className={`tg-eyebrow ${meta.text}`}>{city}</div>
        <div className="font-display text-caption mt-0.5 text-ink truncate">
          {title}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-caption text-ink-60">
          {listens.toLocaleString('fr-FR')}
        </div>
        <div className="text-meta text-ink-40">écoutes</div>
      </div>
      <div className="text-right">
        <div className="font-display text-h6 text-olive font-semibold">
          {formatEuros(revenue, { withCents: false })}
        </div>
      </div>
      <div className="text-right font-mono text-meta text-ink-40">{percentage.toFixed(0)}%</div>
    </div>
  );
}
