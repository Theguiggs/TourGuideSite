'use client';

import type { TextareaHTMLAttributes } from 'react';

type WizTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * <WizTextarea> — multi-line texte stylé Murmure.
 * Resize vertical, focus border grenadine.
 */
export function WizTextarea({
  rows = 4,
  className = '',
  ...rest
}: WizTextareaProps) {
  return (
    <textarea
      rows={rows}
      className={`w-full px-3 py-2.5 text-caption border border-line rounded-md bg-paper text-ink box-border outline-none focus:border-grenadine transition resize-y leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    />
  );
}
