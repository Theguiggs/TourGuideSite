import type { Metadata } from 'next';
import type { Tour } from '@/types/tour';

/**
 * Métadonnées d'une fiche visite, FR et EN à parité.
 *
 * La fiche EN ne portait que `openGraph.locale` : elle héritait de l'image OG
 * générique et de la description française de la marque, sans bloc Twitter.
 */
export function tourMetadata(
  tour: Pick<Tour, 'title' | 'city' | 'shortDescription' | 'description'>,
  citySlug: string,
  tourSlug: string,
  locale: 'fr' | 'en',
): Metadata {
  const fallback = locale === 'en' ? 'An immersive audio walking tour.' : 'Une visite à découvrir.';
  const description =
    tour.shortDescription || (tour.description ? tour.description.slice(0, 160) : fallback);
  const frPath = `/catalogue/${citySlug}/${tourSlug}`;
  const enPath = `/en${frPath}`;
  const ogAlt =
    locale === 'en' ? `${tour.title} — audio tour in ${tour.city}` : `${tour.title} — visite audio à ${tour.city}`;

  return {
    title: tour.title,
    description,
    alternates: {
      canonical: locale === 'en' ? enPath : frPath,
      languages: { fr: frPath, en: enPath },
    },
    openGraph: {
      title: `${tour.title} | Murmure`,
      description,
      type: 'article',
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
      images: [{ url: `/og/tour/${citySlug}/${tourSlug}`, width: 1200, height: 630, alt: ogAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tour.title} | Murmure`,
      description,
    },
  };
}
