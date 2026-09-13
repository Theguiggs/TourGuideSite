import type { Metadata } from 'next';
import { LocalizedTourDetailPage, tourPageMetadata } from '../../../../catalogue/[city]/[tourSlug]/page';

export const dynamic = 'force-dynamic';

interface TourPageProps {
  params: Promise<{ city: string; tourSlug: string }>;
  searchParams: Promise<{ source?: string; office?: string }>;
}

export async function generateMetadata({ params }: TourPageProps): Promise<Metadata> {
  const { city, tourSlug } = await params;
  return tourPageMetadata(city, tourSlug, 'en');
}

export default async function EnglishTourDetailPage(props: TourPageProps) {
  return LocalizedTourDetailPage({ ...props, locale: 'en' });
}
