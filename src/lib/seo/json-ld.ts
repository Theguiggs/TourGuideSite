/**
 * Données structurées (Schema.org) des pages publiques.
 *
 * Avant : `TouristAttraction` sans `url`, sans prix, `addressCountry: 'FR'`
 * en dur, URL relatives dans les offres et le fil d'Ariane (Schema.org exige
 * des URI absolues ; `metadataBase` ne s'applique pas au JSON-LD).
 */

import type { PublicGuideProfile } from '@/lib/api/guides-public';
import type { Tour, TourDetail } from '@/types/tour';
import { cityCountry } from '@/lib/cities/city-country';
import { absoluteUrl, SITE_URL } from '@/lib/site';

const ORGANIZATION = { '@type': 'Organization', name: 'Murmure', url: SITE_URL } as const;

export function tourJsonLd(
  tour: Pick<
    TourDetail,
    | 'title'
    | 'shortDescription'
    | 'description'
    | 'city'
    | 'citySlug'
    | 'slug'
    | 'duration'
    | 'priceCents'
    | 'purchaseType'
    | 'availableLanguages'
    | 'averageRating'
    | 'reviewCount'
    | 'imageUrl'
  >,
  locale: 'fr' | 'en',
): Record<string, unknown> {
  const path = `${locale === 'en' ? '/en' : ''}/catalogue/${tour.citySlug}/${tour.slug}`;
  const url = absoluteUrl(path);
  const isFree = tour.purchaseType === undefined || tour.purchaseType === 'free';
  const price = isFree ? 0 : (tour.priceCents ?? 0) / 100;

  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    '@id': url,
    url,
    name: tour.title,
    description: tour.shortDescription || tour.description || undefined,
    inLanguage: tour.availableLanguages?.length ? tour.availableLanguages : undefined,
    image: tour.imageUrl && /^https?:\/\//.test(tour.imageUrl) ? tour.imageUrl : undefined,
    provider: ORGANIZATION,
    touristType: locale === 'en' ? 'Self-guided audio walking tour' : 'Visite audio autoguidée à pied',
    ...(tour.duration > 0 ? { estimatedDuration: `PT${Math.round(tour.duration)}M` } : {}),
    itinerary: {
      '@type': 'Place',
      name: tour.city,
      address: { '@type': 'PostalAddress', addressLocality: tour.city, addressCountry: cityCountry(tour.citySlug) },
    },
    offers:
      tour.purchaseType === 'subscription_only'
        ? undefined
        : {
            '@type': 'Offer',
            url,
            price: price.toFixed(2),
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
          },
    aggregateRating:
      tour.reviewCount > 0
        ? { '@type': 'AggregateRating', ratingValue: tour.averageRating, reviewCount: tour.reviewCount }
        : undefined,
  };
}

export function guideJsonLd(
  guide: Pick<PublicGuideProfile, 'displayName' | 'bio' | 'photoUrl' | 'city' | 'specialties' | 'languages' | 'slug'>,
  tours: ReadonlyArray<Pick<Tour, 'title' | 'shortDescription' | 'citySlug' | 'slug'>>,
): Record<string, unknown> {
  const citySlug = tours[0]?.citySlug ?? '';
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': absoluteUrl(`/guides/${guide.slug}`),
    url: absoluteUrl(`/guides/${guide.slug}`),
    name: guide.displayName,
    jobTitle: 'Guide touristique',
    description: guide.bio,
    ...(guide.photoUrl ? { image: absoluteUrl(guide.photoUrl) } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: guide.city,
      addressCountry: citySlug ? cityCountry(citySlug) : 'FR',
    },
    knows: guide.specialties,
    knowsLanguage: guide.languages,
    makesOffer: tours.map((t) => ({
      '@type': 'Offer',
      name: t.title,
      description: t.shortDescription,
      url: absoluteUrl(`/catalogue/${t.citySlug}/${t.slug}`),
    })),
  };
}

export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path?: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}
