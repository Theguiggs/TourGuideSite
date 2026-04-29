import * as React from 'react';

/**
 * IconLock — icône cadenas fermé (Lucide `lock`).
 *
 * Min usage 16px, optimal 20-24px, viewBox 24×24, stroke 1.5, currentColor.
 * Wrap in `<IconButton>` (Story 3.7) or a `<button>` with `minHeight: 44pt`
 * for tap targets. Default `aria-hidden="true"` if no `aria-label`.
 */
export interface IconLockProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

export function IconLock({
  size = 24,
  color = 'currentColor',
  style,
  className,
  ...aria
}: IconLockProps) {
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
