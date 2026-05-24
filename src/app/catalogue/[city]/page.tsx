import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCityBySlug, getToursByCity } from '@/lib/api/tours-server';
import { getGuidesByCity } from '@/lib/api/guides-public-server';
import { TourListWithFilter } from './tour-list-filter';

// Force dynamic rendering: server AppSync client reads cookies, incompatible with static ISR.
export const dynamic = 'force-dynamic';

interface CityPageProps {
  params: Promise<{ city: string }>;
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
      <nav className="text-sm text-ink-60 mb-6">
        <Link href="/catalogue" className="hover:text-grenadine">
          Catalogue
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{city.name}</span>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-2">{city.name}</h1>
      <p className="text-ink-60 mb-10">{city.description}</p>

      <TourListWithFilter tours={tours} citySlug={citySlug} />

      {/* Guides locaux */}
      {guides.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-ink mb-6">Guides locaux</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                href={`/guides/${guide.slug}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-line hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-grenadine-soft rounded-full flex items-center justify-center text-grenadine font-bold text-lg flex-shrink-0">
                  {guide.displayName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{guide.displayName}</p>
                  <p className="text-sm text-ink-60">
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
