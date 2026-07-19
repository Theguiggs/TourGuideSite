import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Button,
  Card,
  Chip,
  Eyebrow,
  PullQuote,
  tg,
} from '@murmure/design-system/web';
import { editorial } from '@murmure/design-system';
import { getCityAccent, type CityAccent } from '@/lib/cities/accent-map';
import { getTourBySlug, getCityBySlug } from '@/lib/api/tours-server';
import { getGuideSlugByGuideId } from '@/lib/api/guides-public-server';
import TrackPageView from '@/components/TrackPageView';
import SmartAppLink from '@/components/SmartAppLink';
import TourPurchaseCard from '@/components/checkout/tour-purchase-card';
import { S3Image } from '@/components/studio/s3-image';
import { AnalyticsEvents } from '@/lib/analytics';
import { isTourFree } from '@/lib/catalogue/tour-pricing';
import ItineraryList from './itinerary-list';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪',
};

const LANG_NAMES: Record<string, string> = {
  fr: 'Français', en: 'English', es: 'Español', it: 'Italiano', de: 'Deutsch',
};

const AUDIO_TYPE_LABELS = {
  fr: {
    recording: { icon: '🎤', label: 'Voix du guide' },
    tts: { icon: '🤖', label: 'Voix de synthèse' },
    mixed: { icon: '🔀', label: 'Mixte' },
  },
  en: {
    recording: { icon: '🎤', label: 'Guide recording' },
    tts: { icon: '🤖', label: 'Synthetic voice' },
    mixed: { icon: '🔀', label: 'Mixed' },
  },
} as const;

const DETAIL_COPY = {
  fr: {
    openInApp: 'Ouvrir dans Murmure', bestExperience: 'Pour la meilleure expérience audio immersive', open: 'Ouvrir',
    free: 'GRATUIT', yourGuide: 'Votre guide', verifiedGuide: 'Guide vérifié', viewProfile: 'Voir le profil →',
    audioByLanguage: 'Audio par langue', itinerary: 'Itinéraire', reviews: 'Avis', liveTour: 'Vivez cette visite',
    download: "Téléchargez Murmure pour profiter de l'expérience audio immersive complète.",
    duration: 'Durée', distance: 'Distance', stops: 'Étapes', completions: 'Completions', listen: "Écouter ce tour dans l'app",
  },
  en: {
    openInApp: 'Open in Murmure', bestExperience: 'For the best immersive audio experience', open: 'Open',
    free: 'FREE', yourGuide: 'Your guide', verifiedGuide: 'Verified guide', viewProfile: 'View profile →',
    audioByLanguage: 'Audio by language', itinerary: 'Itinerary', reviews: 'Reviews', liveTour: 'Experience this tour',
    download: 'Download Murmure for the complete immersive audio experience.',
    duration: 'Duration', distance: 'Distance', stops: 'Stops', completions: 'Completions', listen: 'Listen to this tour in the app',
  },
} as const;

// Story 4.4 — Cleanup: utilise `getCityAccent` de Story 4.3 (`lib/cities/accent-map`)
// au lieu du fallback local précédent. Hash-based fallback inclus pour villes inconnues.

function accentSoftColor(accent: CityAccent): string {
  switch (accent) {
    case 'grenadine': return tg.colors.grenadineSoft;
    case 'ocre':      return tg.colors.ocreSoft;
    case 'mer':       return tg.colors.merSoft;
    case 'olive':     return tg.colors.oliveSoft;
  }
}

function accentColor(accent: CityAccent): string {
  switch (accent) {
    case 'grenadine': return tg.colors.grenadine;
    case 'ocre':      return tg.colors.ocre;
    case 'mer':       return tg.colors.mer;
    case 'olive':     return tg.colors.olive;
  }
}

function formatRelativeDate(dateStr: string, locale: 'fr' | 'en'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return locale === 'en' ? 'Published today' : 'Publié aujourd\'hui';
  if (diffDays < 30) {
    return locale === 'en'
      ? `Published ${diffDays} day${diffDays > 1 ? 's' : ''} ago`
      : `Publié il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  }
  const month = date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', { month: 'long', year: 'numeric' });
  return locale === 'en' ? `Published in ${month}` : `Publié en ${month}`;
}

// Force dynamic rendering: server AppSync client reads cookies, incompatible with static ISR.
export const dynamic = 'force-dynamic';

interface TourPageProps {
  params: Promise<{ city: string; tourSlug: string }>;
  searchParams: Promise<{ source?: string; office?: string }>;
}

export async function generateMetadata({ params }: TourPageProps): Promise<Metadata> {
  const { city: citySlug, tourSlug } = await params;
  const tour = await getTourBySlug(citySlug, tourSlug);
  if (!tour) return {};

  const description =
    tour.shortDescription ||
    (tour.description ? tour.description.slice(0, 160) : 'Une visite à découvrir.');

  return {
    title: `${tour.title} · Murmure`,
    description,
    alternates: {
      canonical: `/catalogue/${citySlug}/${tourSlug}`,
      languages: {
        fr: `/catalogue/${citySlug}/${tourSlug}`,
        en: `/en/catalogue/${citySlug}/${tourSlug}`,
      },
    },
    openGraph: {
      title: `${tour.title} · Murmure`,
      description,
      type: 'article',
      images: [
        {
          url: `/og/tour/${citySlug}/${tourSlug}`,
          width: 1200,
          height: 630,
          alt: `${tour.title} — visite audio à ${tour.city}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tour.title} · Murmure`,
      description,
    },
  };
}

function StarRating({ rating, locale = 'fr' }: { rating: number; locale?: 'fr' | 'en' }) {
  return (
    <span style={{ color: tg.colors.ocre }} aria-label={locale === 'en' ? `${rating.toFixed(1)} stars out of 5` : `${rating.toFixed(1)} étoiles sur 5`}>
      {'★'.repeat(Math.round(rating))}
      {'☆'.repeat(5 - Math.round(rating))}
    </span>
  );
}

export async function LocalizedTourDetailPage({ params, searchParams, locale = 'fr' }: TourPageProps & {locale?: 'fr' | 'en'}) {
  const { city: citySlug, tourSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const tour = await getTourBySlug(citySlug, tourSlug);
  if (!tour) notFound();

  const [city, guideSlug] = await Promise.all([
    getCityBySlug(citySlug),
    getGuideSlugByGuideId(tour.guideId),
  ]);
  const isQrVisit = resolvedSearchParams.source === 'qr';
  const copy = DETAIL_COPY[locale];
  const catalogueBase = locale === 'en' ? '/en/catalogue' : '/catalogue';

  const accent = getCityAccent(citySlug);
  const heroBg = accentSoftColor(accent);
  const heroAccentFg = accentColor(accent);
  const cityName = city?.name || tour.city;

  const accroche =
    tour.shortDescription ||
    (tour.description ? tour.description.slice(0, 200) : 'Une visite à découvrir.');

  return (
    <div
      className="pb-24 md:pb-0"
      style={{ background: tg.colors.paper, minHeight: '100vh' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <TrackPageView
          event={isQrVisit ? AnalyticsEvents.WEB_QR_CODE_SCAN : AnalyticsEvents.WEB_TOUR_DETAIL_VIEW}
          properties={{
            tourId: tour.id,
            citySlug,
            ...(resolvedSearchParams.office ? { officeId: resolvedSearchParams.office } : {}),
          }}
        />

        {/* QR Smart Banner */}
        {isQrVisit && (
          <div
            className="rounded-2xl p-4 mb-8 flex items-center justify-between"
            style={{ background: tg.colors.ink, color: tg.colors.paper }}
          >
            <div>
              <p style={{ fontFamily: tg.fonts.sans, fontWeight: 700 }}>{copy.openInApp}</p>
              <p style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.caption, color: tg.colors.paperDeep }}>
                {copy.bestExperience}
              </p>
            </div>
            <SmartAppLink
              tourId={tour.id}
              className="font-bold px-6 py-2 rounded-full"
              style={{
                background: tg.colors.grenadine,
                color: tg.colors.paper,
                fontFamily: tg.fonts.sans,
              }}
            >
              {copy.open}
            </SmartAppLink>
          </div>
        )}

        {/* Breadcrumb */}
        <nav
          style={{
            ...tg.eyebrow,
            color: tg.colors.ink60,
            marginBottom: tg.space[5],
            fontFamily: tg.fonts.sans,
          }}
        >
          <Link href={catalogueBase} style={{ color: tg.colors.ink60 }}>
            Catalogue
          </Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <Link href={`${catalogueBase}/${citySlug}`} style={{ color: tg.colors.ink60 }}>
            {cityName}
          </Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: tg.colors.ink }}>{tour.title}</span>
        </nav>
      </div>

      {/* HERO color-block ville */}
      <section
        style={{
          background: heroBg,
          paddingTop: tg.space[10],
          paddingBottom: tg.space[10],
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Eyebrow style={{ color: heroAccentFg, marginBottom: tg.space[4] }}>
                {cityName} · {tour.duration} min
              </Eyebrow>

              <div
                className="flex items-start justify-between gap-4"
                style={{ marginBottom: tg.space[4] }}
              >
                <h1
                  style={{
                    fontFamily: tg.fonts.display,
                    fontSize: tg.fontSize.h2,
                    lineHeight: 1.05,
                    letterSpacing: tg.tracking.display,
                    color: tg.colors.ink,
                    margin: 0,
                  }}
                >
                  {tour.title}
                </h1>
                {isTourFree(tour) && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      borderRadius: tg.radius.pill,
                      background: tg.colors.oliveSoft,
                      color: tg.colors.olive,
                      fontFamily: tg.fonts.sans,
                      fontSize: tg.fontSize.meta,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copy.free}
                  </span>
                )}
              </div>

              <PullQuote size="md" style={{ marginBottom: tg.space[6], maxWidth: 640 }}>
                « {accroche} »
              </PullQuote>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2" style={{ marginBottom: tg.space[5] }}>
                <Chip color="default">{tour.duration} min</Chip>
                <Chip color="default">{tour.poiCount} étapes</Chip>
                {typeof tour.distance === 'number' && tour.distance > 0 && (
                  <Chip color="default">{tour.distance} km</Chip>
                )}
                {tour.availableLanguages && tour.availableLanguages.length > 0 && (
                  <span
                    data-testid="tour-detail-lang-flags"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: tg.radius.pill,
                      border: `1px solid ${tg.colors.ink20}`,
                      fontFamily: tg.fonts.sans,
                      fontSize: tg.fontSize.meta,
                      color: tg.colors.ink,
                    }}
                  >
                    {tour.availableLanguages.slice(0, 5).map((lang) => (
                      <span key={lang} title={lang.toUpperCase()}>{LANG_FLAGS[lang] ?? lang}</span>
                    ))}
                    {tour.availableLanguages.length > 5 && (
                      <span style={{ color: tg.colors.ink60 }}>+{tour.availableLanguages.length - 5}</span>
                    )}
                  </span>
                )}
              </div>

              {tour.createdAt && (
                <div
                  data-testid="tour-detail-date"
                  style={{
                    fontFamily: tg.fonts.sans,
                    fontSize: tg.fontSize.caption,
                    color: tg.colors.ink60,
                  }}
                >
                  {formatRelativeDate(tour.createdAt, locale)}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CONTENU PRINCIPAL */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Guide info — "Votre guide" showcase card */}
            {(() => {
              const avatar = tour.guidePhotoUrl ? (
                <S3Image
                  s3Key={tour.guidePhotoUrl}
                  alt={locale === 'en' ? `Photo of ${tour.guideName}` : `Photo de ${tour.guideName}`}
                  className="w-16 h-16 rounded-full shrink-0"
                  fallback={tour.guideName.charAt(0)}
                />
              ) : (
                <div
                  className="shrink-0"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: tg.radius.pill,
                    background: heroBg,
                    color: heroAccentFg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: tg.fonts.display,
                    fontSize: tg.fontSize.h5,
                  }}
                >
                  {tour.guideName.charAt(0)}
                </div>
              );
              const bioSnippet = tour.guideBio
                ? tour.guideBio.length > 120
                  ? `${tour.guideBio.slice(0, 120).trimEnd()}…`
                  : tour.guideBio
                : null;
              const inner = (
                <>
                  {avatar}
                  <div className="min-w-0">
                    <p style={{ fontFamily: tg.fonts.sans, margin: 0, fontSize: tg.fontSize.meta, color: tg.colors.ink60, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {copy.yourGuide}
                    </p>
                    <p className="flex items-center gap-1.5" style={{ fontFamily: tg.fonts.display, fontSize: tg.fontSize.h6, fontWeight: 600, color: tg.colors.ink, margin: '2px 0 0' }}>
                      {tour.guideName}
                      {tour.guideVerified && (
                        <span title={copy.verifiedGuide} style={{ color: tg.colors.grenadine, fontSize: tg.fontSize.caption }}>✓</span>
                      )}
                    </p>
                    {bioSnippet && (
                      <p className="line-clamp-2" style={{ fontFamily: tg.fonts.editorial, fontStyle: 'italic', fontSize: tg.fontSize.caption, color: tg.colors.ink80, margin: '4px 0 0' }}>
                        « {bioSnippet} »
                      </p>
                    )}
                    {guideSlug && (
                      <p style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.caption, color: tg.colors.grenadine, fontWeight: 600, margin: '6px 0 0' }}>
                        {copy.viewProfile}
                      </p>
                    )}
                  </div>
                </>
              );
              return guideSlug ? (
                <Link
                  href={`/guides/${guideSlug}`}
                  className="flex items-start gap-4 mb-8 p-4 rounded-2xl transition-shadow hover:shadow-md"
                  style={{ background: tg.colors.paperSoft }}
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex items-start gap-4 mb-8 p-4 rounded-2xl" style={{ background: tg.colors.paperSoft }}>
                  {inner}
                </div>
              );
            })()}

            {/* Description */}
            <div className="mb-10">
              <h2
                style={{
                  fontFamily: tg.fonts.display,
                  fontSize: tg.fontSize.h4,
                  letterSpacing: tg.tracking.display,
                  color: tg.colors.ink,
                  marginBottom: tg.space[4],
                }}
              >
                Description
              </h2>
              <p
                style={{
                  fontFamily: tg.fonts.sans,
                  fontSize: tg.fontSize.bodyLg,
                  color: tg.colors.ink80,
                  lineHeight: 1.6,
                }}
              >
                {tour.description}
              </p>
            </div>

            {/* Audio par langue */}
            {tour.languageAudioTypes && Object.keys(tour.languageAudioTypes).length > 0 && (
              <div className="mb-10">
                <h2
                  style={{
                    fontFamily: tg.fonts.display,
                    fontSize: tg.fontSize.h4,
                    letterSpacing: tg.tracking.display,
                    color: tg.colors.ink,
                    marginBottom: tg.space[4],
                  }}
                >
                  {copy.audioByLanguage}
                </h2>
                <div className="space-y-2">
                  {Object.entries(tour.languageAudioTypes)
                    .filter(([lang]) => ['fr', 'en', 'es', 'de', 'it'].includes(lang))
                    .map(([lang, type]) => {
                    const labels = AUDIO_TYPE_LABELS[locale];
                    const info = labels[type as keyof typeof labels] ?? labels.mixed;
                    return (
                      <div
                        key={lang}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: tg.colors.paperSoft }}
                      >
                        <span
                          style={{
                            fontFamily: tg.fonts.sans,
                            fontWeight: 600,
                            color: tg.colors.ink,
                          }}
                        >
                          {LANG_FLAGS[lang] ?? ''} {LANG_NAMES[lang] ?? lang.toUpperCase()}
                        </span>
                        <span
                          style={{
                            fontFamily: tg.fonts.sans,
                            fontSize: tg.fontSize.caption,
                            color: tg.colors.ink60,
                          }}
                        >
                          {info.icon} {info.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Itinéraire — étapes numérotées */}
            <div className="mb-10">
              <h2
                style={{
                  fontFamily: tg.fonts.display,
                  fontSize: tg.fontSize.h4,
                  letterSpacing: tg.tracking.display,
                  color: tg.colors.ink,
                  marginBottom: tg.space[6],
                }}
              >
                {copy.itinerary}
              </h2>
              <ItineraryList
                pois={tour.pois}
                tourId={tour.id}
                isFree={isTourFree(tour)}
                heroAccentFg={heroAccentFg}
                locale={locale}
              />
            </div>

            {/* Reviews */}
            <div>
              <h2
                style={{
                  fontFamily: tg.fonts.display,
                  fontSize: tg.fontSize.h4,
                  letterSpacing: tg.tracking.display,
                  color: tg.colors.ink,
                  marginBottom: tg.space[4],
                }}
              >
                {copy.reviews} ({tour.reviewCount})
                {tour.averageRating > 0 && (
                  <span
                    style={{
                      marginLeft: tg.space[3],
                      fontFamily: tg.fonts.sans,
                      fontSize: tg.fontSize.bodyLg,
                      fontWeight: 400,
                    }}
                  >
                    <StarRating rating={tour.averageRating} locale={locale} /> {tour.averageRating.toFixed(1)}
                  </span>
                )}
              </h2>
              <div className="space-y-4">
                {tour.reviews.slice(0, 5).map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl p-4"
                    style={{ border: `1px solid ${tg.colors.line}` }}
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{ marginBottom: tg.space[2] }}
                    >
                      <StarRating rating={review.rating} locale={locale} />
                      <span
                        style={{
                          fontFamily: tg.fonts.sans,
                          fontSize: tg.fontSize.caption,
                          color: tg.colors.ink60,
                        }}
                      >
                        {new Date(review.createdAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR')}
                      </span>
                    </div>
                    {review.comment && (
                      <p style={{ fontFamily: tg.fonts.sans, color: tg.colors.ink80, margin: 0 }}>
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar — CTA principal desktop */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card variant="md">
                <Card.Body>
                  <Eyebrow style={{ color: heroAccentFg, marginBottom: tg.space[3] }}>
                    {copy.liveTour}
                  </Eyebrow>
                  <p
                    style={{
                      fontFamily: tg.fonts.sans,
                      fontSize: tg.fontSize.body,
                      color: tg.colors.ink80,
                      lineHeight: 1.5,
                      marginBottom: tg.space[5],
                    }}
                  >
                    {copy.download}
                  </p>

                  <SmartAppLink
                    tourId={tour.id}
                    className="hidden md:block"
                    style={{ display: 'block', textDecoration: 'none' }}
                  >
                    <Button variant="accent" size="lg" fullWidth>
                      {locale === 'en' ? 'Listen in the app' : editorial.cta.listen}
                    </Button>
                  </SmartAppLink>

                  {/* mon-1.3b — web sale CTA for individually-priced tours */}
                  {tour.purchaseType === 'paid' && (
                    <TourPurchaseCard
                      tourId={tour.id}
                      title={tour.title}
                      priceCents={tour.priceCents}
                      locale={locale}
                    />
                  )}

                  <div
                    style={{
                      marginTop: tg.space[6],
                      paddingTop: tg.space[6],
                      borderTop: `1px solid ${tg.colors.line}`,
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Eyebrow style={{ color: tg.colors.ink60 }}>{copy.duration}</Eyebrow>
                        <span style={{ fontFamily: tg.fonts.sans, fontWeight: 600, color: tg.colors.ink }}>
                          {tour.duration} min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <Eyebrow style={{ color: tg.colors.ink60 }}>{copy.distance}</Eyebrow>
                        <span style={{ fontFamily: tg.fonts.sans, fontWeight: 600, color: tg.colors.ink }}>
                          {tour.distance} km
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <Eyebrow style={{ color: tg.colors.ink60 }}>{copy.stops}</Eyebrow>
                        <span style={{ fontFamily: tg.fonts.sans, fontWeight: 600, color: tg.colors.ink }}>
                          {tour.poiCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <Eyebrow style={{ color: tg.colors.ink60 }}>{copy.completions}</Eyebrow>
                        <span style={{ fontFamily: tg.fonts.sans, fontWeight: 600, color: tg.colors.ink }}>
                          {tour.completionCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA mobile */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          padding: tg.space[4],
          background: tg.colors.paper,
          borderTop: `1px solid ${tg.colors.line}`,
        }}
      >
        <SmartAppLink
          tourId={tour.id}
          style={{ display: 'block', textDecoration: 'none' }}
          aria-label={copy.listen}
        >
          <Button variant="accent" size="lg" fullWidth>
            {locale === 'en' ? 'Listen in the app' : editorial.cta.listen}
          </Button>
        </SmartAppLink>
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

export default async function TourDetailPage(props: TourPageProps) {
  return LocalizedTourDetailPage({...props, locale: 'fr'});
}
