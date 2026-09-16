import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { translate, extendCopy } from '@/lib/i18n/translate';
/**
 * Données structurées (Schema.org) des pages publiques.
 *
 * Avant : `TouristAttraction` sans `url`, sans prix, `addressCountry: 'FR'`
 * en dur, URL relatives dans les offres et le fil d'Ariane (Schema.org exige
 * des URI absolues ; `metadataBase` ne s'applique pas au JSON-LD).
 *
 * Lot SEO-5 : le schéma doit dire exactement ce que la page montre.
 *
 * - l'offre de lancement gratuite rendait la page « GRATUIT » pendant que
 *   l'Offer annonçait encore 4,99 € — un écart que le Rich Results Test
 *   signale et que Google sanctionne ;
 * - le schéma guide était en français quelle que soit la langue de la page ;
 * - `AggregateRating` était publié dès qu'un avis existait, même sans note
 *   moyenne affichée ;
 * - l'accueil ne se présentait ni comme `Organization` ni comme `WebSite`.
 *
 * Toutes les URL passent par `publicUrl` : le schéma, la canonical, le
 * hreflang et le sitemap parlent de la même page.
 */

import type { PublicGuideProfile } from '@/lib/api/guides-public';
import type { Tour, TourDetail } from '@/types/tour';
import { cityCountry } from '@/lib/cities/city-country';
import { absoluteUrl, SITE_URL } from '@/lib/site';
import { articleSourcePath, resolveArticleCopy, type EditorialArticle } from '@/lib/editorial/articles';
import { publicUrl } from '@/lib/seo/urls';

const ORGANIZATION = { '@type': 'Organization', name: 'Murmure', url: SITE_URL } as const;

/** Une image n'entre au schéma que si elle est publiquement récupérable. */
const publicImage = (value: string | undefined): string | undefined =>
  value && /^https:\/\//.test(value) ? value : undefined;

export interface TourJsonLdOptions {
  /**
   * L'offre de lancement rend la visite gratuite pour tout le monde : le prix
   * structuré doit le dire, comme le badge visible.
   */
  launchOfferActive?: boolean;
  /** Fin de l'offre, en ISO — publiée comme `priceValidUntil`. */
  launchOfferEndsAt?: string;
}

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
  locale: InterfaceLocale,
  options: TourJsonLdOptions = {},
): Record<string, unknown> {
  const url = publicUrl(`/catalogue/${tour.citySlug}/${tour.slug}`, locale);
  const isFree = tour.purchaseType === undefined || tour.purchaseType === 'free';
  const free = isFree || options.launchOfferActive === true;
  const price = free ? 0 : (tour.priceCents ?? 0) / 100;

  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    '@id': url,
    url,
    name: tour.title,
    description: tour.shortDescription || tour.description || undefined,
    inLanguage: tour.availableLanguages?.length ? tour.availableLanguages : undefined,
    image: publicImage(tour.imageUrl),
    provider: ORGANIZATION,
    touristType: translate(locale, 'Visite audio autoguidée à pied', 'Self-guided audio walking tour'),
    ...(tour.duration > 0 ? { estimatedDuration: `PT${Math.round(tour.duration)}M` } : {}),
    itinerary: {
      '@type': 'Place',
      name: tour.city,
      address: { '@type': 'PostalAddress', addressLocality: tour.city, addressCountry: cityCountry(tour.citySlug) },
    },
    offers:
      tour.purchaseType === 'subscription_only' && !options.launchOfferActive
        ? undefined
        : {
            '@type': 'Offer',
            url,
            price: price.toFixed(2),
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            ...(options.launchOfferActive && options.launchOfferEndsAt
              ? { priceValidUntil: options.launchOfferEndsAt.slice(0, 10) }
              : {}),
          },
    // Publié seulement quand la page affiche une note : `reviewCount > 0` sans
    // moyenne donnait un `ratingValue: 0` qu'aucun avis ne soutenait.
    aggregateRating:
      tour.reviewCount > 0 && tour.averageRating > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: tour.averageRating,
            reviewCount: tour.reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}

const GUIDE_SCHEMA_COPY = extendCopy({
  fr: { jobTitle: 'Guide touristique' },
  en: { jobTitle: 'Tour guide' },
} as const);

export function guideJsonLd(
  guide: Pick<PublicGuideProfile, 'displayName' | 'bio' | 'photoUrl' | 'city' | 'specialties' | 'languages' | 'slug'>,
  tours: ReadonlyArray<Pick<Tour, 'title' | 'shortDescription' | 'citySlug' | 'slug'>>,
  locale: InterfaceLocale = 'fr',
): Record<string, unknown> {
  const citySlug = tours[0]?.citySlug ?? '';
  const url = publicUrl(`/guides/${guide.slug}`, locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': url,
    url,
    name: guide.displayName,
    jobTitle: GUIDE_SCHEMA_COPY[locale].jobTitle,
    description: guide.bio,
    ...(guide.photoUrl ? { image: absoluteUrl(guide.photoUrl) } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: guide.city,
      addressCountry: citySlug ? cityCountry(citySlug) : 'FR',
    },
    knows: guide.specialties,
    knowsLanguage: guide.languages,
    worksFor: ORGANIZATION,
    makesOffer: tours.map((t) => ({
      '@type': 'Offer',
      name: t.title,
      description: t.shortDescription,
      url: publicUrl(`/catalogue/${t.citySlug}/${t.slug}`, locale),
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

/**
 * Un article de conseils : le schéma dit ce que la page montre — titre,
 * chapeau, image quand il y en a une, langue servie, dates, éditeur — et le
 * lieu dont il parle. Sur une langue de repli, la langue déclarée est celle du
 * texte réellement servi, pas celle de l'URL.
 */
export function articleJsonLd(article: EditorialArticle, locale: InterfaceLocale): Record<string, unknown> {
  const { copy, locale: served } = resolveArticleCopy(article, locale);
  const url = publicUrl(articleSourcePath(article), locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': url,
    mainEntityOfPage: url,
    url,
    headline: copy.title,
    description: copy.description,
    ...(article.image ? { image: absoluteUrl(article.image.src) } : {}),
    inLanguage: LOCALE_FORMATS[served],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: { '@type': 'Organization', name: 'Murmure', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'Murmure', url: SITE_URL, logo: { '@type': 'ImageObject', url: absoluteUrl('/opengraph-image') } },
    about: {
      '@type': 'Place',
      name: article.city.name,
      address: { '@type': 'PostalAddress', addressLocality: article.city.name, addressCountry: article.city.country },
    },
  };
}

/**
 * Identité de l'éditeur et du site, posées sur l'accueil de chaque langue.
 *
 * `WebSite.potentialAction` décrit la recherche que la page offre réellement :
 * le formulaire de l'accueil poste vers le catalogue avec `?q=`. Rien de plus.
 */
export function siteJsonLd(locale: InterfaceLocale): Array<Record<string, unknown>> {
  const home = publicUrl('/', locale);
  const catalogue = publicUrl('/catalogue', locale);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Murmure',
      url: SITE_URL,
      logo: absoluteUrl('/opengraph-image'),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${home}#website`,
      url: home,
      name: 'Murmure',
      inLanguage: LOCALE_FORMATS[locale],
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${catalogue}?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}
