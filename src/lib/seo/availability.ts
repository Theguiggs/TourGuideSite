/**
 * Contrat d'indexation — quelles variantes linguistiques existent vraiment.
 *
 * Le site annonçait six variantes de chaque page, sans jamais vérifier qu'elles
 * portent un contenu. Une visite vendue en français et en anglais apparaissait
 * en néerlandais dans le sitemap et dans les hreflang : Google recevait six
 * pages presque identiques, dont quatre en français sous une étiquette
 * néerlandaise. C'est exactement ce que la documentation « versions localisées »
 * demande d'éviter.
 *
 * Une VISITE est indexable dans une langue quand, cumulativement :
 *
 *   1. elle est publiée ;
 *   2. son titre et sa description existent dans cette langue — soit parce que
 *      c'est la langue source, soit parce qu'une traduction validée est
 *      persistée (`translatedTitles` ET `translatedDescriptions`) ;
 *   3. la narration est vendue dans cette langue (`availableLanguages`, la
 *      liste que l'approbation de langue persiste sur la Visite) ;
 *   4. elle ne repose donc sur aucun repli signalé par `metadataFallback`.
 *
 * La langue source est toujours retenue : son texte EST l'original et sa
 * narration existe par construction. Une visite publiée a donc toujours au
 * moins une variante indexable — jamais de page orpheline.
 *
 * Une VILLE est indexable dans une langue quand au moins une de ses visites
 * l'est dans cette langue. Une ville sans visite publiée n'est indexable nulle
 * part. (Le lot SEO-3 ajoute la présence d'une introduction localisée.)
 *
 * Un GUIDE suit la même règle que sa ville : les langues de ses visites.
 *
 * Ce module ne lit que des champs déjà chargés pour l'affichage : il ne déclenche
 * aucune requête et peut donc servir le sitemap entier sans le ralentir.
 */

import { SITE_LOCALES, isInterfaceLocale, type InterfaceLocale } from '@/lib/i18n/locales';
import { normalizeLanguageTag } from '@/lib/api/audio-source-policy';
import { parseTranslatedMetadata } from '@/lib/api/translated-metadata';
import type { Tour } from '@/types/tour';

/**
 * Le strict nécessaire au contrat : toute projection de `Tour` convient.
 * `status` reste facultatif — les projections publiques ne contiennent que du
 * publié et ne le portent pas toujours.
 */
export type SeoTour = Partial<Pick<Tour, 'status'>> &
  Pick<Tour, 'sourceLanguage' | 'translatedTitles' | 'translatedDescriptions' | 'availableLanguages'>;

/** Langue source d'une visite, ramenée à une langue d'interface. */
export function tourSourceLocale(tour: Pick<SeoTour, 'sourceLanguage'>): InterfaceLocale {
  const normalized = normalizeLanguageTag(tour.sourceLanguage);
  return normalized && isInterfaceLocale(normalized) ? normalized : 'fr';
}

function normalizedSet(values: readonly string[] | undefined): Set<string> {
  const out = new Set<string>();
  for (const value of values ?? []) {
    const normalized = normalizeLanguageTag(value);
    if (normalized) out.add(normalized);
  }
  return out;
}

/**
 * Les langues dans lesquelles la visite est indexable, dans l'ordre de
 * `SITE_LOCALES`. Vide si la visite n'est pas publiée.
 */
export function tourSeoLocales(tour: SeoTour): InterfaceLocale[] {
  // `status` absent = projection publique, qui ne contient que du publié.
  if (tour.status !== undefined && tour.status !== 'published') return [];

  const source = tourSourceLocale(tour);
  const narrated = normalizedSet(tour.availableLanguages);
  const titles = parseTranslatedMetadata(tour.translatedTitles);
  const descriptions = parseTranslatedMetadata(tour.translatedDescriptions);

  return SITE_LOCALES.filter((locale) => {
    if (locale === source) return true;
    if (!narrated.has(locale)) return false;
    return Boolean(titles[locale]) && Boolean(descriptions[locale]);
  });
}

export function isTourIndexable(tour: SeoTour, locale: InterfaceLocale): boolean {
  return tourSeoLocales(tour).includes(locale);
}

/** Union des langues indexables d'un ensemble de visites. */
export function unionSeoLocales(tours: readonly SeoTour[]): InterfaceLocale[] {
  const union = new Set<InterfaceLocale>();
  for (const tour of tours) for (const locale of tourSeoLocales(tour)) union.add(locale);
  return SITE_LOCALES.filter((locale) => union.has(locale));
}

/**
 * Langues indexables d'une page ville : celles d'au moins une visite de la
 * ville. Une ville sans visite indexable ne l'est dans aucune langue.
 */
export function citySeoLocales(tours: readonly SeoTour[]): InterfaceLocale[] {
  return unionSeoLocales(tours);
}

/** Langues indexables d'une page guide : celles d'au moins une de ses visites. */
export function guideSeoLocales(tours: readonly SeoTour[]): InterfaceLocale[] {
  return unionSeoLocales(tours);
}

/**
 * Pages éditoriales du site (accueil, catalogue, aide, légal…) : traduites et
 * relues dans les six langues, elles sont indexables partout.
 */
export const EVERGREEN_LOCALES: readonly InterfaceLocale[] = SITE_LOCALES;
