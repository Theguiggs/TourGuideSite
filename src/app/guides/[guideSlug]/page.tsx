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

// Force dynamic rendering: server AppSync client reads cookies, incompatible with static ISR.
export const dynamic = 'force-dynamic';

interface GuidePageProps {
  params: Promise<{ guideSlug: string }>;
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { guideSlug } = await params;
  const guide = await getGuideBySlug(guideSlug);
  if (!guide) return {};

  const bioSnippet = guide.bio ? guide.bio.slice(0, 150) : '';
  const description = `${guide.displayName}, guide touristique a ${guide.city}. ${bioSnippet}. Decouvrez ses ${guide.tourCount ?? 0} parcours audio.`;

  return {
    title: `${guide.displayName} — Guide touristique a ${guide.city} | Murmure`,
    description,
    openGraph: {
      title: `${guide.displayName} | Murmure`,
      description,
      type: 'profile',
      ...(guide.photoUrl ? { images: [guide.photoUrl] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${guide.displayName} — Guide a ${guide.city}`,
      description,
    },
  };
}

export default async function GuideProfilePage({ params }: GuidePageProps) {
  const { guideSlug } = await params;
  const guide = await getGuideBySlug(guideSlug);
  if (!guide) notFound();

  const tours = await getGuidePublicTours(guide.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <TrackPageView
        event={AnalyticsEvents.WEB_GUIDE_PROFILE_VIEW}
        properties={{ guide_id: guide.id, guide_city: guide.city, tour_count: tours.length }}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-ink-60 mb-6" aria-label="Fil d'Ariane">
        <Link href="/" className="hover:text-grenadine">Accueil</Link>
        <span className="mx-2">/</span>
        <Link href="/catalogue" className="hover:text-grenadine">Catalogue</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">Guide: {guide.displayName}</span>
      </nav>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        {/* Photo */}
        {guide.photoUrl ? (
          <S3Image
            s3Key={guide.photoUrl}
            alt={`Photo de ${guide.displayName}`}
            className="w-48 h-48 flex-shrink-0 rounded-full shadow-md ring-4 ring-paper"
            fallback={guide.displayName.charAt(0)}
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
                <span aria-hidden="true">✓</span> Verifie
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
            <p className="text-sm text-ink-60 mt-3">
              Guide depuis {guide.yearsExperience} ans
            </p>
          )}

          {/* Languages */}
          {guide.languages.length > 0 && (
            <p className="text-sm text-ink-60 mt-1">
              Langues : {guide.languages.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-12 max-w-lg mx-auto md:mx-0">
        <div className="text-center p-4 bg-paper-soft rounded-xl">
          <p className="text-2xl font-bold text-ink">{tours.length}</p>
          <p className="text-sm text-ink-60">parcours</p>
        </div>
        <div className="text-center p-4 bg-paper-soft rounded-xl">
          <p className="text-2xl font-bold text-ink">{guide.totalListens.toLocaleString('fr-FR')}</p>
          <p className="text-sm text-ink-60">ecoutes</p>
        </div>
        <div className="text-center p-4 bg-paper-soft rounded-xl">
          <p className="text-2xl font-bold text-ink">
            {guide.rating ? `${guide.rating}/5` : '-'}
          </p>
          <p className="text-sm text-ink-60">note moyenne</p>
        </div>
      </div>

      {/* Parcours Signature */}
      {guide.parcoursSignature && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-ink mb-2">Parcours signature</h2>
          {tours
            .filter((t) => t.title === guide.parcoursSignature)
            .map((tour) => (
              <Link
                key={tour.id}
                href={`/catalogue/${tour.citySlug}/${tour.slug}`}
                className="block border-2 border-ocre bg-ocre-soft rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-ocre text-ocre text-xs font-bold px-2 py-0.5 rounded-full">
                    SIGNATURE
                  </span>
                  <h3 className="font-semibold text-ink">{tour.title}</h3>
                  <TourPriceBadge tour={tour} />
                </div>
                <p className="text-sm text-ink-60">{tour.shortDescription}</p>
                <p className="text-xs text-ink-40 mt-2">
                  {tour.duration} min &middot; {tour.distance} km &middot; {tour.poiCount} points d&apos;interet
                </p>
              </Link>
            ))}
        </div>
      )}

      {/* Published Tours */}
      <div>
        <h2 className="text-xl font-semibold text-ink mb-6">
          {tours.length > 0 ? `Parcours de ${guide.displayName}` : 'Parcours'}
        </h2>

        {tours.length === 0 ? (
          <div className="text-center py-12 bg-paper-soft rounded-xl">
            <p className="text-ink-60">Ce guide n&apos;a pas encore de parcours publie.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map((tour, index) => (
              <Link
                key={tour.id}
                href={`/catalogue/${tour.citySlug}/${tour.slug}`}
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
                  <div className="flex items-center gap-3 text-xs text-ink-40">
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
          __html: safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: guide.displayName,
            jobTitle: 'Guide touristique',
            description: guide.bio,
            ...(guide.photoUrl ? { image: guide.photoUrl } : {}),
            address: {
              '@type': 'PostalAddress',
              addressLocality: guide.city,
              addressCountry: 'FR',
            },
            knows: guide.specialties,
            knowsLanguage: guide.languages,
            makesOffer: tours.map((t) => ({
              '@type': 'Offer',
              name: t.title,
              description: t.shortDescription,
              url: `/catalogue/${t.citySlug}/${t.slug}`,
            })),
          }),
        }}
      />

      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Accueil', item: '/' },
              { '@type': 'ListItem', position: 2, name: 'Catalogue', item: '/catalogue' },
              { '@type': 'ListItem', position: 3, name: `Guide: ${guide.displayName}` },
            ],
          }),
        }}
      />
    </div>
  );
}
