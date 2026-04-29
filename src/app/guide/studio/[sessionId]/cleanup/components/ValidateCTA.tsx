'use client';

import type { ValidationResult } from '../lib/validation';

interface ValidateCTAProps {
  validation: ValidationResult;
  busy: boolean;
  onValidate: () => void;
}

/**
 * Sticky bottom CTA: "Valider et passer en édition".
 * Disabled until `validation.ready`; shows the failing reasons as a tooltip
 * (native title attribute + visible list) when disabled; shows "Prêt à valider"
 * when enabled.
 */
export function ValidateCTA({ validation, busy, onValidate }: ValidateCTAProps) {
  const disabled = !validation.ready || busy;
  const title = validation.ready
    ? 'Prêt à valider'
    : validation.reasons.join(' · ');

  return (
    <div
      className="sticky bottom-0 left-0 right-0 bg-white border-t border-line px-4 py-3 flex items-center justify-between gap-3"
      data-testid="validate-cta-bar"
    >
      <div className="flex-1 min-w-0 text-xs text-ink-60" data-testid="validate-cta-reasons">
        {validation.ready ? (
          <span className="text-success font-medium" data-testid="validate-cta-ready">
            Prêt à valider
          </span>
        ) : (
          <ul className="list-disc list-inside">
            {validation.reasons.slice(0, 3).map((r) => (
              <li key={r} className="truncate">
                {r}
              </li>
            ))}
            {validation.reasons.length > 3 && (
              <li className="text-ink-40">
                +{validation.reasons.length - 3} autre(s)
              </li>
            )}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={onValidate}
        disabled={disabled}
        title={title}
        aria-disabled={disabled}
        data-testid="validate-cta-button"
        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
          disabled
            ? 'bg-paper-deep text-ink-40 cursor-not-allowed'
            : 'bg-grenadine text-white hover:opacity-90'
        }`}
      >
        {busy ? 'Validation...' : 'Valider et passer en édition'}
      </button>
    </div>
  );
}
