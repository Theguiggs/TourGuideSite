'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type SuggestionColor = 'mer' | 'olive';

interface SuggestionCardProps {
  /** Eyebrow label, e.g. "Suggestion · une action recommandée". */
  eyebrow: string;
  /** Main title. */
  title: ReactNode;
  /** Body explanation. */
  body: string;
  /** CTA label. */
  ctaLabel: string;
  /** CTA href (for navigation). Mutually exclusive with ctaOnClick. */
  ctaHref?: string;
  /** CTA onClick handler. Mutually exclusive with ctaHref. */
  ctaOnClick?: () => void;
  /** Family color. */
  color?: SuggestionColor;
  /** Glyph or icon to display in the leading badge. */
  icon?: ReactNode;
}

const COLOR_CFG: Record<
  SuggestionColor,
  { soft: string; bg: string; text: string; border: string; cta: string }
> = {
  mer: {
    soft: 'bg-mer-soft',
    bg: 'bg-mer',
    text: 'text-mer',
    border: 'border-mer',
    cta: 'bg-mer text-paper hover:opacity-90',
  },
  olive: {
    soft: 'bg-olive-soft',
    bg: 'bg-olive',
    text: 'text-olive',
    border: 'border-olive',
    cta: 'bg-olive text-paper hover:opacity-90',
  },
};

/**
 * <SuggestionCard> — encart "Suggestion · une action recommandée" du Dashboard.
 * Fond pastel + bordure dashed + icône colorée + CTA.
 * Port de docs/design/ds/studio-dashboard.jsx:147-159.
 */
export function SuggestionCard({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  color = 'mer',
  icon = '✦',
}: SuggestionCardProps) {
  const cfg = COLOR_CFG[color];

  const ctaClasses = `${cfg.cta} border-none px-5 py-3 rounded-pill text-caption font-bold cursor-pointer transition no-underline shrink-0 inline-flex items-center`;

  return (
    <div
      data-testid="suggestion-card"
      className={`rounded-lg p-6 flex flex-col md:flex-row md:items-center gap-5 ${cfg.soft} border-2 border-dashed ${cfg.border}`}
    >
      <div
        className={`w-14 h-14 rounded-md flex items-center justify-center text-paper text-h6 shrink-0 ${cfg.bg}`}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`tg-eyebrow ${cfg.text}`}>{eyebrow}</div>
        <div className="font-display text-h5 text-ink mt-1 leading-tight">{title}</div>
        <p className="text-caption text-ink-80 mt-1.5 leading-relaxed">{body}</p>
      </div>
      {ctaHref ? (
        <Link href={ctaHref} className={ctaClasses} data-testid="suggestion-cta">
          {ctaLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={ctaOnClick}
          className={ctaClasses}
          data-testid="suggestion-cta"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
