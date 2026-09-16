import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { EditorialArticle } from '@/components/editorial/editorial-article';
import { findArticle } from '@/lib/editorial/articles';
import { articleMetadata } from '@/lib/seo/article-metadata';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Partagée avec les routes anglaise et localisée. Sans `loading.tsx` sur ce
 * segment, un slug inconnu rend un vrai 404.
 */
export function articlePageMetadata(slug: string, locale: InterfaceLocale): Metadata {
  const article = findArticle(slug);
  return article ? articleMetadata(article, locale) : {};
}

export async function LocalizedArticlePage({ slug, locale }: { slug: string; locale: InterfaceLocale }) {
  const article = findArticle(slug);
  if (!article) notFound();
  return <EditorialArticle article={article} locale={locale} />;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  return articlePageMetadata(slug, 'fr');
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  return LocalizedArticlePage({ slug, locale: 'fr' });
}
