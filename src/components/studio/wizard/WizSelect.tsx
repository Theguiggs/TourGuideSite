'use client';

import type { SelectHTMLAttributes } from 'react';

interface WizSelectOption {
  value: string;
  label: string;
}

type WizSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: ReadonlyArray<WizSelectOption>;
};

/**
 * <WizSelect> — select natif stylé Murmure avec caret ▼ overlay.
 * Port de docs/design/ds/wizard-2-general.jsx:162-169.
 */
export function WizSelect({
  options,
  className = '',
  ...rest
}: WizSelectProps) {
  return (
    <div className="relative">
      <select
        className={`w-full pl-3 pr-9 py-2.5 text-caption border border-line rounded-md bg-paper text-ink box-border outline-none focus:border-grenadine transition appearance-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-40 text-meta pointer-events-none"
      >
        ▼
      </span>
    </div>
  );
}
