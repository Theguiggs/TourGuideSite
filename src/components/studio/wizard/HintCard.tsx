'use client';

import type { ReactNode } from 'react';

type HintColor = 'mer' | 'olive' | 'ocre';

interface HintCardProps {
  /** Family color (default mer). */
  color?: HintColor;
  /** Glyph or icon shown in the leading badge. */
  icon?: ReactNode;
  children: ReactNode;
}

const COLOR_CFG: Record<HintColor, { soft: string; bg: string }> = {
  mer: { soft: 'bg-mer-soft', bg: 'bg-mer' },
  olive: { soft: 'bg-olive-soft', bg: 'bg-olive' },
  ocre: { soft: 'bg-ocre-soft', bg: 'bg-ocre' },
};

/**
 * <HintCard> — encart conseil utilisé dans les étapes du wizard.
 * Fond pastel + icône colorée + contenu.
 * Port de docs/design/ds/wizard-shared.jsx:90-97.
 */
export function HintCard({ color = 'mer', icon = '✦', children }: HintCardProps) {
  const cfg = COLOR_CFG[color];
  return (
    <div
      className={`p-3.5 rounded-md flex gap-3 items-start ${cfg.soft}`}
      data-testid="hint-card"
    >
      <div
        className={`w-7 h-7 rounded-sm text-paper flex items-center justify-center text-meta shrink-0 ${cfg.bg}`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="text-meta text-ink-80 leading-relaxed">{children}</div>
    </div>
  );
}
