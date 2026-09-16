/**
 * Articles de conseils (« Visiter X à pied ») — le registre et ses règles.
 *
 * Le site ne portait qu'un article, écrit en dur dans un composant, avec ses
 * propres routes, sa propre canonical et sa propre ligne de sitemap : un
 * second article aurait signifié tout recopier. Ici un article est une donnée,
 * et tout le reste — chemin, langues publiées, hreflang, sitemap, maillage
 * depuis la ville et la fiche — se déduit du registre.
 *
 * Trois règles :
 *
 * 1. **Un article n'existe que dans les langues où son texte a été relu.**
 *    `copy` ne porte que ces langues ; elles seules sont indexables, listées au
 *    sitemap et annoncées en hreflang (même contrat que les visites, voir
 *    `src/lib/seo/availability.ts`). Une langue absente reçoit la version
 *    originale en `noindex, follow`, avec un avertissement visible.
 * 2. **Un seul slug par article**, identique dans les six langues, comme les
 *    villes et les visites du catalogue : `/conseils/<slug>` en français,
 *    `/<langue>/tips/<slug>` ailleurs (voir `PUBLIC_ROUTE_PAIRS`).
 * 3. **Rien d'inventé.** Le texte décrit un parcours réel ; la fiche visite
 *    qu'il recommande n'est reliée que si elle est publiée au moment du rendu.
 */

import { isInterfaceLocale, type InterfaceLocale } from '@/lib/i18n/locales';
import { orderLocales } from '@/lib/seo/urls';
import { ARTICLE_GRASSE } from './articles/grasse';
import { ARTICLE_EZE } from './articles/eze';
import { ARTICLE_MENTON } from './articles/menton';
import { ARTICLE_MONACO } from './articles/monaco';
import { ARTICLE_ANTIBES } from './articles/antibes';
import { ARTICLE_BEAULIEU } from './articles/beaulieu';
import { ARTICLE_CANNES } from './articles/cannes';
import { ARTICLE_CAP_FERRAT } from './articles/cap-ferrat';
import { ARTICLE_NICE_CRIMES } from './articles/nice-crimes';
import { ARTICLE_ROQUEBRUNE } from './articles/roquebrune';

export interface ArticleSection {
  title: string;
  paragraphs: string[];
}

export interface ArticleCopy {
  /** Titre de la page (le gabarit racine ajoute « | Murmure »). */
  title: string;
  /** Meta description, 100 à 160 caractères. */
  description: string;
  /** Libellé court, pour le fil d'Ariane et les liens de maillage. */
  label: string;
  lead: string;
  sections: ArticleSection[];
  /** Les étapes du parcours publié, dans l'ordre. */
  stops?: { title: string; intro?: string; items: string[] };
  /** Le bloc qui mène à la fiche visite. */
  tour: { title: string; body: string; cta: string };
  /** « À propos de cette visite » : affiché sur la fiche visite elle-même. */
  note?: { title: string; paragraphs: string[] };
  /** Sources externes (office de tourisme…), quand l'article s'y appuie. */
  sources?: { title: string; intro: string; links: Array<{ label: string; href: string }>; note?: string };
  imageAlt?: string;
}

export interface ArticleTourRef {
  /** Slug attendu de la visite dans sa ville (dérivé du titre, voir `tour-slugs.ts`). */
  slug: string;
  /** Fragment de slug qui suffit à reconnaître la visite si le titre a bougé. */
  match?: string;
}

export interface EditorialArticle {
  slug: string;
  city: { slug: string; name: string; country: string };
  tour?: ArticleTourRef;
  /** ISO 8601, date de première publication (schéma `Article`). */
  publishedAt: string;
  updatedAt?: string;
  image?: { src: string; width: number; height: number };
  copy: Partial<Record<InterfaceLocale, ArticleCopy>>;
}

export interface ResolvedArticleCopy {
  copy: ArticleCopy;
  /** La langue réellement servie. */
  locale: InterfaceLocale;
  /** Vrai quand la langue demandée n'est pas publiée : page de repli. */
  fallback: boolean;
}

/** Chemin source de l'index (version française, sans préfixe). */
export const TIPS_SOURCE_PATH = '/conseils';

/** Du plus récent au plus ancien : l'ordre de l'index. */
export const ARTICLES: readonly EditorialArticle[] = [
  ARTICLE_EZE,
  ARTICLE_MONACO,
  ARTICLE_MENTON,
  ARTICLE_ANTIBES,
  ARTICLE_CANNES,
  ARTICLE_NICE_CRIMES,
  ARTICLE_CAP_FERRAT,
  ARTICLE_BEAULIEU,
  ARTICLE_ROQUEBRUNE,
  ARTICLE_GRASSE,
];

export function articleSourcePath(article: Pick<EditorialArticle, 'slug'>): string {
  return `${TIPS_SOURCE_PATH}/${article.slug}`;
}

/** Les langues publiées d'un article, dans l'ordre de `SITE_LOCALES`. */
export function articleLocales(article: Pick<EditorialArticle, 'copy'>): InterfaceLocale[] {
  return orderLocales(Object.keys(article.copy).filter(isInterfaceLocale));
}

/**
 * Le texte à servir : la langue demandée si elle est publiée, sinon l'anglais,
 * sinon le français — jamais une page vide.
 */
export function resolveArticleCopy(article: Pick<EditorialArticle, 'copy'>, locale: InterfaceLocale): ResolvedArticleCopy {
  const own = article.copy[locale];
  if (own) return { copy: own, locale, fallback: false };
  for (const candidate of ['en', 'fr'] as const) {
    const copy = article.copy[candidate];
    if (copy) return { copy, locale: candidate, fallback: true };
  }
  const [first] = articleLocales(article);
  if (!first) throw new Error('Article sans aucune langue publiée');
  return { copy: article.copy[first]!, locale: first, fallback: true };
}

export function findArticle(slug: string): EditorialArticle | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

/** Les articles publiés dans cette langue, du plus récent au plus ancien. */
export function articlesForLocale(locale: InterfaceLocale): EditorialArticle[] {
  return ARTICLES.filter((article) => Boolean(article.copy[locale]));
}

export function articlesForCity(citySlug: string): EditorialArticle[] {
  return ARTICLES.filter((article) => article.city.slug === citySlug);
}

/** L'article qui recommande cette visite, s'il existe. */
export function articleForTour(citySlug: string, tourSlug: string): EditorialArticle | undefined {
  return ARTICLES.find((article) => article.city.slug === citySlug && article.tour !== undefined && tourMatches(article.tour, tourSlug));
}

export function tourMatches(ref: ArticleTourRef, tourSlug: string): boolean {
  if (tourSlug === ref.slug) return true;
  return ref.match !== undefined && ref.match.length > 0 && tourSlug.includes(ref.match);
}

/** Les langues où l'index a au moins un article : celles où il est indexable. */
export function tipsIndexLocales(): InterfaceLocale[] {
  const union = new Set<InterfaceLocale>();
  for (const article of ARTICLES) for (const locale of articleLocales(article)) union.add(locale);
  return orderLocales(union);
}

/** La date la plus récente du registre, pour l'index dans le sitemap. */
export function latestArticleDate(): string | undefined {
  return ARTICLES.map((article) => article.updatedAt ?? article.publishedAt).sort().at(-1);
}
