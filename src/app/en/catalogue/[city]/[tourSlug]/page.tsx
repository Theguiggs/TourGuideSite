import type { Metadata } from 'next';
import { getTourBySlug } from '@/lib/api/tours-server';
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
  const description = tour.shortDescription || tour.description || 'An immersive audio walking tour.';
  return {
    title: `${tour.title} - Murmure`,
    description,
    alternates: {
      canonical: `/en/catalogue/${city}/${tourSlug}`,
      languages: {
        fr: `/catalogue/${city}/${tourSlug}`,
        en: `/en/catalogue/${city}/${tourSlug}`,
      },
    },
    openGraph: {locale: 'en_US'},
  };
}

export default async function EnglishTourDetailPage(props: TourPageProps) {
  return LocalizedTourDetailPage({...props, locale: 'en'});
}
