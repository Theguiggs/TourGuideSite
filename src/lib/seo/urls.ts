/**
 * Source unique des URL publiques : liens, canonical, hreflang, sitemap, JSON-LD.
 *
 * Avant ce module, chaque générateur fabriquait son préfixe à sa façon —
 * `extendCopy({fr, en})`, `translate(locale, '', '/en')`, concaténation à la
 * main. Les trois donnaient le même résultat tant que personne ne se trompait,
 * et rien ne garantissait qu'une canonical, son hreflang et sa ligne de sitemap
 * parlent de la même page.
 *
 * Une seule règle ici : on décrit la page par son **chemin source** — la
 * version française, sans préfixe (`/catalogue/nice/vieux-nice`) — et ce module
 * en dérive tout le reste.
 *
 * Deux décisions, conformes à la recommandation de Google sur les versions
 * localisées :
 *
 * - un groupe hreflang ne contient que les variantes RÉELLEMENT publiées, il
 *   est absolu, auto-référent et réciproque ;
 * - `x-default` désigne la variante française quand elle est publiée, sinon la
 *   première variante publiée. Jamais une URL absente du groupe : un
 *   `x-default` qui pointe ailleurs est un repli que Google ne peut pas vérifier.
 *
 * Une variante non publiée n'obtient aucun groupe hreflang. Elle reste
 * accessible au visiteur, mais en `noindex, follow` : la page de repli aide
 * l'humain sans créer de doublon indexable.
 */

import type { Metadata } from 'next';
import { SITE_LOCALES, type InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';
import { absoluteUrl, SITE_URL } from '@/lib/site';

/** Clé hreflang de la variante de repli, telle que Google l'attend. */
export const X_DEFAULT = 'x-default';

/** Chemin localisé, relatif au domaine — pour les liens internes et `href`. */
export function publicPath(sourcePath: string, locale: InterfaceLocale): string {
  return localizePublicPath(sourcePath, locale);
}

/**
 * URL absolue — pour canonical, hreflang, sitemap et JSON-LD.
 *
 * La racine est rendue SANS barre oblique finale : c'est la forme que Next
 * inscrit dans la canonical (`https://murmure-visit.com`), et le sitemap
 * annonçait `https://murmure-visit.com/`. Deux URL pour la même page, dont une
 * que sa propre canonical désavoue.
 */
export function publicUrl(sourcePath: string, locale: InterfaceLocale): string {
  const path = publicPath(sourcePath, locale);
  return path === '/' ? SITE_URL : absoluteUrl(path);
}

/** Les langues publiées, dans l'ordre stable de `SITE_LOCALES`. */
export function orderLocales(locales: Iterable<InterfaceLocale>): InterfaceLocale[] {
  const published = new Set(locales);
  return SITE_LOCALES.filter((locale) => published.has(locale));
}

/**
 * La variante de repli : le français s'il est publié, sinon la première langue
 * publiée. `undefined` quand rien n'est publié — il n'y a alors pas de groupe.
 */
export function xDefaultLocale(locales: Iterable<InterfaceLocale>): InterfaceLocale | undefined {
  const ordered = orderLocales(locales);
  return ordered.includes('fr') ? 'fr' : ordered[0];
}

/**
 * Groupe hreflang absolu : une entrée par langue publiée, plus `x-default`.
 * Groupe vide si aucune variante n'est publiée — mieux vaut aucune annotation
 * qu'une annotation que la page cible ne renvoie pas.
 */
export function hreflangGroup(
  sourcePath: string,
  locales: Iterable<InterfaceLocale>,
): Record<string, string> {
  const ordered = orderLocales(locales);
  if (ordered.length === 0) return {};
  const group: Record<string, string> = Object.fromEntries(
    ordered.map((locale) => [locale, publicUrl(sourcePath, locale)]),
  );
  const fallback = xDefaultLocale(ordered);
  if (fallback) group[X_DEFAULT] = publicUrl(sourcePath, fallback);
  return group;
}

export interface AlternatesOptions {
  /** Chemin français sans préfixe, identique pour toutes les langues. */
  sourcePath: string;
  /** Langue de la page rendue. */
  locale: InterfaceLocale;
  /** Langues dont le contenu public existe et est validé. */
  published: Iterable<InterfaceLocale>;
}

/**
 * `alternates` + `robots` d'une page, déduits du contrat d'indexation.
 *
 * La canonical est TOUJOURS auto-référente et absolue : c'est ce que Google
 * attend d'une page qui existe, indexable ou non. Ce qui change, c'est le reste
 * — une variante non publiée n'annonce aucune autre langue et refuse l'index.
 */
export function seoAlternates({ sourcePath, locale, published }: AlternatesOptions): {
  alternates: NonNullable<Metadata['alternates']>;
  robots?: Metadata['robots'];
} {
  const ordered = orderLocales(published);
  const indexable = ordered.includes(locale);
  const canonical = publicUrl(sourcePath, locale);
  if (!indexable) {
    return { alternates: { canonical }, robots: { index: false, follow: true } };
  }
  return { alternates: { canonical, languages: hreflangGroup(sourcePath, ordered) } };
}

/**
 * Une entrée de sitemap par langue publiée, chacune portant le groupe complet.
 * Aucune langue publiée ⇒ aucune entrée : le sitemap ne liste que des URL
 * canonical, indexables et attendues en 200.
 */
export function sitemapEntries<T extends Record<string, unknown>>(
  sourcePath: string,
  published: Iterable<InterfaceLocale>,
  base: T,
): Array<T & { url: string; alternates: { languages: Record<string, string> } }> {
  const ordered = orderLocales(published);
  if (ordered.length === 0) return [];
  const languages = hreflangGroup(sourcePath, ordered);
  return ordered.map((locale) => ({ ...base, url: publicUrl(sourcePath, locale), alternates: { languages } }));
}
