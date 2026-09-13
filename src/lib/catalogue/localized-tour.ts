import type { Tour } from '@/types/tour';
import { parseTranslatedMetadata } from '@/lib/api/translated-metadata';
import { normalizeLanguageTag } from '@/lib/api/audio-source-policy';
import type { InterfaceLocale } from '@/lib/i18n/locales';

/** Never mutate cached catalogue records or infer an audio entitlement. */
export function localizeTour<T extends Pick<Tour, 'title' | 'description' | 'shortDescription' | 'sourceLanguage' | 'translatedTitles' | 'translatedDescriptions'>>(tour: T, locale: InterfaceLocale): T & { metadataFallback: boolean } {
  const source = normalizeLanguageTag(tour.sourceLanguage) || 'fr';
  if (locale === source) return { ...tour, metadataFallback: false };
  const title = parseTranslatedMetadata(tour.translatedTitles)[locale];
  const description = parseTranslatedMetadata(tour.translatedDescriptions)[locale];
  return {
    ...tour,
    title: title || tour.title,
    description: description || tour.description,
    shortDescription: description ? description.slice(0, 100) : tour.shortDescription,
    metadataFallback: !title || !description,
  };
}

export const METADATA_FALLBACK_COPY: Record<InterfaceLocale, string> = {
  fr: 'Certains textes de cette visite sont affichés dans leur langue d’origine, car leur traduction n’est pas disponible.',
  en: 'Some tour text is shown in its original language because a translation is not available.',
  es: 'Algunos textos de esta visita se muestran en su idioma original porque no hay traducción disponible.',
  de: 'Einige Texte dieser Tour werden in der Originalsprache angezeigt, da keine Übersetzung verfügbar ist.',
  it: 'Alcuni testi di questa visita sono mostrati nella lingua originale perché la traduzione non è disponibile.',
  nl: 'Sommige teksten van deze tour worden in de oorspronkelijke taal getoond omdat er geen vertaling beschikbaar is.',
};
