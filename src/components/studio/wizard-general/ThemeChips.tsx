'use client';

interface ThemeChipsProps {
  /** Available themes (FR labels — values matched 1:1 with backend enum). */
  options: ReadonlyArray<{ value: string; label: string }>;
  /** Currently selected values. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Hard limit on selections (default 3). */
  max?: number;
  /** Called with a friendly message when the limit is reached. */
  onMaxReached?: (message: string) => void;
}

/**
 * <ThemeChips> — toggle pills grenadine pour la sélection des thèmes du tour.
 * Max N sélectionnés (défaut 3). Une chip non sélectionnable au-delà du max
 * est désactivée plutôt que masquée.
 */
export function ThemeChips({
  options,
  value,
  onChange,
  max = 3,
  onMaxReached,
}: ThemeChipsProps) {
  const set = new Set(value);
  const isFull = value.length >= max;

  const toggle = (v: string) => {
    if (set.has(v)) {
      onChange(value.filter((item) => item !== v));
      return;
    }
    if (isFull) {
      onMaxReached?.(`Maximum ${max} thèmes — désélectionnez-en un d'abord.`);
      return;
    }
    onChange([...value, v]);
  };

  return (
    <div className="flex flex-wrap gap-2" data-testid="theme-chips" role="group">
      {options.map((opt) => {
        const isOn = set.has(opt.value);
        const disabled = !isOn && isFull;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            data-testid={`theme-chip-${opt.value}`}
            aria-pressed={isOn}
            disabled={disabled}
            className={[
              'px-3 py-1.5 rounded-pill text-meta transition border',
              isOn
                ? 'bg-grenadine text-paper border-grenadine font-bold'
                : disabled
                  ? 'bg-paper text-ink-40 border-line cursor-not-allowed'
                  : 'bg-paper text-ink-80 border-line font-medium hover:bg-paper-soft',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
