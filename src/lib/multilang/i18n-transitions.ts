/**
 * ML-6.2: Templates i18n transitions POI
 *
 * Localized transition messages between POIs for multilingual preview playback.
 * Supports 5 EU languages + extensible.
 */

// --- Types ---

export type SupportedTransitionLang = 'fr' | 'en' | 'es' | 'de' | 'it';

interface TransitionTemplates {
  headTowards: string;
}

// --- Templates ---

const TRANSITION_TEMPLATES: Record<SupportedTransitionLang, TransitionTemplates> = {
  fr: { headTowards: 'Dirigez-vous vers {poi}' },
  en: { headTowards: 'Head towards {poi}' },
  es: { headTowards: 'Diríjase hacia {poi}' },
  de: { headTowards: 'Gehen Sie Richtung {poi}' },
  it: { headTowards: 'Dirigetevi verso {poi}' },
};

const SUPPORTED_LANGS = new Set<string>(Object.keys(TRANSITION_TEMPLATES));

// --- Public API ---

/**
 * Returns a localized transition message for navigating to a POI.
 * Falls back to English if the language is not supported.
 */
export function getTransitionMessage(targetLang: string, poiName: string): string {
  const lang = SUPPORTED_LANGS.has(targetLang)
    ? (targetLang as SupportedTransitionLang)
    : 'en';

  const template = TRANSITION_TEMPLATES[lang];
  return template.headTowards.replace('{poi}', poiName);
}

/**
 * Returns true if the language has transition templates.
 */
export function isTransitionLangSupported(lang: string): boolean {
  return SUPPORTED_LANGS.has(lang);
}

/**
 * Returns the list of supported transition languages.
 */
export function getSupportedTransitionLangs(): SupportedTransitionLang[] {
  return Object.keys(TRANSITION_TEMPLATES) as SupportedTransitionLang[];
}
