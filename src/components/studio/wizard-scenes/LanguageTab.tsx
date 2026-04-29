'use client';

interface LanguageTabProps {
  /** ISO code 2 letters (FR, EN, …). Used for display + testid. */
  code: string;
  label: string;
  /** Completion counter, e.g. "6/6" or "3/6". */
  counter?: string;
  isActive: boolean;
  onClick?: () => void;
}

/**
 * <LanguageTab> — tab langue avec compteur de completion.
 * Underline grenadine sur l'actif (cohérent avec WizardShell tabs).
 * Port de docs/design/ds/wizard-4-scenes.jsx:46-61.
 */
export function LanguageTab({
  code,
  label,
  counter,
  isActive,
  onClick,
}: LanguageTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`language-tab-${code.toLowerCase()}`}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'px-3.5 py-2 text-caption transition flex items-center gap-1.5 border-b-2 cursor-pointer no-underline whitespace-nowrap -mb-px',
        isActive
          ? 'border-grenadine text-grenadine font-bold'
          : 'border-transparent text-ink-60 hover:text-ink-80 hover:border-line font-medium',
      ].join(' ')}
    >
      <span className="tg-eyebrow">{code.toUpperCase()}</span>
      <span>{label}</span>
      {counter && (
        <span
          className={`text-meta font-mono ${isActive ? 'text-grenadine' : 'text-ink-40'}`}
        >
          {counter}
        </span>
      )}
    </button>
  );
}
