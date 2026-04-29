'use client';

import type { ReactNode } from 'react';

type ActionVariant = 'mer' | 'danger' | 'olive';

interface ActionRowProps {
  variant: ActionVariant;
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Show as last row (no border-bottom). */
  isLast?: boolean;
}

const VARIANT_CFG: Record<
  ActionVariant,
  { rowBg: string; iconBg: string; iconText: string; titleText: string; arrow: string }
> = {
  mer: {
    rowBg: 'bg-mer-soft',
    iconBg: 'bg-mer',
    iconText: 'text-paper',
    titleText: 'text-mer',
    arrow: 'text-mer',
  },
  olive: {
    rowBg: 'bg-olive-soft',
    iconBg: 'bg-olive',
    iconText: 'text-paper',
    titleText: 'text-olive',
    arrow: 'text-olive',
  },
  danger: {
    rowBg: 'bg-card',
    iconBg: 'bg-grenadine-soft',
    iconText: 'text-danger',
    titleText: 'text-danger',
    arrow: 'text-danger',
  },
};

/**
 * <ActionRow> — rangée d'action sur la page Publication (Publier / Supprimer / etc.).
 * Background coloré ou neutre + icône carrée + titre + description + flèche.
 * Port de docs/design/ds/wizard-6-publication.jsx:27-42.
 */
export function ActionRow({
  variant,
  icon,
  title,
  description,
  onClick,
  disabled = false,
  isLast = false,
}: ActionRowProps) {
  const cfg = VARIANT_CFG[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid="action-row"
      data-variant={variant}
      className={[
        'w-full px-5 py-3.5 flex items-center gap-3.5 text-left cursor-pointer transition border-none',
        cfg.rowBg,
        isLast ? '' : 'border-b border-line',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:opacity-90',
      ].join(' ')}
    >
      <div
        aria-hidden="true"
        className={`w-9 h-9 rounded-md flex items-center justify-center text-h6 shrink-0 ${cfg.iconBg} ${cfg.iconText}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-caption font-bold ${cfg.titleText}`}>{title}</div>
        <div className="text-meta text-ink-80 mt-0.5">{description}</div>
      </div>
      <span aria-hidden="true" className={`text-h6 ${cfg.arrow}`}>
        →
      </span>
    </button>
  );
}
