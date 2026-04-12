import type { Metadata } from 'next';
import { getAllToursWithCoords } from '@/lib/api/tours';
import TrackPageView from '@/components/TrackPageView';
import { AnalyticsEvents } from '@/lib/analytics';
import { CatalogueView } from './catalogue-view';

export const revalidate = 300; // ISR: 5 minutes

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
