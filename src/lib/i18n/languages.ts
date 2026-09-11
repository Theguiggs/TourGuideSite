/**
 * Table UNIQUE des langues affichées (lot 5).
 *
 * Huit tables `LANG_FLAGS`/`LANG_NAMES`/`LANG_LABELS` vivaient dans huit
 * fichiers, avec des couvertures différentes (5 à 9 langues), une table
 * dont les « drapeaux » étaient des codes, une autre en séquences d'échappement.
 * Un tour coréen ou arabe n'avait de drapeau nulle part.
 *
 * Endonyme (« Deutsch ») pour ce qui s'adresse au visiteur, nom français ou
 * anglais pour le Studio et l'admin. Les drapeaux restent disponibles mais
 * sont décoratifs : un drapeau n'est pas une langue (voir `LangChip`).
 */

export interface LanguageInfo {
  code: string;
  /** Nom dans la langue elle-même. */
  name: string;
  nameFr: string;
  nameEn: string;
  flag: string;
}

export const LANGUAGES: Record<string, LanguageInfo> = {
  fr: { code: 'fr', name: 'Français', nameFr: 'Français', nameEn: 'French', flag: '🇫🇷' },
  en: { code: 'en', name: 'English', nameFr: 'Anglais', nameEn: 'English', flag: '🇬🇧' },
  es: { code: 'es', name: 'Español', nameFr: 'Espagnol', nameEn: 'Spanish', flag: '🇪🇸' },
  it: { code: 'it', name: 'Italiano', nameFr: 'Italien', nameEn: 'Italian', flag: '🇮🇹' },
  de: { code: 'de', name: 'Deutsch', nameFr: 'Allemand', nameEn: 'German', flag: '🇩🇪' },
  nl: { code: 'nl', name: 'Nederlands', nameFr: 'Néerlandais', nameEn: 'Dutch', flag: '🇳🇱' },
  pt: { code: 'pt', name: 'Português', nameFr: 'Portugais', nameEn: 'Portuguese', flag: '🇵🇹' },
  ja: { code: 'ja', name: '日本語', nameFr: 'Japonais', nameEn: 'Japanese', flag: '🇯🇵' },
  zh: { code: 'zh', name: '中文', nameFr: 'Chinois', nameEn: 'Chinese', flag: '🇨🇳' },
  ko: { code: 'ko', name: '한국어', nameFr: 'Coréen', nameEn: 'Korean', flag: '🇰🇷' },
  ar: { code: 'ar', name: 'العربية', nameFr: 'Arabe', nameEn: 'Arabic', flag: '🇸🇦' },
};

const norm = (code: string) => code.trim().toLowerCase();

/** Endonymes (visiteur). Une langue inconnue est rendue par son code. */
export function languageName(code: string): string {
  return LANGUAGES[norm(code)]?.name ?? code.toUpperCase();
}

/** Nom dans la langue de l'interface (Studio, admin). */
export function languageLabel(code: string, locale: 'fr' | 'en' = 'fr'): string {
  const info = LANGUAGES[norm(code)];
  if (!info) return code.toUpperCase();
  return locale === 'en' ? info.nameEn : info.nameFr;
}

/** Drapeau décoratif, ou null : ne jamais l'afficher seul comme information. */
export function languageFlag(code: string): string | null {
  return LANGUAGES[norm(code)]?.flag ?? null;
}

/** Compatibilité avec les anciennes tables : mêmes noms, une seule source. */
export const LANG_FLAGS: Record<string, string> = Object.fromEntries(
  Object.values(LANGUAGES).map((l) => [l.code, l.flag]),
);
export const LANG_NAMES: Record<string, string> = Object.fromEntries(
  Object.values(LANGUAGES).map((l) => [l.code, l.name]),
);
export const LANG_CODES: Record<string, string> = Object.fromEntries(
  Object.values(LANGUAGES).map((l) => [l.code, l.code.toUpperCase()]),
);
