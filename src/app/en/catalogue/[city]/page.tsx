import type { Metadata } from 'next';
import { LocalizedCityPage, cityPageMetadata } from '../../../catalogue/[city]/page';

/**
 * Page ville anglaise.
 *
 * Elle recopiait la page française : sans introduction localisée, sans les
 * faits du catalogue, sans le contrat d'indexation — et ses liens vers les
 * guides pointaient vers les URL FRANÇAISES. Elle délègue désormais à la page
 * unique, comme les quatre autres langues.
 */
export const dynamic = 'force-dynamic';

interface CityPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  return cityPageMetadata(citySlug, 'en');
}

export default function EnglishCityPage(props: CityPageProps) {
  return LocalizedCityPage({ ...props, locale: 'en' });
}
