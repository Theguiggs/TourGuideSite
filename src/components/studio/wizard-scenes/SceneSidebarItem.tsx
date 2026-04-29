'use client';

import { sceneStatusPill } from '@/lib/studio/wizard-helpers';
import type { SceneStatus } from '@/types/studio';

interface SceneSidebarItemProps {
  /** 1-based index displayed as a numbered marker (italic editorial). */
  index: number;
  title: string;
  status: SceneStatus;
  isActive: boolean;
  onClick?: () => void;
}

/**
 * <SceneSidebarItem> — item de la sidebar liste des scènes (étape Wizard Scènes).
 * Numéro éditorial italique olive sur l'actif, titre tronqué, status pill.
 * Port de docs/design/ds/wizard-4-scenes.jsx:18-37.
 */
export function SceneSidebarItem({
  index,
  title,
  status,
  isActive,
  onClick,
}: SceneSidebarItemProps) {
  const pill = sceneStatusPill(status);

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="scene-sidebar-item"
      data-active={isActive || undefined}
      aria-current={isActive ? 'true' : undefined}
      className={[
        'w-full grid items-center gap-2.5 px-2.5 py-2 rounded-md transition text-left cursor-pointer border',
        isActive
          ? 'bg-olive-soft border-olive'
          : 'bg-transparent border-transparent hover:bg-paper-soft',
      ].join(' ')}
      style={{ gridTemplateColumns: '24px 1fr' }}
    >
      <span
        aria-hidden="true"
        className={[
          'w-5.5 h-5.5 rounded-full flex items-center justify-center font-editorial italic font-bold text-meta',
          isActive ? 'bg-olive text-paper' : 'bg-paper-deep text-ink-60',
        ].join(' ')}
        style={{ width: 22, height: 22 }}
      >
        {index}
      </span>
      <div className="min-w-0">
        <div
          className={`text-meta truncate ${isActive ? 'text-olive font-bold' : 'text-ink font-medium'}`}
        >
          {title}
        </div>
        <div className={`tg-eyebrow ${pill.textClass} mt-0.5`}>{pill.label}</div>
      </div>
    </button>
  );
}
