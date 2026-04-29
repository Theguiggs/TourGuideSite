'use client';

import type { ReactNode } from 'react';

type KpiColor = 'mer' | 'ocre' | 'olive' | 'grenadine';

interface KpiCardProps {
  /** Petit label en haut, eyebrow style. */
  label: string;
  /** Valeur principale (ex : "1 247", "342 €", "4,7"). */
  value: string;
  /** Suffixe optionnel à côté de la valeur (ex : "/ 5"). */
  sub?: string;
  /** Variation textuelle (ex : "+18%", "3 nouveaux"). */
  delta?: string;
  /** Si true, le delta est rendu en `success`, sinon `ink60`. Défaut true. */
  deltaPositive?: boolean;
  /** Couleur de la pastille icône. */
  color: KpiColor;
  /** Glyph ou élément icône (Unicode mono caractère ou `<svg>`). */
  icon: ReactNode;
}

const COLOR_CLS: Record<KpiColor, string> = {
  mer: 'bg-mer',
  ocre: 'bg-ocre',
  olive: 'bg-olive',
  grenadine: 'bg-grenadine',
};

/**
 * <KpiCard> — carte stat dashboard (Avril en bref).
 * Port de docs/design/ds/studio-dashboard.jsx:50-69.
 */
export function KpiCard({
  label,
  value,
  sub,
  delta,
  deltaPositive = true,
  color,
  icon,
}: KpiCardProps) {
  return (
    <div
      className="bg-card border border-line rounded-lg p-5"
      data-testid="kpi-card"
    >
      <div className="flex items-center justify-between">
        <div
          className={`w-8 h-8 rounded-md flex items-center justify-center text-paper text-base ${COLOR_CLS[color]}`}
          aria-hidden="true"
        >
          {icon}
        </div>
        {delta && (
          <div
            className={`text-meta font-bold ${deltaPositive ? 'text-success' : 'text-ink-60'}`}
            data-testid="kpi-delta"
          >
            {delta}
          </div>
        )}
      </div>
      <div className="tg-eyebrow text-ink-60 mt-4">{label}</div>
      <div className="flex items-baseline gap-1 mt-1">
        <div className="font-display text-h4 text-ink leading-none">{value}</div>
        {sub && <div className="text-caption text-ink-60">{sub}</div>}
      </div>
    </div>
  );
}
