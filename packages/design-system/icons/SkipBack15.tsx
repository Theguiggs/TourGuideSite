import * as React from 'react';

/**
 * IconSkipBack15 — @custom : recule lecteur de 15s.
 *
 * Hand-authored : arc circulaire (counter-clockwise) + flèche + label "15".
 * Min usage 16px, optimal 20-24px, viewBox 24×24, stroke 1.5, currentColor.
 * Wrap in `<IconButton>` (Story 3.7) or a `<button>` with `minHeight: 44pt`
 * for tap targets. Default `aria-hidden="true"` if no `aria-label`.
 */
export interface IconSkipBack15Props {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

export function IconSkipBack15({
  size = 24,
  color = 'currentColor',
  style,
  className,
  ...aria
}: IconSkipBack15Props) {
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
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <polyline points="21 3 21 7 17 7" transform="translate(-3 0)" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="7"
        fontFamily="Manrope, system-ui, sans-serif"
        fontWeight="700"
        fill={color}
        stroke="none"
      >
        15
      </text>
    </svg>
  );
}
