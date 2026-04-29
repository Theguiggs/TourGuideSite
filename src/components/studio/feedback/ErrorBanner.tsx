'use client';

import type { ReactNode } from 'react';

type ErrorBannerVariant = 'danger' | 'warning';

interface ErrorBannerProps {
  variant?: ErrorBannerVariant;
  /** Bold short title, e.g. "Erreur de chargement". */
  title?: string;
  /** Body message. */
  children: ReactNode;
  /** Optional retry handler — renders an underline button if provided. */
  onRetry?: () => void;
  retryLabel?: string;
}

const VARIANT_CFG: Record<
  ErrorBannerVariant,
  { bg: string; border: string; text: string }
> = {
  danger: { bg: 'bg-grenadine-soft', border: 'border-grenadine', text: 'text-danger' },
  warning: { bg: 'bg-ocre-soft', border: 'border-ocre', text: 'text-ocre' },
};

/**
 * <ErrorBanner> — bandeau erreur Murmure avec retry inline.
 * Brief §7 Phase 5 (États erreur — bandeau danger en haut, retry inline).
 */
export function ErrorBanner({
  variant = 'danger',
  title,
  children,
  onRetry,
  retryLabel = 'Réessayer',
}: ErrorBannerProps) {
  const cfg = VARIANT_CFG[variant];
  return (
    <div
      role="alert"
      data-testid="error-banner"
      data-variant={variant}
      className={`rounded-md border p-4 ${cfg.bg} ${cfg.border} ${cfg.text}`}
    >
      {title && <div className="text-caption font-bold mb-1">{title}</div>}
      <div className="text-caption">{children}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          data-testid="error-banner-retry"
          className={`mt-2 text-meta font-semibold underline underline-offset-2 hover:opacity-80 transition ${cfg.text}`}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
