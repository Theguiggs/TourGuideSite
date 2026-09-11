import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getGuideBySlug,
  getGuidePublicTours,
} from '@/lib/api/guides-public-server';
import TrackPageView from '@/components/TrackPageView';
import { S3Image } from '@/components/studio/s3-image';
import { TourPriceBadge } from '@/components/catalogue/tour-price-badge';
import { AnalyticsEvents } from '@/lib/analytics';
import { safeJsonLd } from '@/lib/security/safe-json-ld';
import { breadcrumbJsonLd, guideJsonLd } from '@/lib/seo/json-ld';

// Force dynamic rendering: server AppSync client reads cookies, incompatible with static ISR.
export const dynamic = 'force-dynamic';

interface GuidePageProps {
  params: Promise<{ guideSlug: string }>;
}

type GuideLocale = 'fr' | 'en';

/** Copie FR/EN de la page guide — une seule page, deux langues (lot 3.3). */
const GUIDE_COPY = {
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
} as const;

export async function guideMetadata(guideSlug: string, locale: GuideLocale): Promise<Metadata> {
  const guide = await getGuideBySlug(guideSlug);
  if (!guide) return {};
  const copy = GUIDE_COPY[locale];
  const bioSnippet = guide.bio ? guide.bio.slice(0, 150) : '';
  const description = copy.describe(guide.displayName, guide.city, bioSnippet, guide.tourCount ?? 0);
  const frPath = `/guides/${guideSlug}`;
  const enPath = `/en/guides/${guideSlug}`;

  return {
    title: copy.title(guide.displayName, guide.city),
    description,
    alternates: {
      canonical: locale === 'en' ? enPath : frPath,
      languages: { fr: frPath, en: enPath },
    },
    openGraph: {
      title: `${guide.displayName} | Murmure`,
      description,
      type: 'profile',
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
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

  const tours = await getGuidePublicTours(guide.id);
  const copy = GUIDE_COPY[locale];
  const base = locale === 'en' ? '/en' : '';
  const tourHref = (tour: { citySlug: string; slug: string }) => `${base}/catalogue/${tour.citySlug}/${tour.slug}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <TrackPageView
        event={AnalyticsEvents.WEB_GUIDE_PROFILE_VIEW}
        properties={{ guide_id: guide.id, guide_city: guide.city, tour_count: tours.length }}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-ink-60 mb-6" aria-label={copy.breadcrumb}>
        <Link href={base || '/'} className="hover:text-grenadine">{copy.home}</Link>
        <span className="mx-2">/</span>
        <Link href={`${base}/catalogue`} className="hover:text-grenadine">{copy.catalogue}</Link>
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
            className="w-48 h-48 flex-shrink-0 rounded-full shadow-md ring-4 ring-paper"
            fallback={guide.displayName.charAt(0)}
            width={192}
            height={192}
            priority
          />
        ) : (
          <div className="w-48 h-48 flex-shrink-0 bg-grenadine-soft rounded-full flex items-center justify-center text-grenadine font-bold text-6xl">
            {guide.displayName.charAt(0)}
          </div>
        )}

        <div className="text-center md:text-left flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-ink mb-2">
            {guide.displayName}
          </h1>

          <p className="text-ink-60 mb-4 flex items-center justify-center md:justify-start gap-1">
            <span aria-hidden="true">📍</span> {guide.city}
            {guide.verified && (
              <span className="ml-2 inline-flex items-center gap-1 text-grenadine text-sm font-medium">
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
                  className="bg-grenadine-soft text-grenadine text-sm px-3 py-1 rounded-full"
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
            <p className="text-sm text-ink-60 mt-3">{copy.since(guide.yearsExperience)}</p>
          )}

          {/* Languages */}
          {guide.languages.length > 0 && (
            <p className="text-sm text-ink-60 mt-1">
              {copy.languages} {guide.languages.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-12 max-w-lg mx-auto md:mx-0">
        <div className="text-center p-4 bg-paper-soft rounded-xl">
          <p className="text-2xl font-bold text-ink">{tours.length}</p>
          <p className="text-sm text-ink-60">{copy.tours}</p>
        </div>
        <div className="text-center p-4 bg-paper-soft rounded-xl">
          <p className="text-2xl font-bold text-ink">{guide.totalListens.toLocaleString(copy.numberLocale)}</p>
          <p className="text-sm text-ink-60">{copy.listens}</p>
        </div>
        <div className="text-center p-4 bg-paper-soft rounded-xl">
          <p className="text-2xl font-bold text-ink">
            {guide.rating ? `${guide.rating}/5` : '-'}
          </p>
          <p className="text-sm text-ink-60">{copy.averageRating}</p>
        </div>
      </div>

      {/* Visite signature */}
      {guide.parcoursSignature && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-ink mb-2">{copy.signature}</h2>
          {tours
            .filter((t) => t.title === guide.parcoursSignature)
            .map((tour) => (
              <Link
                key={tour.id}
                href={tourHref(tour)}
                className="block border-2 border-ocre bg-ocre-soft rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-ocre text-ink text-xs font-bold px-2 py-0.5 rounded-full">
                    {copy.signatureBadge}
                  </span>
                  <h3 className="font-semibold text-ink">{tour.title}</h3>
                  <TourPriceBadge tour={tour} />
                </div>
                <p className="text-sm text-ink-60">{tour.shortDescription}</p>
                <p className="text-xs text-ink-60 mt-2">
                  {tour.duration} min &middot; {tour.distance} km &middot; {tour.poiCount} {copy.pois}
                </p>
              </Link>
            ))}
        </div>
      )}

      {/* Published Tours */}
      <div>
        <h2 className="text-xl font-semibold text-ink mb-6">
          {tours.length > 0 ? copy.toursOf(guide.displayName) : copy.toursTitle}
        </h2>

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
                    <TourPriceBadge tour={tour} />
                  </div>
                  <p className="text-sm text-ink-60 line-clamp-2 mb-3">{tour.shortDescription}</p>
                  <div className="flex items-center gap-3 text-xs text-ink-60">
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
          __html: safeJsonLd(guideJsonLd(guide, tours)),
        }}
      />

      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            breadcrumbJsonLd([
              { name: copy.home, path: base || '/' },
              { name: copy.catalogue, path: `${base}/catalogue` },
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
