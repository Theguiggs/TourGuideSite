import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';
import type { Metadata } from 'next';
import type { Tour } from '@/types/tour';
import { localizeTour } from '@/lib/catalogue/localized-tour';
import { seoAlternates } from '@/lib/seo/urls';
import { tourSeoLocales, type SeoTour } from '@/lib/seo/availability';

/**
 * Métadonnées d'une fiche visite, à parité dans les six langues.
 *
 * Les variantes annoncées viennent du contrat d'indexation (`tourSeoLocales`),
 * pas de la liste des langues d'interface : une visite vendue en français et en
 * anglais n'annonce plus quatre traductions qui n'existent pas.
 */
export function tourMetadata(
  tour: Pick<Tour, 'title' | 'city' | 'shortDescription' | 'description'> & SeoTour,
  citySlug: string,
  tourSlug: string,
  locale: InterfaceLocale,
): Metadata {
  const published = tourSeoLocales(tour);
  tour = localizeTour(tour, locale);
  const fallback = translate(locale, 'Une visite à découvrir.', 'An immersive audio walking tour.');
  const description =
    tour.shortDescription || (tour.description ? tour.description.slice(0, 160) : fallback);
  const { alternates, robots } = seoAlternates({ sourcePath: `/catalogue/${citySlug}/${tourSlug}`, locale, published });
  const ogAlt =
    translate(locale, `${tour.title} — visite audio à ${tour.city}`, `${tour.title} — audio tour in ${tour.city}`);
  const images = [{ url: `/og/tour/${citySlug}/${tourSlug}?locale=${locale}`, width: 1200, height: 630, alt: ogAlt }];

  return {
    title: tour.title,
    description,
    alternates,
    ...(robots ? { robots } : {}),
    openGraph: {
      title: `${tour.title} | Murmure`,
      description,
      type: 'article',
      siteName: 'Murmure',
      url: alternates.canonical as string,
      locale: LOCALE_FORMATS[locale].replace('-', '_'),
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tour.title} | Murmure`,
      description,
      images,
    },
  };
}
