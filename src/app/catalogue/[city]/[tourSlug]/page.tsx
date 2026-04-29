import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Button,
  Card,
  Chip,
  Eyebrow,
  NumberMark,
  PullQuote,
  tg,
} from '@tourguide/design-system/web';
import { editorial } from '@tourguide/design-system';
import { getCityAccent, type CityAccent } from '@/lib/cities/accent-map';
import { getTourBySlug, getCityBySlug } from '@/lib/api/tours-server';
import { getGuideSlugByGuideId } from '@/lib/api/guides-public-server';
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
    title: `${tour.title} · TourGuide`,
    description,
    openGraph: {
      title: `${tour.title} · TourGuide`,
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
      title: `${tour.title} · TourGuide`,
      description,
    },
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: tg.colors.ocre }} aria-label={`${rating.toFixed(1)} étoiles sur 5`}>
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
              <p style={{ fontFamily: tg.fonts.sans, fontWeight: 700 }}>Ouvrir dans TourGuide</p>
              <p style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.caption, color: tg.colors.paperDeep }}>
                Pour la meilleure expérience audio immersive
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
              Ouvrir
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
          <Link href="/catalogue" style={{ color: tg.colors.ink60 }}>
            Catalogue
          </Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <Link href={`/catalogue/${citySlug}`} style={{ color: tg.colors.ink60 }}>
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
                {tour.isFree && (
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
                    GRATUIT
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
                  {formatRelativeDate(tour.createdAt)}
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
            {/* Guide info */}
            {guideSlug ? (
              <Link
                href={`/guides/${guideSlug}`}
                className="flex items-center gap-3 mb-8 p-4 rounded-2xl"
                style={{ background: tg.colors.paperSoft }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: tg.radius.pill,
                    background: heroBg,
                    color: heroAccentFg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: tg.fonts.display,
                    fontSize: tg.fontSize.h6,
                  }}
                >
                  {tour.guideName.charAt(0)}
                </div>
                <div>
                  <p style={{ fontFamily: tg.fonts.sans, fontWeight: 600, color: tg.colors.ink, margin: 0 }}>
                    {tour.guideName}
                  </p>
                  <p style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.caption, color: tg.colors.ink60, margin: 0 }}>
                    Guide local · Voir le profil
                  </p>
                </div>
              </Link>
            ) : (
              <div
                className="flex items-center gap-3 mb-8 p-4 rounded-2xl"
                style={{ background: tg.colors.paperSoft }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: tg.radius.pill,
                    background: heroBg,
                    color: heroAccentFg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: tg.fonts.display,
                    fontSize: tg.fontSize.h6,
                  }}
                >
                  {tour.guideName.charAt(0)}
                </div>
                <div>
                  <p style={{ fontFamily: tg.fonts.sans, fontWeight: 600, color: tg.colors.ink, margin: 0 }}>
                    {tour.guideName}
                  </p>
                  <p style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.caption, color: tg.colors.ink60, margin: 0 }}>
                    Guide local
                  </p>
                </div>
              </div>
            )}

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
                  Audio par langue
                </h2>
                <div className="space-y-2">
                  {Object.entries(tour.languageAudioTypes).map(([lang, type]) => {
                    const info = AUDIO_TYPE_LABELS[type] ?? AUDIO_TYPE_LABELS.mixed;
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
                Itinéraire
              </h2>
              {tour.pois.length === 0 ? (
                <Eyebrow style={{ color: tg.colors.ink60 }}>
                  Itinéraire en cours de finalisation
                </Eyebrow>
              ) : (
                <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {tour.pois.map((poi) => (
                    <li
                      key={poi.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: tg.space[5],
                        marginBottom: tg.space[6],
                      }}
                    >
                      <div style={{ flexShrink: 0, minWidth: 56 }}>
                        <NumberMark n={poi.order} color={heroAccentFg} size={tg.fontSize.h3} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5
                          style={{
                            fontFamily: tg.fonts.display,
                            fontSize: tg.fontSize.h5,
                            color: tg.colors.ink,
                            margin: 0,
                            marginBottom: tg.space[1],
                          }}
                        >
                          {poi.title}
                        </h5>
                        {poi.description && (
                          <p
                            style={{
                              fontFamily: tg.fonts.sans,
                              fontSize: tg.fontSize.body,
                              color: tg.colors.ink80,
                              lineHeight: 1.5,
                              margin: 0,
                            }}
                          >
                            {poi.description}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
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
                Avis ({tour.reviewCount})
                {tour.averageRating > 0 && (
                  <span
                    style={{
                      marginLeft: tg.space[3],
                      fontFamily: tg.fonts.sans,
                      fontSize: tg.fontSize.bodyLg,
                      fontWeight: 400,
                    }}
                  >
                    <StarRating rating={tour.averageRating} /> {tour.averageRating.toFixed(1)}
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
                      <StarRating rating={review.rating} />
                      <span
                        style={{
                          fontFamily: tg.fonts.sans,
                          fontSize: tg.fontSize.caption,
                          color: tg.colors.ink60,
                        }}
                      >
                        {new Date(review.createdAt).toLocaleDateString('fr-FR')}
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
                    Vivez cette visite
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
                    Téléchargez TourGuide pour profiter de l&apos;expérience audio immersive complète.
                  </p>

                  <SmartAppLink
                    tourId={tour.id}
                    className="hidden md:block"
                    style={{ display: 'block', textDecoration: 'none' }}
                  >
                    <Button variant="accent" size="lg" fullWidth>
                      {editorial.cta.listen}
                    </Button>
                  </SmartAppLink>

                  <div
                    style={{
                      marginTop: tg.space[6],
                      paddingTop: tg.space[6],
                      borderTop: `1px solid ${tg.colors.line}`,
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Eyebrow style={{ color: tg.colors.ink60 }}>Durée</Eyebrow>
                        <span style={{ fontFamily: tg.fonts.sans, fontWeight: 600, color: tg.colors.ink }}>
                          {tour.duration} min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <Eyebrow style={{ color: tg.colors.ink60 }}>Distance</Eyebrow>
                        <span style={{ fontFamily: tg.fonts.sans, fontWeight: 600, color: tg.colors.ink }}>
                          {tour.distance} km
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <Eyebrow style={{ color: tg.colors.ink60 }}>Étapes</Eyebrow>
                        <span style={{ fontFamily: tg.fonts.sans, fontWeight: 600, color: tg.colors.ink }}>
                          {tour.poiCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <Eyebrow style={{ color: tg.colors.ink60 }}>Completions</Eyebrow>
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
          aria-label="Écouter ce tour dans l'app"
        >
          <Button variant="accent" size="lg" fullWidth>
            {editorial.cta.listen}
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
