import * as React from 'react';

/**
 * IconClose — icône fermer (Lucide `x`).
 *
 * Min usage 16px, optimal 20-24px, viewBox 24×24, stroke 1.5, currentColor.
 * Wrap in `<IconButton>` (Story 3.7) or a `<button>` with `minHeight: 44pt`
 * for tap targets. Default `aria-hidden="true"` if no `aria-label`.
 */
export interface IconCloseProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

export function IconClose({
  size = 24,
  color = 'currentColor',
  style,
  className,
  ...aria
}: IconCloseProps) {
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
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}
