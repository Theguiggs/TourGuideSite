import type { Metadata } from 'next';
import { getTourBySlug } from '@/lib/api/tours-server';
import { tourMetadata } from '@/lib/seo/tour-metadata';
import { LocalizedTourDetailPage } from '../../../../catalogue/[city]/[tourSlug]/page';

export const dynamic = 'force-dynamic';

interface TourPageProps {
  params: Promise<{city: string; tourSlug: string}>;
  searchParams: Promise<{source?: string; office?: string}>;
}

export async function generateMetadata({params}: TourPageProps): Promise<Metadata> {
  const {city, tourSlug} = await params;
  const tour = await getTourBySlug(city, tourSlug);
  if (!tour) return {};
  return tourMetadata(tour, city, tourSlug, 'en');
}

export default async function EnglishTourDetailPage(props: TourPageProps) {
  return LocalizedTourDetailPage({...props, locale: 'en'});
}
