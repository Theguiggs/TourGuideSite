import type { Metadata } from 'next';
import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { publicPath, seoAlternates } from '@/lib/seo/urls';
import { EVERGREEN_LOCALES } from '@/lib/seo/availability';

/**
 * Métadonnées du catalogue, pour les six langues.
 *
 * La page portait un objet `metadata` statique, en français, et la route
 * localisée retombait sur un libellé générique sans Open Graph : le catalogue
 * espagnol s'annonçait « Catalogue des visites » avec l'image de marque
 * française. Une seule fonction, six langues, et la canonical ne porte jamais
 * le filtre `?q=` — un filtre n'est pas une page.
 */
const COPY: Record<InterfaceLocale, [title: string, description: string]> = {
  fr: ['Catalogue des visites audio', 'Explorez les villes proposées en visite audio guidée. Chaque ville révèle ses propres histoires, racontées par des guides locaux.'],
  en: ['Audio tour catalogue', 'Browse the cities available as guided audio tours. Each city reveals its own stories, told by local guides.'],
  es: ['Catálogo de visitas audio', 'Explora las ciudades disponibles como visita audio guiada. Cada ciudad revela sus propias historias, contadas por guías locales.'],
  de: ['Katalog der Audiotouren', 'Entdecke die Städte, die als geführte Audiotour verfügbar sind. Jede Stadt erzählt ihre eigenen Geschichten, von lokalen Guides.'],
  it: ['Catalogo delle visite audio', 'Esplora le città disponibili come visita audio guidata. Ogni città rivela le proprie storie, raccontate da guide locali.'],
  nl: ['Catalogus van audiotours', 'Ontdek de steden die als begeleide audiotour beschikbaar zijn. Elke stad onthult haar eigen verhalen, verteld door lokale gidsen.'],
};

export function catalogueMetadata(locale: InterfaceLocale): Metadata {
  const [title, description] = COPY[locale];
  const { alternates } = seoAlternates({ sourcePath: '/catalogue', locale, published: EVERGREEN_LOCALES });
  const images = [{ url: `${publicPath('/', locale).replace(/\/$/, '')}/opengraph-image`, width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    alternates,
    openGraph: { type: 'website', siteName: 'Murmure', url: alternates.canonical as string, locale: LOCALE_FORMATS[locale].replace('-', '_'), title, description, images },
    twitter: { card: 'summary_large_image', title, description, images },
  };
}
