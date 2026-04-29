'use client';

import { tourStatusLabel } from '@/lib/studio/tours-list-helpers';
import type { StudioSessionStatus } from '@/types/studio';

interface LanguageStatusRowProps {
  /** ISO code 2 letters (FR, EN, DE, …). */
  code: string;
  /** Display label, e.g. "FR (source)" or "EN". */
  label: string;
  status: StudioSessionStatus;
  scenesCount: string;
  audioCount: string;
  wordsCount: number;
  /** Optional retire/edit action label. */
  actionLabel?: string;
  onActionClick?: () => void;
  isLast?: boolean;
}

const STATUS_CFG: Record<
  ReturnType<typeof tourStatusLabel>['color'],
  { bg: string; text: string }
> = {
  success: { bg: 'bg-olive-soft', text: 'text-success' },
  ocre: { bg: 'bg-ocre-soft', text: 'text-ocre' },
  mer: { bg: 'bg-mer-soft', text: 'text-mer' },
  danger: { bg: 'bg-grenadine-soft', text: 'text-danger' },
};

/**
 * <LanguageStatusRow> — ligne du tableau langues sur la page Publication.
 * Code+label / statut pill / scènes mono / audio mono / mots mono / action.
 * Port de docs/design/ds/wizard-6-publication.jsx:99-115.
 */
export function LanguageStatusRow({
  code,
  label,
  status,
  scenesCount,
  audioCount,
  wordsCount,
  actionLabel,
  onActionClick,
  isLast = false,
}: LanguageStatusRowProps) {
  const statusInfo = tourStatusLabel(status);
  const cfg = STATUS_CFG[statusInfo.color];

  return (
    <div
      data-testid="language-status-row"
      className={`grid items-center px-5 py-3 text-caption ${isLast ? '' : 'border-b border-line'}`}
      style={{ gridTemplateColumns: '1.4fr 1fr 0.7fr 0.7fr 0.7fr 0.8fr' }}
    >
      <div className="flex items-center gap-2">
        <span className="tg-eyebrow text-ink-60">{code.toUpperCase()}</span>
        <span className="font-semibold text-ink">{label}</span>
      </div>
      <div>
        <span className={`tg-eyebrow px-2.5 py-0.5 rounded-pill ${cfg.bg} ${cfg.text}`}>
          {statusInfo.label}
        </span>
      </div>
      <div className="font-mono text-meta text-ink-80">{scenesCount}</div>
      <div className="font-mono text-meta text-ink-80">{audioCount}</div>
      <div className="font-mono text-meta text-ink-80">{wordsCount}</div>
      <div className="text-right">
        {actionLabel && onActionClick && (
          <button
            type="button"
            onClick={onActionClick}
            data-testid="language-row-action"
            className="bg-ocre text-paper border-none px-3.5 py-1.5 rounded-pill text-meta font-bold cursor-pointer hover:opacity-90 transition"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
