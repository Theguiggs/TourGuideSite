/**
 * Ancres de la page d'aide visées depuis les pages d'accueil.
 *
 * Les identifiants vivent dans `aide/_content.ts` et `en/help/_content.ts` ;
 * les accueils les recopiaient en dur. Cette table est la jointure, et un
 * test la confronte aux étapes réelles.
 */

import type { InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';
export type HelpStep = 'creer' | 'tracer' | 'raconter' | 'publier';

export const HELP_ANCHORS: Record<InterfaceLocale, Record<HelpStep, string>> = {
  fr: { creer: 'creer', tracer: 'tracer', raconter: 'raconter', publier: 'publier' },
  en: { creer: 'create', tracer: 'map', raconter: 'tell', publier: 'publish' },
  es: { creer: 'create', tracer: 'map', raconter: 'tell', publier: 'publish' },
  de: { creer: 'create', tracer: 'map', raconter: 'tell', publier: 'publish' },
  it: { creer: 'create', tracer: 'map', raconter: 'tell', publier: 'publish' },
  nl: { creer: 'create', tracer: 'map', raconter: 'tell', publier: 'publish' },
};

export function helpAnchorHref(locale: InterfaceLocale, step: HelpStep): string {
  return `${localizePublicPath('/aide', locale)}#${HELP_ANCHORS[locale][step]}`;
}
