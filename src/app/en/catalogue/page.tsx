import type { Metadata } from 'next';
import { getCities, getAllTours } from '@/lib/api/tours-server';
import TrackPageView from '@/components/TrackPageView';
import { AnalyticsEvents } from '@/lib/analytics';
import { CatalogueViewCities } from '../../catalogue/catalogue-view-cities';
import { MyPurchasesStripClient } from '@/components/catalogue/my-purchases-strip-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Audio tour city catalogue - Murmure',
  description: 'Explore cities through immersive audio walking tours available in five languages.',
  alternates: {
    canonical: '/en/catalogue',
    languages: {fr: '/catalogue', en: '/en/catalogue'},
  },
  openGraph: {locale: 'en_US'},
};

export default async function EnglishCataloguePage() {
  const [cities, tours] = await Promise.all([getCities(), getAllTours()]);

  return (
    <>
      <TrackPageView event={AnalyticsEvents.WEB_CATALOGUE_BROWSE} />
      <MyPurchasesStripClient locale="en" />
      <CatalogueViewCities cities={cities} tours={tours} locale="en" />
    </>
  );
}
