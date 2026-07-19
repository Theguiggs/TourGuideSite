'use client';

import { cityFamily, FAMILY_META } from '@/components/studio/shell';
import { formatEuros } from '@/lib/studio/revenues-helpers';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

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
  const { locale } = useStudioLocale();
  const fam = cityFamily(city);
  const meta = FAMILY_META[fam];

  return (
    <div
      data-testid="revenue-tour-row"
      className={`grid grid-cols-[4px_minmax(0,1fr)_74px] items-center gap-3 py-3 sm:grid-cols-[4px_minmax(0,1fr)_80px_90px_60px] sm:gap-3.5 ${isLast ? '' : 'border-b border-line'}`}
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
          {listens.toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR')}
        </div>
        <div className="text-meta text-ink-40">{locale === 'en' ? 'plays' : 'écoutes'}</div>
      </div>
      <div className="hidden text-right sm:block">
        <div className="font-display text-h6 text-olive font-semibold">
          {formatEuros(revenue, { withCents: false })}
        </div>
      </div>
      <div className="hidden text-right font-mono text-meta text-ink-40 sm:block">{percentage.toFixed(0)}%</div>
    </div>
  );
}
