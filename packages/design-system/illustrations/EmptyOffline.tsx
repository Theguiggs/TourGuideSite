import * as React from 'react';
import { tg } from '../tokens';

/**
 * EmptyOffline — illustration empty state "pas de réseau" (200×200).
 *
 * Style éditorial minimaliste (Brief §6 color-block typographique) :
 *   antenne stylisée + 3 ondes (la dernière brisée) + accent grenadine
 *   (croix barrant l'antenne pour signifier "no signal").
 *
 * Min usage 120px, optimal 160-240px, max 320px. ViewBox 200×200, stroke 1.5,
 * `currentColor` pour les lignes principales (consumer tinte via parent),
 * accent grenadine fixe via `tg.colors.grenadine`.
 *
 * A11y : sans `aria-label`, illustration purement décorative
 * (`aria-hidden="true"`). Avec `aria-label`, devient `role="img"`.
 */
export interface EmptyOfflineProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

export function EmptyOffline({
  size = 200,
  color = 'currentColor',
  style,
  className,
  ...aria
}: EmptyOfflineProps) {
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
      {/* Antenne : poteau vertical + base trapézoïdale */}
      <line x1="100" y1="70" x2="100" y2="150" />
      <path d="M85 150 L100 135 L115 150 Z" />
      <line x1="80" y1="160" x2="120" y2="160" />
      {/* Ondes signal — 3 arcs, le 3e (extérieur) brisé pour signifier rupture */}
      <path d="M75 95 A28 28 0 0 1 125 95" />
      <path d="M62 88 A45 45 0 0 1 138 88" strokeDasharray="4 4" opacity="0.7" />
      <path d="M48 82 A62 62 0 0 1 90 60" />
      <path d="M110 60 A62 62 0 0 1 152 82" />
      {/* Accent grenadine : croix "no signal" sur l'antenne */}
      <line
        x1="80"
        y1="100"
        x2="120"
        y2="140"
        stroke={tg.colors.grenadine}
        strokeWidth={2.5}
      />
      <line
        x1="120"
        y1="100"
        x2="80"
        y2="140"
        stroke={tg.colors.grenadine}
        strokeWidth={2.5}
      />
    </svg>
  );
}
