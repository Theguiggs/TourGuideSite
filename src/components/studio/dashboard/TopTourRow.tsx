'use client';

import Link from 'next/link';
import { tgColors } from '@tourguide/design-system';
import { cityFamily, FAMILY_META, type CityFamily } from '@/components/studio/shell';

interface TopTourRowProps {
  /** Tour href (link target). */
  href: string;
  /** City name (drives the color band). */
  city: string;
  /** Tour title in display font. */
  title: string;
  /** Plays count for the period (or null when unavailable). */
  plays: number | null;
  /** Average rating 0..5 (or null when unavailable). */
  rating: number | null;
  /** Optional sparkline data points (last N periods). */
  sparkData?: number[];
  /** Hide bottom border (used on the last row of a list). */
  isLast?: boolean;
}

/** SVG `stroke` n'accepte pas les classes Tailwind — on lit les tokens DS dynamiquement. */
const FAMILY_HEX: Record<CityFamily, string> = {
  mer: tgColors.mer,
  ocre: tgColors.ocre,
  olive: tgColors.olive,
  ardoise: tgColors.ardoise,
};

/**
 * <TopTourRow> — ligne de la table "Tours qui marchent" sur le Dashboard.
 * Bande couleur ville + titre + sparkline + plays + rating.
 * Port de docs/design/ds/studio-dashboard.jsx:81-113.
 */
export function TopTourRow({
  href,
  city,
  title,
  plays,
  rating,
  sparkData,
  isLast = false,
}: TopTourRowProps) {
  const fam = cityFamily(city);
  const meta = FAMILY_META[fam];

  return (
    <Link
      href={href}
      data-testid="top-tour-row"
      className={`grid items-center gap-4 px-4 py-3 no-underline hover:bg-paper-soft transition ${isLast ? '' : 'border-b border-line'}`}
      style={{ gridTemplateColumns: '4px 1fr 90px 90px 60px' }}
    >
      <span className={`block w-1 h-9 rounded-sm ${meta.bg}`} aria-hidden="true" />
      <div className="min-w-0">
        <div className={`flex items-center gap-1.5 tg-eyebrow ${meta.text}`}>
          <span className={`w-1.5 h-1.5 rounded-pill ${meta.bg}`} aria-hidden="true" />
          {city.toUpperCase()}
        </div>
        <div className="font-display text-h6 text-ink mt-0.5 leading-tight truncate">
          {title}
        </div>
      </div>
      {sparkData && sparkData.length > 1 ? (
        <Sparkline data={sparkData} stroke={FAMILY_HEX[fam]} />
      ) : (
        <span aria-hidden="true" />
      )}
      <div className="text-right">
        <div className="font-display text-h6 text-ink leading-none">
          {plays ?? '—'}
        </div>
        <div className="text-meta text-ink-40 font-mono tracking-wide">écoutes</div>
      </div>
      <div className="text-right text-caption text-ocre font-bold">
        {rating !== null ? `★${rating.toFixed(1).replace('.', ',')}` : '—'}
      </div>
    </Link>
  );
}

interface SparklineProps {
  data: number[];
  stroke: string;
}

function Sparkline({ data, stroke }: SparklineProps) {
  const w = 80;
  const h = 24;
  const max = Math.max(...data, 1);
  const stepX = w / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}
