import type { Metadata } from 'next';
import Link from 'next/link';
import { getCities } from '@/lib/api/tours';
import TrackPageView from '@/components/TrackPageView';
import { AnalyticsEvents } from '@/lib/analytics';

export const revalidate = 300; // ISR: 5 minutes

export const metadata: Metadata = {
  title: 'Catalogue des visites guidees audio',
  description:
    'Parcourez notre catalogue de visites guidees audio dans toute la France. ' +
    'Grasse, Paris, Lyon et plus encore.',
};

export default async function CataloguePage() {
  const cities = await getCities();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <TrackPageView event={AnalyticsEvents.WEB_CATALOGUE_BROWSE} />
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Catalogue</h1>
      <p className="text-gray-600 mb-10">
        Choisissez une ville pour decouvrir les visites disponibles.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {cities.map((city) => (
          <Link
            key={city.id}
            href={`/catalogue/${city.slug}`}
            className="group block rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <div className="h-40 bg-gradient-to-br from-teal-600 to-teal-800 flex items-end p-5">
              <div>
                <h2 className="text-xl font-bold text-white">{city.name}</h2>
                <p className="text-teal-100 text-sm mt-1">
                  {city.tourCount} visite{city.tourCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 text-sm line-clamp-2">{city.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
