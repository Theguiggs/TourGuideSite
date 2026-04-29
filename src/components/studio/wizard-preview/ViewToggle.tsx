'use client';

export type PreviewViewMode = 'studio' | 'catalogue';

interface ViewToggleProps {
  value: PreviewViewMode;
  onChange: (mode: PreviewViewMode) => void;
}

/**
 * <ViewToggle> — toggle pill segmented Vue Studio / Vue Catalogue (touriste).
 * Port de docs/design/ds/wizard-5-preview.jsx:22-33.
 */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Choisir la vue"
      className="inline-flex gap-1 p-1 bg-paper-deep rounded-pill"
      data-testid="view-toggle"
    >
      {(
        [
          { mode: 'studio', label: 'Vue Studio' },
          { mode: 'catalogue', label: 'Vue Catalogue (touriste)' },
        ] as const
      ).map((opt) => {
        const isOn = value === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => onChange(opt.mode)}
            data-testid={`view-toggle-${opt.mode}`}
            aria-pressed={isOn}
            className={[
              'px-4 py-2 text-meta font-bold rounded-pill cursor-pointer transition border-none',
              isOn ? 'bg-ink text-paper' : 'bg-transparent text-ink-60 hover:text-ink',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
