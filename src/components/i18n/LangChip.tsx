import { languageName, languageLabel } from '@/lib/i18n/languages';
import type { InterfaceLocale } from '@/lib/i18n/locales';

/**
 * Puce de langue en TEXTE : « FR », nommée « Français » pour les lecteurs
 * d'écran. Remplace les drapeaux nus : un drapeau n'est pas une langue
 * (l'anglais n'est pas britannique), et un emoji est lu « drapeau de… ».
 */
export function LangChip({ code, className = '', locale }: { code: string; className?: string; locale?: InterfaceLocale }) {
  const name = locale ? languageLabel(code, locale) : languageName(code);
  return (
    <span
      className={`inline-flex items-center rounded-pill bg-paper-deep px-2 py-0.5 text-eyebrow font-bold uppercase tracking-wide text-ink-80 ${className}`}
      title={name}
      aria-label={name}
      data-testid={`lang-chip-${code.toLowerCase()}`}
    >
      {code.toUpperCase()}
    </span>
  );
}
