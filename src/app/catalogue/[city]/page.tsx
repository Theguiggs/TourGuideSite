import { cityMetadata } from '@/lib/seo/city-metadata';
import { citySeoLocales } from '@/lib/seo/availability';
import { translate } from '@/lib/i18n/translate';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { publicPath } from '@/lib/seo/urls';
import { serializeFilters } from '@/lib/catalogue/serialize-filters';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCities, getCityBySlug, getToursByCity } from '@/lib/api/tours-server';
import { getGuidesByCity } from '@/lib/api/guides-public-server';
import { TourListWithFilter } from './tour-list-filter';
import { PageTitle } from '@murmure/design-system/web';
import { CityOverview } from '@/components/catalogue/city-overview';
import { CityArticles } from '@/components/editorial/city-articles';
import { LanguageSuggestion } from '@/components/i18n/language-suggestion';
import { safeJsonLd } from '@/lib/security/safe-json-ld';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { cityFactsCopy } from '@/lib/cities/city-facts';

// Force dynamic rendering: server AppSync client reads cookies, incompatible with static ISR.
export const dynamic = 'force-dynamic';

interface CityPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{ city: string }>;
}

/**
 * Partagée avec la route localisée : une ville n'est indexable que dans les
 * langues où au moins une de ses visites l'est (lot SEO-2).
 *
 * Une ville inconnue repart en `noindex, nofollow`, et non en 404.
 *
 * `loading.tsx` place la page sous `<Suspense>` : le serveur commet le code
 * HTTP avant d'exécuter la page, si bien que ni le `notFound()` de la page ni
 * un `notFound()` posé ici n'arrivent à temps — mesuré, la réponse reste 200.
 * Retirer `loading.tsx` rendrait le vrai 404, mais ferait bloquer la
 * navigation interne le temps d'une lecture AppSync complète (constaté en
 * recette : plus de dix secondes sur le backend réel).
 *
 * Le `noindex` explicite règle ce qui compte pour l'indexation — l'URL ne
 * pourra pas entrer dans l'index — et laisse à Search Console un « exclue par
 * noindex » plutôt qu'un « soft 404 » muet. Les routes `/es`, `/de`, `/it`,
 * `/nl` n'ont pas de `loading.tsx` et rendent, elles, un vrai 404.
 */
const INTROUVABLE: Metadata = { robots: { index: false, follow: false } };

export async function cityPageMetadata(citySlug: string, locale: InterfaceLocale): Promise<Metadata> {
  const city = await getCityBySlug(citySlug);
  if (!city) return INTROUVABLE;
  const tours = await getToursByCity(citySlug);
  return cityMetadata(city, locale, citySeoLocales(tours));
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  return cityPageMetadata(citySlug, 'fr');
}

export async function LocalizedCityPage({ params, searchParams, locale = 'fr' }: CityPageProps & { locale?: InterfaceLocale }) {
  const { city: citySlug } = await params;
  const city = await getCityBySlug(citySlug);
  if (!city) notFound();

  const [tours, guides, cities] = await Promise.all([
    getToursByCity(citySlug),
    getGuidesByCity(citySlug),
    getCities(),
  ]);
  // Maillage horizontal : sans lui, une ville ne mène qu'au catalogue et à ses
  // propres visites — les autres destinations restent à deux clics du robot.
  const otherCities = cities.filter((other) => other.slug !== citySlug && other.tourCount > 0).slice(0, 12);

  return (
    <>
      <LanguageSuggestion sourcePath={`/catalogue/${citySlug}`} locale={locale} published={citySeoLocales(tours)} />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav aria-label={translate(locale, "Fil d'Ariane", 'Breadcrumb')} className="text-body text-ink-60 mb-6">
        <Link href={publicPath('/catalogue', locale)} className="hover:text-grenadine">
          {translate(locale, 'Catalogue des visites', 'Tour catalogue')}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{city.name}</span>
      </nav>

      <PageTitle className="mb-2">{city.name}</PageTitle>
      <CityOverview cityName={city.name} citySlug={citySlug} tours={tours} locale={locale} />

      <TourListWithFilter initialFilters={serializeFilters(await searchParams)} tours={tours} citySlug={citySlug} locale={locale} />
      <CityArticles citySlug={citySlug} cityName={city.name} locale={locale} />

      {/* Guides locaux */}
      {guides.length > 0 && (
        <div className="mt-12">
          <PageTitle as="h2" size="h5" className="mb-6">{translate(locale, 'Guides', 'Tour guide')}</PageTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guides.map((guide) => (
              <Link
                key={guide.id}
                href={publicPath(`/guides/${guide.slug}`, locale)}
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

      {/* Fil d'Ariane structuré, identique au fil visible en haut de page. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            breadcrumbJsonLd([
              { name: translate(locale, 'Catalogue des visites', 'Tour catalogue'), path: publicPath('/catalogue', locale) },
              { name: city.name },
            ]),
          ),
        }}
      />

      {otherCities.length > 0 && (
        <div className="mt-12">
          <PageTitle as="h2" size="h5" className="mb-6">{cityFactsCopy(locale).otherCities}</PageTitle>
          <ul className="flex flex-wrap gap-2">
            {otherCities.map((other) => (
              <li key={other.slug}>
                <Link
                  href={publicPath(`/catalogue/${other.slug}`, locale)}
                  className="inline-flex min-h-11 items-center rounded-pill border border-line px-4 text-body text-ink no-underline hover:border-grenadine"
                >
                  {other.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </>
  );
}

export default function CityPage(props: CityPageProps) { return LocalizedCityPage({ ...props, locale: 'fr' }); }
