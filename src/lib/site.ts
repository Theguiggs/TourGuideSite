/**
 * Origine publique du site, et lecture de la locale dans un chemin.
 *
 * `https://murmure-visit.com` était écrit en dur à six endroits (sitemap,
 * robots, deux routes OG, layout, JSON-LD) — et `murmure.app`, un domaine qui
 * n'est pas à nous, à deux autres. Une seule constante, et une seule façon
 * de fabriquer une URL absolue (Schema.org exige des URI absolues, que
 * `metadataBase` ne fournit qu'aux métadonnées Next).
 *
 * Sans dépendance : importable du proxy (Edge), des routes, des composants.
 */

export const SITE_URL = 'https://murmure-visit.com';

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export type SiteLocale = 'fr' | 'en';

/** `/en` et `/en/...` sont anglais ; tout le reste est français. */
export function localeFromPath(pathname: string | null | undefined): SiteLocale {
  const path = pathname ?? '';
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'fr';
}

/** En-tête posé par le proxy et lu par le layout racine pour `<html lang>`. */
export const LOCALE_HEADER = 'x-locale';
