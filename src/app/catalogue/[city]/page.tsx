import { cityMetadata } from '@/lib/seo/city-metadata';
import { translate } from '@/lib/i18n/translate';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';
import { serializeFilters } from '@/lib/catalogue/serialize-filters';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCityBySlug, getToursByCity } from '@/lib/api/tours-server';
import { getGuidesByCity } from '@/lib/api/guides-public-server';
import { TourListWithFilter } from './tour-list-filter';
import { PageTitle } from '@murmure/design-system/web';

// Force dynamic rendering: server AppSync client reads cookies, incompatible with static ISR.
export const dynamic = 'force-dynamic';

interface CityPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) return {};
  return cityMetadata(city, 'fr');
}

export async function LocalizedCityPage({ params, searchParams, locale = 'fr' }: CityPageProps & { locale?: InterfaceLocale }) {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) notFound();

  const [tours, guides] = await Promise.all([
    getToursByCity(citySlug),
    getGuidesByCity(citySlug),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav aria-label={translate(locale, "Fil d'Ariane", 'Breadcrumb')} className="text-body text-ink-60 mb-6">
        <Link href={localizePublicPath('/catalogue', locale)} className="hover:text-grenadine">
          {translate(locale, 'Catalogue des visites', 'Tour catalogue')}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{city.name}</span>
      </nav>

      <PageTitle className="mb-2">{city.name}</PageTitle>
      {locale === 'fr' && <p className="text-ink-60 mb-10">{city.description}</p>}

      <TourListWithFilter initialFilters={serializeFilters(await searchParams)} tours={tours} citySlug={citySlug} locale={locale} />

      {/* Guides locaux */}
      {guides.length > 0 && (
        <div className="mt-12">
          <PageTitle as="h2" size="h5" className="mb-6">{translate(locale, 'Guides', 'Tour guide')}</PageTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                href={localizePublicPath(`/guides/${guide.slug}`, locale)}
                className="flex items-center gap-3 p-4 rounded-xl border border-line hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-grenadine-soft rounded-pill flex items-center justify-center text-grenadine font-bold text-h6 flex-shrink-0">
                  {guide.displayName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{guide.displayName}</p>
                  <p className="text-body text-ink-60">
                    {guide.tourCount ?? 0} {translate(locale, 'visites', 'tours')}
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

export default function CityPage(props: CityPageProps) { return LocalizedCityPage({ ...props, locale: 'fr' }); }
