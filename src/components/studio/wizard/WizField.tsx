'use client';

import { Children, cloneElement, isValidElement, type ReactNode } from 'react';

interface WizFieldProps {
  /** Label text displayed above the control. */
  label: string;
  /** When true, shows a grenadine asterisk and adds aria-required on children automatically. */
  required?: boolean;
  /** Right-aligned hint, typically a "N / max" character counter (mono font). */
  hint?: ReactNode;
  /** Optional id for the label `htmlFor`. Defaults to a generated id from label. */
  htmlFor?: string;
  /** Inline validation error (red, replaces helper). */
  error?: string;
  /** Inline helper text (italic ink-60), shown when no error. */
  helper?: string;
  children: ReactNode;
}

/**
 * <WizField> — wrapper de champ pour les étapes du wizard.
 * Label + (optionnel: required asterisk + hint counter) + children + (helper / error).
 * Port de docs/design/ds/wizard-2-general.jsx:143-155 (Field component).
 */
export function WizField({
  label,
  required = false,
  hint,
  htmlFor,
  error,
  helper,
  children,
}: WizFieldProps) {
  // L’erreur est reliée au champ (`aria-describedby` + `aria-invalid`) quand
  // l’enfant est un élément unique : un lecteur d’écran l’entend avec le champ,
  // pas seulement comme une alerte flottante.
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const single = Children.count(children) === 1 ? Children.only(children) : null;
  const wired =
    error && errorId && isValidElement<{ 'aria-describedby'?: string; 'aria-invalid'?: boolean }>(single)
      ? cloneElement(single, { 'aria-describedby': errorId, 'aria-invalid': true })
      : children;

  return (
    <div className="mb-5" data-testid="wiz-field">
      <div className="flex items-baseline justify-between mb-1.5">
        <label
          htmlFor={htmlFor}
          className="text-meta font-semibold text-ink-80 tracking-wide"
        >
          {label}
          {required && (
            <span className="text-grenadine ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {hint && (
          <span className="text-meta text-ink-40 font-mono">{hint}</span>
        )}
      </div>
      {wired}
      {error ? (
        <div id={errorId} className="text-meta text-danger mt-1" role="alert">
          {error}
        </div>
      ) : helper ? (
        <div className="text-meta text-ink-60 mt-1 italic">{helper}</div>
      ) : null}
    </div>
  );
}
