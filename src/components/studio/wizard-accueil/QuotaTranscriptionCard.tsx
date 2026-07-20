'use client';

import { useStudioLocale } from '@/lib/i18n/studio-locale';

interface QuotaTranscriptionCardProps {
  /** Minutes already used. */
  usedMin: number;
  /** Total monthly quota in minutes. */
  totalMin: number;
  /** Optional month label, e.g. "avril". */
  monthLabel?: string;
}

/**
 * <QuotaTranscriptionCard> — jauge de progression du quota transcription.
 * Correction du brief §8 : remplace l'ancienne ligne barrée par une vraie
 * jauge avec reste calculé.
 * Port de docs/design/ds/wizard-1-accueil.jsx:32-44.
 */
export function QuotaTranscriptionCard({
  usedMin,
  totalMin,
  monthLabel,
}: QuotaTranscriptionCardProps) {
  const { locale, t } = useStudioLocale();
  const safeTotal = Math.max(1, totalMin);
  const pct = Math.min(100, Math.max(0, (usedMin / safeTotal) * 100));
  const remaining = Math.max(0, totalMin - usedMin);
  const isFull = pct >= 100;

  // Format with one decimal if non-integer, else integer.
  const fmtMin = (v: number): string => {
    if (Number.isInteger(v)) return String(v);
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v);
  };

  return (
    <div
      className="bg-card border border-line rounded-md px-5 py-3.5"
      data-testid="quota-transcription-card"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-caption font-bold text-ink border-b-2 border-grenadine pb-0.5">
            {t('Quota transcription', 'Transcription allowance')}
          </span>
          {monthLabel && (
            <span className="text-meta text-ink-60">· {monthLabel}</span>
          )}
        </div>
        <span
          className="font-mono text-meta text-ink-80 font-semibold"
          data-testid="quota-numbers"
        >
          {fmtMin(usedMin)} / {totalMin} min
        </span>
      </div>
      <div className="h-1.5 bg-paper-deep rounded-sm overflow-hidden">
        <div
          className={`h-full transition-all ${isFull ? 'bg-danger' : 'bg-grenadine'}`}
          style={{ width: `${pct}%` }}
          data-testid="quota-bar"
          aria-hidden="true"
        />
      </div>
      <div className="text-meta text-ink-60 mt-1.5">
        {isFull ? (
          <>
            <strong className="text-danger">{t('Quota épuisé', 'Allowance used')}</strong>
            {' · '}{t('renouvellement le 1er du mois prochain.', 'renews on the first day of next month.')}
          </>
        ) : (
          <>
            {t('Encore', 'You have')} <strong className="text-ink">{fmtMin(remaining)} min</strong>{' '}
            {t('de transcription audio disponibles', 'of audio transcription left')}{monthLabel ? t(' ce mois-ci', ' this month') : ''}.
          </>
        )}
      </div>
    </div>
  );
}
