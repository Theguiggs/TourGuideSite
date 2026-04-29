'use client';

// --- Types ---

export type SceneLanguageStatus = 'ok' | 'text_only' | 'stale' | 'processing' | 'pending' | 'failed';

export interface LanguageStatusBadgeProps {
  status: SceneLanguageStatus;
  className?: string;
}

// --- Config ---

const STATUS_CONFIG: Record<SceneLanguageStatus, {
  bg: string;
  text: string;
  dot: string;
  label: string;
  animate: boolean;
}> = {
  ok: {
    bg: 'bg-olive-soft',
    text: 'text-success',
    dot: 'bg-success',
    label: 'Pret',
    animate: false,
  },
  text_only: {
    bg: 'bg-grenadine-soft',
    text: 'text-grenadine',
    dot: 'bg-grenadine',
    label: 'Texte OK — audio manquant',
    animate: false,
  },
  stale: {
    bg: 'bg-ocre-soft',
    text: 'text-ocre',
    dot: 'bg-ocre',
    label: 'Modifie',
    animate: false,
  },
  processing: {
    bg: 'bg-mer-soft',
    text: 'text-mer',
    dot: 'bg-mer',
    label: 'En cours',
    animate: true,
  },
  pending: {
    bg: 'bg-paper-soft',
    text: 'text-ink-80',
    dot: 'bg-ink-40',
    label: 'En attente',
    animate: false,
  },
  failed: {
    bg: 'bg-grenadine-soft',
    text: 'text-danger',
    dot: 'bg-danger',
    label: 'Echoue',
    animate: false,
  },
};

// --- Component ---

export function LanguageStatusBadge({ status, className }: LanguageStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      data-testid={`language-status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text} ${className ?? ''}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${config.dot} ${config.animate ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
