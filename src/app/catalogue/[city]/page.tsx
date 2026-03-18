import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCityBySlug, getToursByCity, getCities } from '@/lib/api/tours';
import { getGuidesByCity } from '@/lib/api/guides-public';

export const revalidate = 300; // ISR: 5 minutes

interface CityPageProps {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  const cities = await getCities();
  return cities.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) return {};
  return {
    title: `Visites guidees audio a ${city.name}`,
    description: `Decouvrez ${city.tourCount} visites guidees audio a ${city.name}. ${city.description}`,
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) notFound();

  const [tours, guides] = await Promise.all([
    getToursByCity(citySlug),
    getGuidesByCity(citySlug),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/catalogue" className="hover:text-teal-700">
          Catalogue
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{city.name}</span>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{city.name}</h1>
      <p className="text-gray-600 mb-10">{city.description}</p>

      {tours.length === 0 ? (
        <p className="text-gray-500">Aucune visite disponible pour le moment.</p>
      ) : (
        <div className="space-y-6">
          {tours.map((tour) => (
            <Link
              key={tour.id}
              href={`/catalogue/${citySlug}/${tour.slug}`}
              className="block rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-64 h-48 sm:h-auto bg-gradient-to-br from-teal-600 to-teal-800 flex-shrink-0" />
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-semibold text-gray-900">{tour.title}</h2>
                        {tour.isFree && (
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            GRATUIT
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        Par {tour.guideName} &middot; {tour.duration} min &middot; {tour.distance} km
                        &middot; {tour.poiCount} points
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 line-clamp-2">{tour.shortDescription}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Guides locaux */}
      {guides.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Guides locaux</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                href={`/guides/${guide.slug}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg flex-shrink-0">
                  {guide.displayName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{guide.displayName}</p>
                  <p className="text-sm text-gray-500">
                    {guide.tourCount ?? 0} parcours
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
