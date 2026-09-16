import type { Metadata } from 'next';
import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { publicPath, seoAlternates } from '@/lib/seo/urls';
import { absoluteUrl } from '@/lib/site';
import { articleLocales, articleSourcePath, resolveArticleCopy, tipsIndexLocales, TIPS_SOURCE_PATH, type EditorialArticle } from '@/lib/editorial/articles';
import { EDITORIAL_UI } from '@/lib/editorial/editorial-copy';

/**
 * Métadonnées d'un article de conseils et de leur index, six langues.
 *
 * Même contrat que le catalogue : canonical absolue et auto-référente, hreflang
 * limité aux langues publiées, `x-default` sur le français, `noindex, follow`
 * sur une langue de repli. Rien ici ne décide de l'indexabilité : c'est
 * `articleLocales()` qui le dit, et `seoAlternates()` qui l'écrit.
 */
function brandImage(locale: InterfaceLocale, alt: string) {
  return [{ url: `${publicPath('/', locale).replace(/\/$/, '')}/opengraph-image`, width: 1200, height: 630, alt }];
}

export function articleMetadata(article: EditorialArticle, locale: InterfaceLocale): Metadata {
  const { copy } = resolveArticleCopy(article, locale);
  const { alternates, robots } = seoAlternates({ sourcePath: articleSourcePath(article), locale, published: articleLocales(article) });
  const images = article.image
    ? [{ url: absoluteUrl(article.image.src), width: article.image.width, height: article.image.height, alt: copy.imageAlt ?? copy.title }]
    : brandImage(locale, copy.title);
  return {
    title: copy.title,
    description: copy.description,
    alternates,
    ...(robots ? { robots } : {}),
    openGraph: {
      type: 'article',
      siteName: 'Murmure',
      url: alternates.canonical as string,
      locale: LOCALE_FORMATS[locale].replace('-', '_'),
      title: copy.title,
      description: copy.description,
      images,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
    },
    twitter: { card: 'summary_large_image', title: copy.title, description: copy.description, images },
  };
}

export function tipsIndexMetadata(locale: InterfaceLocale): Metadata {
  const ui = EDITORIAL_UI[locale];
  const { alternates, robots } = seoAlternates({ sourcePath: TIPS_SOURCE_PATH, locale, published: tipsIndexLocales() });
  const images = brandImage(locale, ui.indexTitle);
  return {
    title: ui.indexTitle,
    description: ui.indexDescription,
    alternates,
    ...(robots ? { robots } : {}),
    openGraph: {
      type: 'website',
      siteName: 'Murmure',
      url: alternates.canonical as string,
      locale: LOCALE_FORMATS[locale].replace('-', '_'),
      title: ui.indexTitle,
      description: ui.indexDescription,
      images,
    },
    twitter: { card: 'summary_large_image', title: ui.indexTitle, description: ui.indexDescription, images },
  };
}
