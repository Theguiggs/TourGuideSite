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
    bg: 'bg-green-100',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'Pret',
    animate: false,
  },
  text_only: {
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    dot: 'bg-teal-500',
    label: 'Texte OK — audio manquant',
    animate: false,
  },
  stale: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    label: 'Modifie',
    animate: false,
  },
  processing: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: 'En cours',
    animate: true,
  },
  pending: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
    label: 'En attente',
    animate: false,
  },
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
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
