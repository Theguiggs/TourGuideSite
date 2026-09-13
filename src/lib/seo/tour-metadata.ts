import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate, extendCopy } from '@/lib/i18n/translate';
import type { Metadata } from 'next';
import type { Tour } from '@/types/tour';
import { localizeTour } from '@/lib/catalogue/localized-tour';

/**
 * Métadonnées d'une fiche visite, FR et EN à parité.
 *
 * La fiche EN ne portait que `openGraph.locale` : elle héritait de l'image OG
 * générique et de la description française de la marque, sans bloc Twitter.
 */
export function tourMetadata(
  tour: Pick<Tour, 'title' | 'city' | 'shortDescription' | 'description' | 'translatedTitles' | 'translatedDescriptions' | 'sourceLanguage'>,
  citySlug: string,
  tourSlug: string,
  locale: InterfaceLocale,
): Metadata {
  tour = localizeTour(tour, locale);
  const fallback = translate(locale, 'Une visite à découvrir.', 'An immersive audio walking tour.');
  const description =
    tour.shortDescription || (tour.description ? tour.description.slice(0, 160) : fallback);
  const frPath = `/catalogue/${citySlug}/${tourSlug}`;
  const enPath = `/en${frPath}`;
  const ogAlt =
    translate(locale, `${tour.title} — visite audio à ${tour.city}`, `${tour.title} — audio tour in ${tour.city}`);

  return {
    title: tour.title,
    description,
    alternates: {
      canonical: extendCopy({ fr: frPath, en: enPath })[locale],
      languages: extendCopy({ fr: frPath, en: enPath }),
    },
    openGraph: {
      title: `${tour.title} | Murmure`,
      description,
      type: 'article',
      locale: translate(locale, 'fr_FR', 'en_US'),
      images: [{ url: `/og/tour/${citySlug}/${tourSlug}?locale=${locale}`, width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tour.title} | Murmure`,
      description,
    },
  };
}
