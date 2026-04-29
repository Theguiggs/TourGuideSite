'use client';

interface PlayAllButtonProps {
  isPlaying: boolean;
  onClick: () => void;
  /** Total duration label, e.g. "12 min". */
  duration?: string;
  disabled?: boolean;
}

/**
 * <PlayAllButton> — gros bouton grenadine "Écouter tout" pleine largeur.
 * Port de docs/design/ds/wizard-5-preview.jsx:61-67.
 */
export function PlayAllButton({
  isPlaying,
  onClick,
  duration,
  disabled = false,
}: PlayAllButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid="play-all-btn"
      aria-pressed={isPlaying}
      className="w-full py-4 px-6 rounded-pill bg-grenadine text-paper border-none text-caption font-bold cursor-pointer hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2.5"
    >
      <span aria-hidden="true">{isPlaying ? '❚❚' : '▶'}</span>
      {isPlaying ? 'Pause' : 'Écouter tout'}
      {duration && (
        <span className="text-meta opacity-80 ml-1">· {duration}</span>
      )}
    </button>
  );
}
