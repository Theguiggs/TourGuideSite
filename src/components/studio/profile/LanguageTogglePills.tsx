'use client';

export interface LanguageOption {
  /** ISO 639-1 code (lowercase). */
  code: string;
  /** Human label (FR). */
  label: string;
}

export const DEFAULT_LANGUAGES: ReadonlyArray<LanguageOption> = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'Anglais' },
  { code: 'it', label: 'Italien' },
  { code: 'es', label: 'Espagnol' },
  { code: 'de', label: 'Allemand' },
  { code: 'pt', label: 'Portugais' },
];

interface LanguageTogglePillsProps {
  /** Selected language codes (ISO). */
  value: string[];
  onChange: (codes: string[]) => void;
  /** ISO code marked as "natif" (badge NATIF). */
  nativeCode?: string;
  options?: ReadonlyArray<LanguageOption>;
}

/**
 * <LanguageTogglePills> — toggles langues du profil guide.
 * Sélectionnée = bg-ink/text-paper, non = bg-paper/text-ink.
 * Affiche un badge NATIF sur la langue désignée.
 */
export function LanguageTogglePills({
  value,
  onChange,
  nativeCode,
  options = DEFAULT_LANGUAGES,
}: LanguageTogglePillsProps) {
  const set = new Set(value);

  const toggle = (code: string) => {
    if (set.has(code)) {
      onChange(value.filter((v) => v !== code));
    } else {
      onChange([...value, code]);
    }
  };

  return (
    <div
      className="flex gap-2 flex-wrap"
      data-testid="language-toggle-pills"
      role="group"
      aria-label="Langues parlées"
    >
      {options.map((opt) => {
        const isOn = set.has(opt.code);
        const isNative = nativeCode === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => toggle(opt.code)}
            data-testid={`language-pill-${opt.code}`}
            aria-pressed={isOn}
            className={[
              'px-3.5 py-2 rounded-pill text-meta font-semibold transition border',
              isOn
                ? 'bg-ink text-paper border-ink'
                : 'bg-paper text-ink-60 border-line hover:bg-paper-soft',
            ].join(' ')}
          >
            {opt.label}
            {isOn && isNative && (
              <span className="text-[9px] ml-1 opacity-70 tracking-wider font-bold">NATIF</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
