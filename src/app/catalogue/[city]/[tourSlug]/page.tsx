import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate, extendCopy } from '@/lib/i18n/translate';
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
import { getCityAccent, type CityAccent } from '@/lib/cities/accent-map';
import { getTourBySlug, getCityBySlug } from '@/lib/api/tours-server';
import { getGuideSlugByGuideId } from '@/lib/api/guides-public-server';
import TrackPageView from '@/components/TrackPageView';
import SmartAppLink from '@/components/SmartAppLink';
import TourPurchaseCard from '@/components/checkout/tour-purchase-card';
import ForfaitPurchaseCard from '@/components/checkout/forfait-purchase-card';
import { AiDisclosureBadge } from '@/components/catalogue/ai-disclosure-badge';
// Depuis le module nu, pas depuis le baril : un composant serveur qui importe
// une constante d'un module `'use client'` reçoit une référence de client.
import { PURCHASE_ANCHOR_ID } from '@/components/catalogue/scene-player/purchase-anchor';
import { S3Image } from '@/components/studio/s3-image';
import { AnalyticsEvents } from '@/lib/analytics';
import { isTourFree } from '@/lib/catalogue/tour-pricing';
import {
  audioSourceLabel,
  displayedAudioSource,
  displayedLanguages,
  humanVoiceLabel,
  isSyntheticAudioSource,
} from '@/lib/api/audio-source-policy';
import { safeJsonLd } from '@/lib/security/safe-json-ld';
import { tourMetadata } from '@/lib/seo/tour-metadata';
import { tourJsonLd } from '@/lib/seo/json-ld';
import ItineraryList from './itinerary-list';
import { StarRating } from '@/components/catalogue/StarRating';
import { maskLockedPois } from '@/lib/catalogue/scene-pois';
import { LANG_FLAGS, LANG_NAMES } from '@/lib/i18n/languages';
import { LangChip } from '@/components/i18n/LangChip';
import { localizeTour, METADATA_FALLBACK_COPY } from '@/lib/catalogue/localized-tour';

const DETAIL_COPY = extendCopy({
  fr: {
    openInApp: 'Ouvrir dans Murmure', bestExperience: 'Pour la meilleure expérience audio immersive', open: 'Ouvrir',
    free: 'GRATUIT', yourGuide: 'Votre guide', verifiedGuide: 'Guide vérifié', viewProfile: 'Voir le profil →',
    audioByLanguage: 'Audio par langue', itinerary: 'Itinéraire', reviews: 'Avis', liveTour: 'Vivez cette visite',
    download: 'Écoutez ici. L’appli Murmure ajoute le guidage GPS et l’écoute hors connexion.',
    duration: 'Durée', distance: 'Distance', stops: 'Étapes', completions: 'Écoutes terminées', listen: 'Marcher avec l’appli',
  },
  en: {
    openInApp: 'Open in Murmure', bestExperience: 'For the best immersive audio experience', open: 'Open',
    free: 'FREE', yourGuide: 'Your guide', verifiedGuide: 'Verified guide', viewProfile: 'View profile →',
    audioByLanguage: 'Audio by language', itinerary: 'Itinerary', reviews: 'Reviews', liveTour: 'Experience this tour',
    download: 'Listen here. The Murmure app adds GPS guidance and offline listening.',
    duration: 'Duration', distance: 'Distance', stops: 'Stops', completions: 'Completions', listen: 'Walk with the app',
  },
} as const);

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

function formatRelativeDate(dateStr: string, locale: InterfaceLocale): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return translate(locale, 'Publié aujourd\'hui', 'Published today');
  if (diffDays < 30) {
    return translate(locale, `Publié il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`, `Published ${diffDays} day${diffDays > 1 ? 's' : ''} ago`);
  }
  const month = date.toLocaleDateString(translate(locale, 'fr-FR', 'en-GB'), { month: 'long', year: 'numeric' });
  return translate(locale, `Publié en ${month}`, `Published in ${month}`);
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
  return tourMetadata(tour, citySlug, tourSlug, 'fr');
}

export async function LocalizedTourDetailPage({ params, searchParams, locale = 'fr' }: TourPageProps & {locale?: InterfaceLocale}) {
  const { city: citySlug, tourSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const originalTour = await getTourBySlug(citySlug, tourSlug);
  if (!originalTour) notFound();
  const tour = localizeTour(originalTour, locale);

  const [city, guideSlug] = await Promise.all([
    getCityBySlug(citySlug),
    getGuideSlugByGuideId(tour.guideId),
  ]);
  const isQrVisit = resolvedSearchParams.source === 'qr';
  const copy = DETAIL_COPY[locale];
  const catalogueBase = translate(locale, '/catalogue', '/en/catalogue');

  const accent = getCityAccent(citySlug);
  const heroBg = accentSoftColor(accent);
  const heroAccentFg = accentColor(accent);
  const cityName = city?.name || tour.city;

  // Les langues du bloc audio viennent de ce qui est vendu, pas de la carte de
  // mentions : une carte vide n'escamote plus aucune ligne.
  const audioLanguages = displayedLanguages(tour.availableLanguages, tour.languageAudioTypes);

  const accroche =
    tour.shortDescription ||
    (tour.description ? tour.description.slice(0, 200) : 'Une visite à découvrir.');

  return (
    <div
      className="pb-24 md:pb-0"
      style={{ background: tg.colors.paper, minHeight: '100vh' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {tour.metadataFallback && <p className="mb-4 text-body text-ink-80">{METADATA_FALLBACK_COPY[locale]}</p>}
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
              className="font-bold px-6 py-2 rounded-pill"
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
          aria-label={translate(locale, "Fil d'Ariane", 'Breadcrumb')}
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
            <div className="lg:col-span-2 min-w-0">
              <Eyebrow style={{ color: heroAccentFg, marginBottom: tg.space[4] }}>
                {cityName} · {tour.duration} min
              </Eyebrow>

              <div
                className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between"
                style={{ marginBottom: tg.space[4] }}
              >
                <h1
                  className="text-h4 sm:text-h3 lg:text-h2"
                  style={{
                    fontFamily: tg.fonts.display,
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
                {tour.purchaseType === 'subscription_only' && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      borderRadius: tg.radius.pill,
                      background: tg.colors.ocreSoft,
                      color: tg.colors.ocre,
                      fontFamily: tg.fonts.sans,
                      fontSize: tg.fontSize.meta,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {translate(locale, 'INCLUS DANS L’ABONNEMENT', 'INCLUDED WITH SUBSCRIPTION')}
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
                      <LangChip key={lang} code={lang} />
                    ))}
                    {tour.availableLanguages.length > 5 && (
                      <span style={{ color: tg.colors.ink60 }}>+{tour.availableLanguages.length - 5}</span>
                    )}
                  </span>
                )}
              </div>

              <a href="#itineraire" className="inline-flex min-h-11 items-center rounded-pill bg-grenadine px-5 text-body font-bold text-paper mb-4">{translate(locale, 'Découvrir l’audio', 'Discover the audio')}</a>

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
          <div className="lg:col-span-2 min-w-0">
            <div id="itineraire" className="mb-10 scroll-mt-20">
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
              {/* Visite payante : le HTML ne porte pas les titres verrouillés
                  (ils n'étaient que floutés en CSS). L'acheteur les retrouve
                  par la redemande après hydratation. */}
              <ItineraryList
                pois={isTourFree(tour) ? tour.pois : maskLockedPois(tour.pois, locale)}
                walkPath={tour.walkPath}
                tourId={tour.id}
                cityId={tour.citySlug}
                sourceLanguage={tour.sourceLanguage}
                languageAudioTypes={tour.languageAudioTypes}
                tourTitle={tour.title}
                isFree={isTourFree(tour)}
                contentUnavailable={tour.contentUnavailable}
                heroAccentFg={heroAccentFg}
                locale={locale}
              />
            </div>

            {/* Guide info — "Votre guide" showcase card */}
            {(() => {
              const avatar = tour.guidePhotoUrl ? (
                <S3Image
                  s3Key={tour.guidePhotoUrl}
                  alt={translate(locale, `Photo de ${tour.guideName}`, `Photo of ${tour.guideName}`)}
                  className="w-16 h-16 rounded-pill shrink-0"
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

            {/* Audio par langue — une langue vendue mais absente de la carte de
                mentions doit apparaître, avec sa mention de synthèse. */}
            {audioLanguages.length > 0 && (
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
                <div className="space-y-2" data-testid="tour-audio-by-language">
                  {audioLanguages.map((lang) => {
                    const type = displayedAudioSource(tour.languageAudioTypes, lang);
                    // La mention et son pendant humain viennent tous deux du
                    // module, localisés : aucune chaîne de divulgation n'est
                    // écrite ici, et « /en/catalogue » n'en perd aucune.
                    const label = isSyntheticAudioSource(type)
                      ? audioSourceLabel(type, locale)
                      : humanVoiceLabel(locale);
                    return (
                      <div
                        key={lang}
                        data-testid={`audio-lang-${lang}`}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: tg.colors.paperSoft }}
                      >
                        <span
                          data-testid={`audio-lang-name-${lang}`}
                          style={{
                            fontFamily: tg.fonts.sans,
                            fontWeight: 600,
                            color: tg.colors.ink,
                          }}
                        >
                          {LANG_FLAGS[lang] ?? ''} {LANG_NAMES[lang] ?? lang.toUpperCase()}
                        </span>
                        <span
                          data-testid={`audio-mention-${lang}`}
                          style={{
                            fontFamily: tg.fonts.sans,
                            fontSize: tg.fontSize.caption,
                            color: tg.colors.ink60,
                          }}
                        >
                          {isSyntheticAudioSource(type) ? '🤖' : '🎤'} {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Itinéraire — étapes numérotées */}
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
                        {new Date(review.createdAt).toLocaleDateString(translate(locale, 'fr-FR', 'en-GB'))}
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
          <div className="lg:col-span-1 min-w-0">
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

                  <AiDisclosureBadge tourId={tour.id} locale={locale} detailed />

                  <SmartAppLink
                    tourId={tour.id}
                    className="hidden md:block"
                    style={{ display: 'block', textDecoration: 'none' }}
                  >
                    <Button variant="accent" size="lg" fullWidth>
                      {copy.listen}
                    </Button>
                  </SmartAppLink>

                  {/* LW-2 : la cible de la fin d'aperçu du lecteur. L'`id` vient
                      du module partagé (jamais réécrit à la main), et
                      `tabIndex={-1}` rend la cible focalisable : sans lui, le
                      saut d'ancre déplace la vue sans déplacer le focus. */}
                  <div id={PURCHASE_ANCHOR_ID} tabIndex={-1}>
                    {/* mon-1.3b — web sale CTA for individually-priced tours */}
                    {tour.purchaseType === 'paid' && (
                      <TourPurchaseCard
                        tourId={tour.id}
                        title={tour.title}
                        priceCents={tour.priceCents}
                        locale={locale}
                      />
                    )}

                    {/* Forfait « visites IA » — les visites incluses affichaient leur
                        statut sans aucun moyen d'acheter : c'est ici que l'intention
                        d'achat est la plus forte. */}
                    {tour.purchaseType === 'subscription_only' && (
                      <ForfaitPurchaseCard locale={locale} />
                    )}
                  </div>

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
        className="tour-mobile-app-cta md:hidden fixed left-0 right-0 z-30"
        style={{
          bottom: 'var(--visitor-nav-height, 0px)',
          padding: tg.space[4],
          background: tg.colors.paper,
          borderTop: `1px solid ${tg.colors.line}`,
        }}
      >
        <div className="flex gap-3">
          <a href="#itineraire" className="flex min-h-11 flex-1 items-center justify-center rounded-pill bg-grenadine px-4 text-body font-bold text-paper">{translate(locale, 'Écouter sur le site', 'Listen on this site')}</a>
          {!isTourFree(tour) && <a href="#acheter" className="flex min-h-11 items-center justify-center rounded-pill border border-line px-4 text-body font-semibold text-ink">{translate(locale, 'Achat', 'Purchase options')}</a>}
        </div>
      </div>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(tourJsonLd(tour, locale)),
        }}
      />
    </div>
  );
}

export default async function TourDetailPage(props: TourPageProps) {
  return LocalizedTourDetailPage({...props, locale: 'fr'});
}
