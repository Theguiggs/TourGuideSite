'use client';

import type { ReactNode } from 'react';

interface SceneSubTabProps {
  label: string;
  /** Optional Unicode glyph or icon node (no emoji). */
  icon?: ReactNode;
  /** Optional small counter, e.g. "(2)". */
  count?: number;
  isActive: boolean;
  onClick?: () => void;
}

/**
 * <SceneSubTab> — sub-tab POI / Photos / Texte / Audio sur une scène active.
 * Underline grenadine sur l'actif. Compteur entre parenthèses.
 * Port de docs/design/ds/wizard-4-scenes.jsx:73-88.
 */
export function SceneSubTab({
  label,
  icon,
  count,
  isActive,
  onClick,
}: SceneSubTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`scene-sub-tab-${label.toLowerCase()}`}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'px-3.5 py-2 text-caption transition flex items-center gap-1.5 border-b-2 cursor-pointer no-underline whitespace-nowrap -mb-px',
        isActive
          ? 'border-grenadine text-grenadine font-bold'
          : 'border-transparent text-ink-60 hover:text-ink-80 hover:border-line font-medium',
      ].join(' ')}
    >
      {icon && (
        <span aria-hidden="true" className="text-meta">
          {icon}
        </span>
      )}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className="text-meta text-ink-40">({count})</span>
      )}
    </button>
  );
}
