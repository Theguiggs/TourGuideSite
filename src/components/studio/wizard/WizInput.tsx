'use client';

import type { InputHTMLAttributes } from 'react';

type WizInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  type?: 'text' | 'number' | 'email' | 'tel' | 'url' | 'search';
  /** When true, applies grenadine focus ring (default). Set to false for read-only displays. */
  interactive?: boolean;
};

/**
 * <WizInput> — input text/number stylé Murmure.
 * Port de docs/design/ds/wizard-2-general.jsx:156-161 (Input component).
 */
export function WizInput({
  type = 'text',
  interactive = true,
  className = '',
  ...rest
}: WizInputProps) {
  const focusCls = interactive
    ? 'outline-none focus:border-grenadine'
    : 'outline-none';
  return (
    <input
      type={type}
      className={`w-full px-3 py-2.5 text-caption border border-line rounded-md bg-paper text-ink box-border transition ${focusCls} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    />
  );
}
