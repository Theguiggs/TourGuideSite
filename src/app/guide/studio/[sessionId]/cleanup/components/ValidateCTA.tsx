'use client';

import type { ValidationResult } from '../lib/validation';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

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
  const { t } = useStudioLocale();
  const disabled = !validation.ready || busy;
  const title = validation.ready
    ? t('Prêt à valider', 'Ready to validate')
    : validation.reasons.join(' · ');

  return (
    <div
      className="sticky bottom-0 left-0 right-0 bg-card border-t border-line px-4 py-3 flex items-center justify-between gap-3"
      data-testid="validate-cta-bar"
    >
      <div className="flex-1 min-w-0 text-meta text-ink-60" data-testid="validate-cta-reasons">
        {validation.ready ? (
          <span className="text-success font-medium" data-testid="validate-cta-ready">
            {t('Prêt à valider', 'Ready to validate')}
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
                +{validation.reasons.length - 3} {t('autre(s)', 'other(s)')}
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
        className={`px-4 py-2 rounded-lg text-body font-medium transition ${
          disabled
            ? 'bg-paper-deep text-ink-40 cursor-not-allowed'
            : 'bg-grenadine text-white hover:opacity-90'
        }`}
      >
        {busy ? t('Validation...', 'Validating...') : t('Valider et passer en édition', 'Validate and move to editing')}
      </button>
    </div>
  );
}
