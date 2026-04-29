import type { Metadata } from 'next';
import { getCities, getAllTours } from '@/lib/api/tours-server';
import TrackPageView from '@/components/TrackPageView';
import { AnalyticsEvents } from '@/lib/analytics';
import { CatalogueViewCities } from './catalogue-view-cities';

// Force dynamic rendering: server AppSync client reads cookies (generateServerClientUsingCookies),
// which is incompatible with static ISR. Switch to force-dynamic so Next.js doesn't attempt to
// statically pre-render the page at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catalogue des villes — TourGuide',
  description:
    'Explorez les villes proposées en visite audio. ' +
    'Chaque ville révèle ses propres histoires.',
};

export default async function CataloguePage() {
  const [cities, tours] = await Promise.all([getCities(), getAllTours()]);

  return (
    <>
      <TrackPageView event={AnalyticsEvents.WEB_CATALOGUE_BROWSE} />
      <CatalogueViewCities cities={cities} tours={tours} />
    </>
  );
}
