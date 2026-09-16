import type { Metadata } from 'next';
import { TipsIndex } from '@/components/editorial/editorial-index';
import { tipsIndexMetadata } from '@/lib/seo/article-metadata';

export const metadata: Metadata = tipsIndexMetadata('fr');

export default function TipsPage() {
  return <TipsIndex locale="fr" />;
}
