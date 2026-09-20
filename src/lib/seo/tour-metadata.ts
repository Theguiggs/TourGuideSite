import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import type { Metadata } from 'next';
import type { Tour } from '@/types/tour';
import { localizeTour } from '@/lib/catalogue/localized-tour';
import { seoAlternates } from '@/lib/seo/urls';
import { tourSeoLocales, type SeoTour } from '@/lib/seo/availability';
import { activeFreeAccessCopy, freeAccessCopy } from '@/lib/seo/free-access-copy';

/**
 * Métadonnées d'une fiche visite, à parité dans les six langues.
 *
 * Les variantes annoncées viennent du contrat d'indexation (`tourSeoLocales`),
 * pas de la liste des langues d'interface : une visite vendue en français et en
 * anglais n'annonce plus quatre traductions qui n'existent pas.
 *
 * Lot SEO-4 — titre et description répondent à l'intention de recherche :
 *
 * - le titre nomme la visite ET sa ville (« Vieux Nice — visite audio à Nice ») :
 *   `title` seul ne contenait pas toujours la ville, et c'est elle qu'on cherche ;
 * - la description vise 120 à 160 caractères. Elle partait de
 *   `shortDescription`, coupée à 100 caractères par le mappeur serveur : toutes
 *   les fiches du catalogue rendaient donc une description trop courte, tronquée
 *   au milieu d'un mot. Elle part maintenant du texte complet, coupée sur une
 *   frontière de mot, et se complète d'une phrase factuelle si elle reste courte.
 */

type Copy = {
  /** « visite audio à Nice » — le type de visite et la ville. */
  audioTourIn: (city: string) => string;
  /** Complément factuel quand la description propre à la visite est trop courte. */
  complement: (city: string, minutes: number) => string;
  fallback: string;
};

const COPY: Record<InterfaceLocale, Copy> = {
  fr: {
    audioTourIn: (city) => `visite audio à ${city}`,
    complement: (city, minutes) =>
      `Visite audio guidée à ${city}${minutes > 0 ? `, ${minutes} minutes` : ''}, à écouter à votre rythme.`,
    fallback: 'Une visite à découvrir.',
  },
  en: {
    audioTourIn: (city) => `audio tour in ${city}`,
    complement: (city, minutes) =>
      `Guided audio tour in ${city}${minutes > 0 ? `, ${minutes} minutes` : ''}, listen at your own pace.`,
    fallback: 'An immersive audio walking tour.',
  },
  es: {
    audioTourIn: (city) => `visita audio en ${city}`,
    complement: (city, minutes) =>
      `Visita audio guiada en ${city}${minutes > 0 ? `, ${minutes} minutos` : ''}, escucha a tu ritmo.`,
    fallback: 'Una visita audio para descubrir.',
  },
  de: {
    audioTourIn: (city) => `Audiotour in ${city}`,
    complement: (city, minutes) =>
      `Geführte Audiotour in ${city}${minutes > 0 ? `, ${minutes} Minuten` : ''}, in deinem Tempo hören.`,
    fallback: 'Eine Audiotour zum Entdecken.',
  },
  it: {
    audioTourIn: (city) => `visita audio a ${city}`,
    complement: (city, minutes) =>
      `Visita audio guidata a ${city}${minutes > 0 ? `, ${minutes} minuti` : ''}, ascolta al tuo ritmo.`,
    fallback: 'Una visita audio da scoprire.',
  },
  nl: {
    audioTourIn: (city) => `audiotour in ${city}`,
    complement: (city, minutes) =>
      `Begeleide audiotour in ${city}${minutes > 0 ? `, ${minutes} minuten` : ''}, luister op je eigen tempo.`,
    fallback: 'Een audiotour om te ontdekken.',
  },
};

const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 160;

/** Coupe sur une frontière de mot, jamais au milieu — et le dit par une ellipse. */
function trimToLength(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, '')}…`;
}

/** Le titre de recherche : la visite, puis sa ville. */
export function tourSeoTitle(title: string, city: string, locale: InterfaceLocale, free = false): string {
  return `${title} — ${free ? freeAccessCopy(locale).tourLabel(city) : COPY[locale].audioTourIn(city)}`;
}

/**
 * Description de 120 à 160 caractères quand le contenu le permet, dans la
 * langue de la page, tirée du texte que la fiche affiche réellement.
 */
export function tourSeoDescription(
  tour: Pick<Tour, 'description' | 'shortDescription' | 'city' | 'duration'>,
  locale: InterfaceLocale,
  free?: { endDate?: string },
): string {
  const copy = COPY[locale];
  const own = (tour.description || tour.shortDescription || '').trim();
  const lead = free ? freeAccessCopy(locale).tourLead(tour.city, free.endDate) : '';
  const base = own ? trimToLength(`${lead} ${own}`.trim(), DESCRIPTION_MAX) : `${lead} ${copy.fallback}`.trim();
  if (base.length >= DESCRIPTION_MIN) return base;
  const complement = copy.complement(tour.city, Math.round(tour.duration ?? 0));
  return trimToLength(`${base} ${complement}`, DESCRIPTION_MAX);
}

export function tourMetadata(
  tour: Pick<Tour, 'title' | 'city' | 'shortDescription' | 'description'> & Partial<Pick<Tour, 'duration' | 'purchaseType'>> & SeoTour,
  citySlug: string,
  tourSlug: string,
  locale: InterfaceLocale,
  now = Date.now(),
): Metadata {
  const published = tourSeoLocales(tour);
  tour = localizeTour(tour, locale);
  const launchOffer = activeFreeAccessCopy(locale, now);
  const isFree = launchOffer !== null || tour.purchaseType === undefined || tour.purchaseType === 'free';
  const description = tourSeoDescription(
    { ...tour, duration: tour.duration ?? 0 },
    locale,
    isFree ? { endDate: launchOffer?.endDate } : undefined,
  );
  const title = tourSeoTitle(tour.title, tour.city, locale, isFree);
  const { alternates, robots } = seoAlternates({ sourcePath: `/catalogue/${citySlug}/${tourSlug}`, locale, published });
  const images = [{ url: `/og/tour/${citySlug}/${tourSlug}?locale=${locale}`, width: 1200, height: 630, alt: title }];

  return {
    title,
    description,
    alternates,
    ...(robots ? { robots } : {}),
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: 'Murmure',
      url: alternates.canonical as string,
      locale: LOCALE_FORMATS[locale].replace('-', '_'),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
  };
}
