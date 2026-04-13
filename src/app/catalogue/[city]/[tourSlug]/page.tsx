import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTourBySlug, getCityBySlug, getAllTours } from '@/lib/api/tours-server';
import { getGuideSlugByGuideId } from '@/lib/api/guides-public';
import TrackPageView from '@/components/TrackPageView';
import SmartAppLink from '@/components/SmartAppLink';
import { AnalyticsEvents } from '@/lib/analytics';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪',
};

const LANG_NAMES: Record<string, string> = {
  fr: 'Français', en: 'English', es: 'Español', it: 'Italiano', de: 'Deutsch',
};

const AUDIO_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  recording: { icon: '🎤', label: 'Voix du guide' },
  tts: { icon: '🤖', label: 'Voix de synthèse' },
  mixed: { icon: '🔀', label: 'Mixte' },
};

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'Publié aujourd\'hui';
  if (diffDays < 30) return `Publié il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  const month = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `Publié en ${month}`;
}

export const revalidate = 300; // ISR: 5 minutes

interface TourPageProps {
  params: Promise<{ city: string; tourSlug: string }>;
  searchParams: Promise<{ source?: string; office?: string }>;
}

export async function generateStaticParams() {
  const tours = await getAllTours();
  return tours.map((tour) => ({
    city: tour.citySlug,
    tourSlug: tour.slug,
  }));
}

export async function generateMetadata({ params }: TourPageProps): Promise<Metadata> {
  const { city: citySlug, tourSlug } = await params;
  const tour = await getTourBySlug(citySlug, tourSlug);
  if (!tour) return {};

  return {
    title: `${tour.title} — Visite guidee audio a ${tour.city}`,
    description: tour.shortDescription,
    openGraph: {
      title: `${tour.title} | TourGuide`,
      description: tour.shortDescription,
      type: 'article',
    },
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating.toFixed(1)} etoiles sur 5`}>
      {'★'.repeat(Math.round(rating))}
      {'☆'.repeat(5 - Math.round(rating))}
    </span>
  );
}

export default async function TourDetailPage({ params, searchParams }: TourPageProps) {
  const { city: citySlug, tourSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const tour = await getTourBySlug(citySlug, tourSlug);
  if (!tour) notFound();

  const [city, guideSlug] = await Promise.all([
    getCityBySlug(citySlug),
    getGuideSlugByGuideId(tour.guideId),
  ]);
  const isQrVisit = resolvedSearchParams.source === 'qr';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <TrackPageView
        event={isQrVisit ? AnalyticsEvents.WEB_QR_CODE_SCAN : AnalyticsEvents.WEB_TOUR_DETAIL_VIEW}
        properties={{ tourId: tour.id, citySlug, ...(resolvedSearchParams.office ? { officeId: resolvedSearchParams.office } : {}) }}
      />
      {/* QR Smart Banner */}
      {isQrVisit && (
        <div className="bg-teal-700 text-white rounded-xl p-4 mb-8 flex items-center justify-between">
          <div>
            <p className="font-semibold">Ouvrir dans TourGuide</p>
            <p className="text-teal-100 text-sm">Pour la meilleure experience audio immersive</p>
          </div>
          <SmartAppLink
            tourId={tour.id}
            className="bg-amber-500 text-gray-900 font-bold px-6 py-2 rounded-lg hover:bg-amber-400"
          >
            Ouvrir
          </SmartAppLink>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/catalogue" className="hover:text-teal-700">Catalogue</Link>
        <span className="mx-2">/</span>
        <Link href={`/catalogue/${citySlug}`} className="hover:text-teal-700">
          {city?.name || tour.city}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{tour.title}</span>
      </nav>

      {/* Tour Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{tour.title}</h1>
            {tour.isFree && (
              <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full">
                GRATUIT
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-gray-500 text-sm mb-3">
            <span>{tour.city}</span>
            <span>&middot;</span>
            <span>{tour.duration} min</span>
            <span>&middot;</span>
            <span>{tour.distance} km</span>
            <span>&middot;</span>
            <span>{tour.poiCount} points d&apos;interet</span>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-500 mb-6">
            {tour.availableLanguages && tour.availableLanguages.length > 0 && (
              <div className="inline-flex gap-1" data-testid="tour-detail-lang-flags">
                {tour.availableLanguages.slice(0, 5).map((lang) => (
                  <span key={lang} title={lang.toUpperCase()}>{LANG_FLAGS[lang] ?? lang}</span>
                ))}
                {tour.availableLanguages.length > 5 && (
                  <span className="text-xs text-gray-400">+{tour.availableLanguages.length - 5}</span>
                )}
              </div>
            )}
            {tour.createdAt && (
              <span data-testid="tour-detail-date">{formatRelativeDate(tour.createdAt)}</span>
            )}
          </div>

          {/* Guide info */}
          {guideSlug ? (
            <Link
              href={`/guides/${guideSlug}`}
              className="flex items-center gap-3 mb-8 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg">
                {tour.guideName.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{tour.guideName}</p>
                <p className="text-sm text-gray-500">Guide local &middot; Voir le profil</p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3 mb-8 p-4 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg">
                {tour.guideName.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{tour.guideName}</p>
                <p className="text-sm text-gray-500">Guide local</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="prose prose-gray max-w-none mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-gray-700 leading-relaxed">{tour.description}</p>
          </div>

          {/* Audio par langue */}
          {tour.languageAudioTypes && Object.keys(tour.languageAudioTypes).length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Audio par langue</h2>
              <div className="space-y-2">
                {Object.entries(tour.languageAudioTypes).map(([lang, type]) => {
                  const info = AUDIO_TYPE_LABELS[type] ?? AUDIO_TYPE_LABELS.mixed;
                  return (
                    <div key={lang} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">
                        {LANG_FLAGS[lang] ?? ''} {LANG_NAMES[lang] ?? lang.toUpperCase()}
                      </span>
                      <span className={`text-sm ${type === 'recording' ? 'text-blue-600' : type === 'tts' ? 'text-purple-600' : 'text-gray-500'}`}>
                        {info.icon} {info.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* POI List */}
          {tour.pois.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Points d&apos;interet</h2>
              <ol className="space-y-3">
                {tour.pois.map((poi) => (
                  <li key={poi.id} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-sm font-bold">
                      {poi.order}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{poi.title}</p>
                      <p className="text-sm text-gray-500">{poi.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Avis ({tour.reviewCount})
              {tour.averageRating > 0 && (
                <span className="ml-2 text-base font-normal">
                  <StarRating rating={tour.averageRating} /> {tour.averageRating.toFixed(1)}
                </span>
              )}
            </h2>
            <div className="space-y-4">
              {tour.reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={review.rating} />
                    <span className="text-sm text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {review.comment && <p className="text-gray-700">{review.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar — Download CTA */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Vivez cette visite</h3>
            <p className="text-gray-600 text-sm mb-6">
              Telechargez TourGuide pour profiter de l&apos;experience audio immersive complete.
            </p>

            <a
              href={process.env.NEXT_PUBLIC_APP_STORE_ANDROID || '#'}
              className="block w-full text-center bg-teal-700 text-white font-bold py-3 rounded-xl hover:bg-teal-800 mb-3"
            >
              Telecharger sur Android
            </a>
            <a
              href={process.env.NEXT_PUBLIC_APP_STORE_IOS || '#'}
              className="block w-full text-center border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50"
            >
              Telecharger sur iOS
            </a>

            <div className="mt-6 pt-6 border-t border-gray-100 text-sm text-gray-500 space-y-2">
              <div className="flex justify-between">
                <span>Duree</span>
                <span className="font-medium text-gray-900">{tour.duration} min</span>
              </div>
              <div className="flex justify-between">
                <span>Distance</span>
                <span className="font-medium text-gray-900">{tour.distance} km</span>
              </div>
              <div className="flex justify-between">
                <span>Points d&apos;interet</span>
                <span className="font-medium text-gray-900">{tour.poiCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Completions</span>
                <span className="font-medium text-gray-900">{tour.completionCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'TouristAttraction',
            name: tour.title,
            description: tour.shortDescription,
            address: {
              '@type': 'PostalAddress',
              addressLocality: tour.city,
              addressCountry: 'FR',
            },
            aggregateRating:
              tour.reviewCount > 0
                ? {
                    '@type': 'AggregateRating',
                    ratingValue: tour.averageRating,
                    reviewCount: tour.reviewCount,
                  }
                : undefined,
          }),
        }}
      />
    </div>
  );
}
