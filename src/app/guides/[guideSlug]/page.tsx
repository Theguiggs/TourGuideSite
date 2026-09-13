import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { extendCopy } from '@/lib/i18n/translate';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getGuideBySlug,
  getGuidePublicTours,
} from '@/lib/api/guides-public-server';
import { getGuideTourSummaries } from '@/lib/api/tours-server';
import TrackPageView from '@/components/TrackPageView';
import { S3Image } from '@/components/studio/s3-image';
import { TourPriceBadge } from '@/components/catalogue/tour-price-badge';
import { localizeTour, METADATA_FALLBACK_COPY } from '@/lib/catalogue/localized-tour';
import { AnalyticsEvents } from '@/lib/analytics';
import { safeJsonLd } from '@/lib/security/safe-json-ld';
import { breadcrumbJsonLd, guideJsonLd } from '@/lib/seo/json-ld';
import { seoAlternates } from '@/lib/seo/urls';
import { guideSeoLocales } from '@/lib/seo/availability';
import { LanguageSuggestion } from '@/components/i18n/language-suggestion';
import { PageTitle } from '@murmure/design-system/web';
import { publicPath } from '@/lib/seo/urls';

// Force dynamic rendering: server AppSync client reads cookies, incompatible with static ISR.
export const dynamic = 'force-dynamic';

interface GuidePageProps {
  params: Promise<{ guideSlug: string }>;
}

type GuideLocale = InterfaceLocale;

/** Copie FR/EN de la page guide — une seule page, deux langues (lot 3.3). */
const GUIDE_COPY = extendCopy({
  fr: {
    breadcrumb: "Fil d'Ariane",
    home: 'Accueil',
    catalogue: 'Catalogue',
    guidePrefix: 'Guide :',
    photoOf: (name: string) => `Photo de ${name}`,
    verified: 'Vérifié',
    since: (years: number) => `Guide depuis ${years} ans`,
    languages: 'Langues :',
    tours: 'visites',
    listens: 'écoutes',
    averageRating: 'note moyenne',
    signature: 'Visite signature',
    signatureBadge: 'SIGNATURE',
    pois: "points d'intérêt",
    toursOf: (name: string) => `Visites de ${name}`,
    toursTitle: 'Visites',
    noTour: "Ce guide n'a pas encore de visite publiée.",
    jobTitle: 'Guide touristique',
    describe: (name: string, city: string, bio: string, count: number) =>
      `${name}, guide touristique à ${city}. ${bio}. Découvrez ses ${count} visites audio.`,
    title: (name: string, city: string) => `${name} — Guide touristique à ${city}`,
    twitterTitle: (name: string, city: string) => `${name} — Guide à ${city}`,
    numberLocale: 'fr-FR',
  },
  en: {
    breadcrumb: 'Breadcrumb',
    home: 'Home',
    catalogue: 'Catalogue',
    guidePrefix: 'Guide:',
    photoOf: (name: string) => `Photo of ${name}`,
    verified: 'Verified',
    since: (years: number) => `Guide for ${years} years`,
    languages: 'Languages:',
    tours: 'tours',
    listens: 'listens',
    averageRating: 'average rating',
    signature: 'Signature tour',
    signatureBadge: 'SIGNATURE',
    pois: 'points of interest',
    toursOf: (name: string) => `Tours by ${name}`,
    toursTitle: 'Tours',
    noTour: 'This guide has not published a tour yet.',
    jobTitle: 'Tour guide',
    describe: (name: string, city: string, bio: string, count: number) =>
      `${name}, tour guide in ${city}. ${bio}. Discover their ${count} audio tours.`,
    title: (name: string, city: string) => `${name} — Tour guide in ${city}`,
    twitterTitle: (name: string, city: string) => `${name} — Guide in ${city}`,
    numberLocale: 'en-GB',
  },
} as const);

export async function guideMetadata(guideSlug: string, locale: GuideLocale): Promise<Metadata> {
  const guide = await getGuideBySlug(guideSlug);
  if (!guide) return {};
  // Les langues indexables viennent de la MÊME lecture que le sitemap
  // (`publishedTours`). `getGuidePublicTours` est une seconde projection, avec
  // son propre repli de langues : deux sources décidaient de l'indexabilité, et
  // le sitemap listait des pages que la page elle-même refusait d'indexer.
  const [tours, catalogue] = await Promise.all([getGuidePublicTours(guide.id), getGuideTourSummaries(guide.id)]);
  // Un guide sans visite publiée n'a rien à faire dans un index.
  const published = guideSeoLocales(catalogue);
  const copy = GUIDE_COPY[locale];
  const bioSnippet = guide.bio ? guide.bio.slice(0, 150) : '';
  const description = copy.describe(guide.displayName, guide.city, bioSnippet, tours.length);
  const { alternates, robots } = seoAlternates({ sourcePath: `/guides/${guideSlug}`, locale, published });

  return {
    title: copy.title(guide.displayName, guide.city),
    description,
    alternates,
    ...(robots ? { robots } : {}),
    openGraph: {
      title: `${guide.displayName} | Murmure`,
      description,
      type: 'profile',
      siteName: 'Murmure',
      url: alternates.canonical as string,
      locale: LOCALE_FORMATS[locale].replace('-', '_'),
      ...(guide.photoUrl ? { images: [guide.photoUrl] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.twitterTitle(guide.displayName, guide.city),
      description,
    },
  };
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { guideSlug } = await params;
  return guideMetadata(guideSlug, 'fr');
}

export async function LocalizedGuidePage({ params, locale = 'fr' }: GuidePageProps & { locale?: GuideLocale }) {
  const { guideSlug } = await params;
  const guide = await getGuideBySlug(guideSlug);
  if (!guide) notFound();

  // Les langues proposables viennent de la même lecture que le sitemap et que
  // `guideMetadata` : une seule source décide de ce qui est publié.
  const [originalTours, catalogue] = await Promise.all([getGuidePublicTours(guide.id), getGuideTourSummaries(guide.id)]);
  const published = guideSeoLocales(catalogue);
  const signatureIds = new Set(originalTours.filter(tour => tour.title === guide.parcoursSignature).map(tour => tour.id));
  const tours = originalTours.map(tour => localizeTour(tour, locale));
  const copy = GUIDE_COPY[locale];
  const home = publicPath('/', locale);
  const tourHref = (tour: { citySlug: string; slug: string }) => publicPath(`/catalogue/${tour.citySlug}/${tour.slug}`, locale);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <LanguageSuggestion sourcePath={`/guides/${guideSlug}`} locale={locale} published={published} />
      <TrackPageView
        event={AnalyticsEvents.WEB_GUIDE_PROFILE_VIEW}
        properties={{ guide_id: guide.id, guide_city: guide.city, tour_count: tours.length }}
      />

      {/* Breadcrumb */}
      <nav className="text-body text-ink-60 mb-6" aria-label={copy.breadcrumb}>
        <Link href={home} className="hover:text-grenadine">{copy.home}</Link>
        <span className="mx-2">/</span>
        <Link href={publicPath('/catalogue', locale)} className="hover:text-grenadine">{copy.catalogue}</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{copy.guidePrefix} {guide.displayName}</span>
      </nav>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        {/* Photo */}
        {guide.photoUrl ? (
          <S3Image
            s3Key={guide.photoUrl}
            alt={copy.photoOf(guide.displayName)}
            className="w-48 h-48 flex-shrink-0 rounded-pill shadow-md ring-4 ring-paper"
            fallback={guide.displayName.charAt(0)}
            width={192}
            height={192}
            priority
          />
        ) : (
          <div className="w-48 h-48 flex-shrink-0 bg-grenadine-soft rounded-pill flex items-center justify-center text-grenadine font-bold text-h2">
            {guide.displayName.charAt(0)}
          </div>
        )}

        <div className="text-center md:text-left flex-1">
          <PageTitle className="mb-2">
            {guide.displayName}
          </PageTitle>

          <p className="text-ink-60 mb-4 flex items-center justify-center md:justify-start gap-1">
            <span aria-hidden="true">📍</span> {guide.city}
            {guide.verified && (
              <span className="ml-2 inline-flex items-center gap-1 text-grenadine text-body font-medium">
                <span aria-hidden="true">✓</span> {copy.verified}
              </span>
            )}
          </p>

          {/* Specialties */}
          {guide.specialties.length > 0 && (
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
              {guide.specialties.map((s) => (
                <span
                  key={s}
                  className="bg-grenadine-soft text-grenadine text-body px-3 py-1 rounded-pill"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Bio */}
          {guide.bio && (
            <p className="text-ink-80 leading-relaxed max-w-2xl">{guide.bio}</p>
          )}

          {/* Years of experience */}
          {guide.yearsExperience && (
            <p className="text-body text-ink-60 mt-3">{copy.since(guide.yearsExperience)}</p>
          )}

          {/* Languages */}
          {guide.languages.length > 0 && (
            <p className="text-body text-ink-60 mt-1">
              {copy.languages} {guide.languages.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-12 max-w-lg mx-auto md:mx-0">
        <div className="text-center p-4 bg-paper-soft rounded-xl">
          <p className="text-h5 font-bold text-ink">{tours.length}</p>
          <p className="text-body text-ink-60">{copy.tours}</p>
        </div>
        <div className="text-center p-4 bg-paper-soft rounded-xl">
          <p className="text-h5 font-bold text-ink">{guide.totalListens.toLocaleString(copy.numberLocale)}</p>
          <p className="text-body text-ink-60">{copy.listens}</p>
        </div>
        <div className="text-center p-4 bg-paper-soft rounded-xl">
          <p className="text-h5 font-bold text-ink">
            {guide.rating ? `${guide.rating}/5` : '-'}
          </p>
          <p className="text-body text-ink-60">{copy.averageRating}</p>
        </div>
      </div>

      {/* Visite signature */}
      {guide.parcoursSignature && (
        <div className="mb-8">
          <PageTitle as="h2" size="h5" className="mb-2">{copy.signature}</PageTitle>
          {tours
            .filter((t) => signatureIds.has(t.id))
            .map((tour) => (
              <Link
                key={tour.id}
                href={tourHref(tour)}
                className="block border-2 border-ocre bg-ocre-soft rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-ocre text-ink text-meta font-bold px-2 py-0.5 rounded-pill">
                    {copy.signatureBadge}
                  </span>
                  <h3 className="font-semibold text-ink">{tour.title}</h3>
                  <TourPriceBadge tour={tour} locale={locale} />
                </div>
                <p className="text-body text-ink-60">{tour.shortDescription}</p>
                {tour.metadataFallback && <p className="text-meta text-ink-60">{METADATA_FALLBACK_COPY[locale]}</p>}
                <p className="text-meta text-ink-60 mt-2">
                  {tour.duration} min &middot; {tour.distance} km &middot; {tour.poiCount} {copy.pois}
                </p>
              </Link>
            ))}
        </div>
      )}

      {/* Published Tours */}
      <div>
        <PageTitle as="h2" size="h5" className="mb-6">
          {tours.length > 0 ? copy.toursOf(guide.displayName) : copy.toursTitle}
        </PageTitle>

        {tours.length === 0 ? (
          <div className="text-center py-12 bg-paper-soft rounded-xl">
            <p className="text-ink-60">{copy.noTour}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map((tour, index) => (
              <Link
                key={tour.id}
                href={tourHref(tour)}
                className="block rounded-xl border border-line hover:shadow-md transition-shadow overflow-hidden"
                data-tour-position={index}
              >
                <div className="h-40 bg-grenadine-soft" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-ink">{tour.title}</h3>
                    <TourPriceBadge tour={tour} locale={locale} />
                  </div>
                  <p className="text-body text-ink-60 line-clamp-2 mb-3">{tour.shortDescription}</p>
                  {tour.metadataFallback && <p className="text-meta text-ink-60">{METADATA_FALLBACK_COPY[locale]}</p>}
                  <div className="flex items-center gap-3 text-meta text-ink-60">
                    <span>{tour.city}</span>
                    <span>&middot;</span>
                    <span>{tour.duration} min</span>
                    <span>&middot;</span>
                    <span>{tour.distance} km</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(guideJsonLd(guide, tours, locale)),
        }}
      />

      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            breadcrumbJsonLd([
              { name: copy.home, path: home },
              { name: copy.catalogue, path: publicPath('/catalogue', locale) },
              { name: `${copy.guidePrefix} ${guide.displayName}` },
            ]),
          ),
        }}
      />
    </div>
  );
}

export default async function GuideProfilePage(props: GuidePageProps) {
  return LocalizedGuidePage({ ...props, locale: 'fr' });
}
