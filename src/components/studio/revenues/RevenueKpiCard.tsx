'use client';

interface RevenueKpiCardProps {
  /** Eyebrow label, e.g. "Cumul 2026". */
  eyebrow: string;
  /** Main numeric value as string (already formatted, e.g. "1 030"). */
  value: string;
  /** Suffix (e.g. "€"). */
  suffix?: string;
  /** Optional small footer line under the value. */
  footer?: string;
  /** Optional progress bar (e.g. annual goal). */
  progress?: { pct: number; label: string };
  /** Optional second footer (italic) above the divider. */
  italicNote?: string;
}

/**
 * <RevenueKpiCard> — petite card sobre cumul/total revenus.
 * Port de docs/design/ds/studio-revenus.jsx:66-91.
 */
export function RevenueKpiCard({
  eyebrow,
  value,
  suffix,
  footer,
  italicNote,
  progress,
}: RevenueKpiCardProps) {
  return (
    <div className="bg-card border border-line rounded-lg p-5" data-testid="revenue-kpi">
      <div className="tg-eyebrow text-ink-60">{eyebrow}</div>
      <div className="flex items-baseline gap-1 mt-2">
        <div className="font-display text-h5 text-ink leading-none">{value}</div>
        {suffix && <div className="text-body text-ink-60">{suffix}</div>}
      </div>
      {footer && <div className="text-meta text-ink-60 mt-1.5">{footer}</div>}
      {(italicNote || progress) && (
        <div className="h-px bg-line my-3.5" aria-hidden="true" />
      )}
      {italicNote && (
        <div className="text-meta text-ink-40 italic">{italicNote}</div>
      )}
      {progress && (
        <>
          <div className="h-1 bg-paper-deep rounded-sm mt-1.5 overflow-hidden">
            <div
              className="h-full bg-olive transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress.pct))}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="text-meta text-ink-60 mt-1">{progress.label}</div>
        </>
      )}
    </div>
  );
}
