import { isInterfaceLocale, type InterfaceLocale } from '@/lib/i18n/locales';
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

export type SiteLocale = InterfaceLocale;

/** French keeps its original URLs; the other five interfaces use prefixes. */
export function localeFromPath(pathname: string | null | undefined): SiteLocale {
  const path = pathname ?? '';
  const prefix = path.split('/')[1];
  return isInterfaceLocale(prefix) ? prefix : 'fr';
}

/** En-tête posé par le proxy et lu par le layout racine pour `<html lang>`. */
export const LOCALE_HEADER = 'x-locale';
