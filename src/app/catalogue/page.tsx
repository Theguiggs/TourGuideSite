import type { Metadata } from 'next';
import { getAllToursWithCoords } from '@/lib/api/tours-server';
import TrackPageView from '@/components/TrackPageView';
import { AnalyticsEvents } from '@/lib/analytics';
import { CatalogueView } from './catalogue-view';

// Force dynamic rendering: server AppSync client reads cookies (generateServerClientUsingCookies),
// which is incompatible with static ISR. Switch to force-dynamic so Next.js doesn't attempt to
// statically pre-render the page at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catalogue des visites guidees audio — TourGuide',
  description:
    'Explorez les visites guidees audio sur la Cote d\'Azur. ' +
    'Nice, Cannes, Grasse, Menton, Antibes et plus encore.',
};

export default async function CataloguePage() {
  const tours = await getAllToursWithCoords();

  return (
    <>
      <TrackPageView event={AnalyticsEvents.WEB_CATALOGUE_BROWSE} />
      <CatalogueView tours={tours} />
    </>
  );
}
