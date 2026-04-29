'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** Headline (h2 display). */
  title: string;
  /** Italic editorial body text (optional). */
  description?: string;
  /** Optional Unicode glyph or icon node (no emoji). */
  icon?: ReactNode;
  /** Primary CTA — uses Link if href, button if onClick. */
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Test ID, useful when several empty states cohabit. */
  testId?: string;
}

/**
 * <EmptyState> — état vide unifié Murmure.
 * Card paper + icône carrée discrète + titre display + description italic + CTA.
 * Brief §7 Phase 5 (États empty).
 */
export function EmptyState({
  title,
  description,
  icon,
  cta,
  testId = 'empty-state',
}: EmptyStateProps) {
  return (
    <div
      className="bg-card border border-line rounded-xl p-10 text-center"
      data-testid={testId}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="w-12 h-12 rounded-md bg-paper-deep text-ink-60 flex items-center justify-center text-h5 mx-auto mb-3"
        >
          {icon}
        </div>
      )}
      <div className="font-display text-h5 text-ink mb-2">{title}</div>
      {description && (
        <p className="font-editorial italic text-caption text-ink-60 max-w-md mx-auto mb-5">
          {description}
        </p>
      )}
      {cta &&
        (cta.href ? (
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 bg-grenadine text-paper px-6 py-3 rounded-pill text-caption font-bold no-underline hover:opacity-90 transition"
          >
            {cta.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            className="inline-flex items-center gap-2 bg-grenadine text-paper border-none px-6 py-3 rounded-pill text-caption font-bold cursor-pointer hover:opacity-90 transition"
          >
            {cta.label}
          </button>
        ))}
    </div>
  );
}
