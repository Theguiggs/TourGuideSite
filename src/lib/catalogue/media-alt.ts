import type { InterfaceLocale } from '@/lib/i18n/locales';

/**
 * Alternatives textuelles des images du catalogue, dans les six langues.
 *
 * Une couverture portait `alt={tour.title}` et une photo d'étape `alt={poi.title}` :
 * le titre répété, jamais une description. Pour un lecteur d'écran comme pour la
 * recherche d'images, « Vieux Nice » ne dit pas ce qu'on voit ; « Vieux Nice —
 * visite audio à Nice » le dit, et « Place Rossetti — étape 3 de la visite
 * audio "Vieux Nice" à Nice » le situe.
 *
 * Une étape verrouillée reste sans alternative : son image est floutée et son
 * titre n'est pas révélé. Une image décorative n'a pas d'alternative — c'est la
 * règle, pas un oubli.
 */

type Copy = {
  cover: (tour: string, city: string) => string;
  step: (step: string, position: number, tour: string, city: string) => string;
};

const COPY: Record<InterfaceLocale, Copy> = {
  fr: {
    cover: (tour, city) => `${tour} — visite audio à ${city}`,
    step: (step, position, tour, city) => `${step} — étape ${position} de la visite audio « ${tour} » à ${city}`,
  },
  en: {
    cover: (tour, city) => `${tour} — audio tour in ${city}`,
    step: (step, position, tour, city) => `${step} — stop ${position} of the audio tour “${tour}” in ${city}`,
  },
  es: {
    cover: (tour, city) => `${tour} — visita audio en ${city}`,
    step: (step, position, tour, city) => `${step} — etapa ${position} de la visita audio «${tour}» en ${city}`,
  },
  de: {
    cover: (tour, city) => `${tour} — Audiotour in ${city}`,
    step: (step, position, tour, city) => `${step} — Station ${position} der Audiotour „${tour}“ in ${city}`,
  },
  it: {
    cover: (tour, city) => `${tour} — visita audio a ${city}`,
    step: (step, position, tour, city) => `${step} — tappa ${position} della visita audio «${tour}» a ${city}`,
  },
  nl: {
    cover: (tour, city) => `${tour} — audiotour in ${city}`,
    step: (step, position, tour, city) => `${step} — halte ${position} van de audiotour ‘${tour}’ in ${city}`,
  },
};

/** Alternative de la couverture d'une visite. */
export function tourCoverAlt(tourTitle: string, city: string, locale: InterfaceLocale): string {
  return COPY[locale].cover(tourTitle, city);
}

/**
 * Alternative de la photo d'une étape. Vide pour une étape verrouillée : rien
 * de son contenu ne doit fuir, ni vers un visiteur ni vers un robot.
 */
export function stepImageAlt(
  { stepTitle, position, tourTitle, city, locked }: {
    stepTitle: string;
    position: number;
    tourTitle?: string;
    city?: string;
    locked?: boolean;
  },
  locale: InterfaceLocale,
): string {
  if (locked) return '';
  if (!tourTitle || !city) return stepTitle;
  return COPY[locale].step(stepTitle, position, tourTitle, city);
}
