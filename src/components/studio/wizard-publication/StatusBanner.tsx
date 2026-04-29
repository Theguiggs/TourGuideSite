'use client';

import type { ReactNode } from 'react';

type StatusVariant = 'draft' | 'submitted' | 'published' | 'rejected' | 'revision';

interface StatusBannerProps {
  variant: StatusVariant;
  /** Status pill label. */
  label: string;
  /** Version number (e.g. "V1"). */
  version?: string | number;
  /** Italic editorial message. */
  children: ReactNode;
}

const VARIANT_CFG: Record<
  StatusVariant,
  { bg: string; border: string; borderLeft: string; text: string; pill: string }
> = {
  draft: {
    bg: 'bg-ocre-soft',
    border: 'border-ocre',
    borderLeft: 'border-l-4 border-l-ocre',
    text: 'text-ocre',
    pill: 'bg-paper text-ocre',
  },
  submitted: {
    bg: 'bg-mer-soft',
    border: 'border-mer',
    borderLeft: 'border-l-4 border-l-mer',
    text: 'text-mer',
    pill: 'bg-paper text-mer',
  },
  revision: {
    bg: 'bg-grenadine-soft',
    border: 'border-grenadine',
    borderLeft: 'border-l-4 border-l-grenadine',
    text: 'text-grenadine',
    pill: 'bg-paper text-grenadine',
  },
  rejected: {
    bg: 'bg-grenadine-soft',
    border: 'border-danger',
    borderLeft: 'border-l-4 border-l-danger',
    text: 'text-danger',
    pill: 'bg-paper text-danger',
  },
  published: {
    bg: 'bg-olive-soft',
    border: 'border-olive',
    borderLeft: 'border-l-4 border-l-olive',
    text: 'text-success',
    pill: 'bg-paper text-success',
  },
};

/**
 * <StatusBanner> — bandeau de statut Murmure pour la page Publication.
 * Pill couleur famille + version mono + message editorial italic.
 * Port de docs/design/ds/wizard-6-publication.jsx:14-21.
 */
export function StatusBanner({ variant, label, version, children }: StatusBannerProps) {
  const cfg = VARIANT_CFG[variant];
  return (
    <div
      className={`rounded-md p-4 flex items-center gap-3 flex-wrap ${cfg.bg} ${cfg.border} border ${cfg.borderLeft}`}
      data-testid="status-banner"
      data-variant={variant}
      role="status"
    >
      <span
        className={`tg-eyebrow px-2.5 py-0.5 rounded-pill shrink-0 ${cfg.pill}`}
      >
        {label}
      </span>
      {version && (
        <span className={`text-meta font-mono font-bold ${cfg.text}`}>
          V{String(version).replace(/^V/, '')}
        </span>
      )}
      <span className="font-editorial italic text-caption text-ink-80">
        {children}
      </span>
    </div>
  );
}
