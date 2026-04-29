import * as React from 'react';

/**
 * IconDownloaded — @custom : variante "pleine" du download (cercle avec check).
 *
 * Hand-authored : cercle + check (similaire Lucide `check-circle-2`).
 * Min usage 16px, optimal 20-24px, viewBox 24×24, stroke 1.5, currentColor.
 * Wrap in `<IconButton>` (Story 3.7) or a `<button>` with `minHeight: 44pt`
 * for tap targets. Default `aria-hidden="true"` if no `aria-label`.
 */
export interface IconDownloadedProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

export function IconDownloaded({
  size = 24,
  color = 'currentColor',
  style,
  className,
  ...aria
}: IconDownloadedProps) {
  const ariaLabel = aria['aria-label'];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
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
      <circle cx="12" cy="12" r="9" />
      <polyline points="8 12.5 11 15.5 16.5 9.5" />
    </svg>
  );
}
