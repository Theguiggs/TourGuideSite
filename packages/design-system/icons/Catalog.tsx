import * as React from 'react';

/**
 * IconCatalog — icône navigation catalogue (Lucide `library`).
 *
 * Min usage 16px, optimal 20-24px, viewBox 24×24, stroke 1.5, currentColor.
 * Wrap in `<IconButton>` (Story 3.7) or a `<button>` with `minHeight: 44pt`
 * for tap targets. Default `aria-hidden="true"` if no `aria-label`.
 */
export interface IconCatalogProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

export function IconCatalog({
  size = 24,
  color = 'currentColor',
  style,
  className,
  ...aria
}: IconCatalogProps) {
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
      <path d="M16 6l4 14" />
      <path d="M12 6v14" />
      <path d="M8 8v12" />
      <path d="M4 4v16" />
    </svg>
  );
}
