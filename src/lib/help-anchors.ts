/**
 * Ancres de la page d'aide visées depuis les pages d'accueil.
 *
 * Les identifiants vivent dans `aide/_content.ts` et `en/help/_content.ts` ;
 * les accueils les recopiaient en dur. Cette table est la jointure, et un
 * test la confronte aux étapes réelles.
 */

export type HelpStep = 'creer' | 'tracer' | 'raconter' | 'publier';

export const HELP_ANCHORS: Record<'fr' | 'en', Record<HelpStep, string>> = {
  fr: { creer: 'creer', tracer: 'tracer', raconter: 'raconter', publier: 'publier' },
  en: { creer: 'create', tracer: 'map', raconter: 'tell', publier: 'publish' },
};

export function helpAnchorHref(locale: 'fr' | 'en', step: HelpStep): string {
  return `${locale === 'en' ? '/en/help' : '/aide'}#${HELP_ANCHORS[locale][step]}`;
}
