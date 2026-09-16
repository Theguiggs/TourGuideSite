import type { Metadata } from 'next';
import { LocalizedArticlePage, articlePageMetadata } from '@/app/conseils/[slug]/page';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  return articlePageMetadata(slug, 'en');
}

export default async function EnglishArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  return LocalizedArticlePage({ slug, locale: 'en' });
}
