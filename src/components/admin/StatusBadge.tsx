import type React from 'react';
import type { StatusBadgeSpec } from '@/lib/admin/status-badges';

/** Pastille de statut de l'admin : un seul rendu pour toutes les tables. */
export function StatusBadge({
  badge,
  size = 'meta',
  className = '',
  ...rest
}: {
  badge: StatusBadgeSpec;
  size?: 'meta' | 'eyebrow';
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-block rounded-pill px-2 py-0.5 font-medium ${size === 'eyebrow' ? 'text-eyebrow px-1.5' : 'text-meta'} ${badge.className} ${className}`}
      {...rest}
    >
      {badge.label}
    </span>
  );
}
