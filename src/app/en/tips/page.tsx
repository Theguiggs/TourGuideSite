import type { Metadata } from 'next';
import { TipsIndex } from '@/components/editorial/editorial-index';
import { tipsIndexMetadata } from '@/lib/seo/article-metadata';

export const metadata: Metadata = tipsIndexMetadata('en');

export default function EnglishTipsPage() {
  return <TipsIndex locale="en" />;
}
