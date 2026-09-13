import type { Metadata } from 'next';
import { LocalizedCataloguePage } from '../../catalogue/page';
import { catalogueMetadata } from '@/lib/seo/catalogue-metadata';

/**
 * Catalogue anglais.
 *
 * Cette page était une SECONDE implémentation : sa propre copie, sa propre
 * canonical, son propre groupe hreflang — construit à la main sur deux langues
 * et sans `x-default`, pendant que les quatre autres langues passaient par la
 * route localisée. Elle délègue désormais, comme elles.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = catalogueMetadata('en');

export default function EnglishCataloguePage(props: { searchParams: Promise<{ q?: string | string[] }> }) {
  return LocalizedCataloguePage({ ...props, locale: 'en' });
}
