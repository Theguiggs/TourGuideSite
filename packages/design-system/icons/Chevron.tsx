import * as React from 'react';

/**
 * IconChevron — icône chevron droit (Lucide `chevron-right`).
 *
 * Le consumer rotate via CSS pour les autres directions :
 * - down  → `transform: rotate(90deg)`
 * - left  → `transform: rotate(180deg)`
 * - up    → `transform: rotate(-90deg)`
 *
 * Min usage 16px, optimal 20-24px, viewBox 24×24, stroke 1.5, currentColor.
 * Wrap in `<IconButton>` (Story 3.7) or a `<button>` with `minHeight: 44pt`
 * for tap targets. Default `aria-hidden="true"` if no `aria-label`.
 */
export interface IconChevronProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

export function IconChevron({
  size = 24,
  color = 'currentColor',
  style,
  className,
  ...aria
}: IconChevronProps) {
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
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
