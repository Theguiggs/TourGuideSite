import type { Metadata } from 'next';
import type { City } from '@/types/tour';
import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { seoAlternates } from '@/lib/seo/urls';
import { EVERGREEN_LOCALES } from '@/lib/seo/availability';

const copy: Record<InterfaceLocale, { title: (city: string) => string; description: (city: string, count: number) => string }> = {
  fr: { title: city => `Visites guidées audio à ${city}`, description: (city, count) => `Découvrez ${count} visites guidées audio à ${city}. Consultez chaque visite pour connaître les langues audio disponibles.` },
  en: { title: city => `Audio walking tours in ${city}`, description: (city, count) => `Discover ${count} audio walking tours in ${city}. Check each tour for available audio languages.` },
  es: { title: city => `Visitas audio en ${city}`, description: (city, count) => `Descubre ${count} visitas audio en ${city}. Consulta cada visita para conocer los idiomas de audio disponibles.` },
  de: { title: city => `Audiotouren in ${city}`, description: (city, count) => `Entdecke ${count} Audiotouren in ${city}. Die verfügbaren Audiosprachen findest du bei jeder Tour.` },
  it: { title: city => `Visite audio a ${city}`, description: (city, count) => `Scopri ${count} visite audio a ${city}. Consulta ogni visita per conoscere le lingue audio disponibili.` },
  nl: { title: city => `Audiotours in ${city}`, description: (city, count) => `Ontdek ${count} audiotours in ${city}. Bekijk elke tour voor de beschikbare audiotalen.` },
};

/**
 * Métadonnées d'une page ville.
 *
 * `published` porte le contrat d'indexation (lot SEO-2) : hors de cette liste,
 * la page reste servie au visiteur mais refuse l'index et n'annonce aucune
 * autre langue. Par défaut, les six langues — pour les appelants qui ne
 * connaissent pas encore l'état réel des traductions.
 */
export function cityMetadata(
  city: Pick<City, 'name' | 'slug' | 'tourCount'>,
  locale: InterfaceLocale,
  published: Iterable<InterfaceLocale> = EVERGREEN_LOCALES,
): Metadata {
  const title = copy[locale].title(city.name), description = copy[locale].description(city.name, city.tourCount);
  const { alternates, robots } = seoAlternates({ sourcePath: `/catalogue/${city.slug}`, locale, published });
  const images = [{ url: locale === 'fr' ? '/opengraph-image' : `/${locale}/opengraph-image`, width: 1200, height: 630, alt: title }];
  return { title, description, alternates, ...(robots ? { robots } : {}),
    openGraph: { type: 'website', siteName: 'Murmure', url: alternates.canonical as string, locale: LOCALE_FORMATS[locale].replace('-', '_'), title, description, images },
    twitter: { card: 'summary_large_image', title, description, images } };
}
