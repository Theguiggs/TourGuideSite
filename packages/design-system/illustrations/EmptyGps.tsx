import * as React from 'react';
import { tg } from '../tokens';

/**
 * EmptyGps — illustration empty state "GPS désactivé" (200×200).
 *
 * Style éditorial minimaliste (Brief §6) :
 *   pin de carte centré + cercle de précision en pointillés (rompu) +
 *   accent grenadine (slash diagonal pour signifier "désactivé").
 *
 * Min usage 120px, optimal 160-240px, max 320px. ViewBox 200×200, stroke 1.5,
 * `currentColor` pour les lignes principales, accent grenadine fixe.
 *
 * A11y : sans `aria-label`, illustration purement décorative
 * (`aria-hidden="true"`). Avec `aria-label`, devient `role="img"`.
 */
export interface EmptyGpsProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

export function EmptyGps({
  size = 200,
  color = 'currentColor',
  style,
  className,
  ...aria
}: EmptyGpsProps) {
  const ariaLabel = aria['aria-label'];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {/* Pin de carte centré : goutte renversée + œillet */}
      <path d="M100 50 C78 50 60 68 60 90 C60 120 100 160 100 160 C100 160 140 120 140 90 C140 68 122 50 100 50 Z" />
      <circle cx="100" cy="90" r="12" />
      {/* Cercle de précision (rompu) en pointillés */}
      <circle
        cx="100"
        cy="170"
        r="22"
        strokeDasharray="3 5"
        opacity="0.7"
      />
      {/* Accent grenadine : slash diagonal "désactivé" */}
      <line
        x1="55"
        y1="55"
        x2="145"
        y2="155"
        stroke={tg.colors.grenadine}
        strokeWidth={2.5}
      />
    </svg>
  );
}
