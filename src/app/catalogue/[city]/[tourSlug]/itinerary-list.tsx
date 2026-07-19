'use client';

import { NumberMark, Eyebrow, tg } from '@murmure/design-system/web';
import type { POI } from '@/types/tour';
import { useOwnedTourIds } from '@/hooks/use-owned-tour-ids';
import { S3Image } from '@/components/studio/s3-image';

// Teaser/paywall: number of POIs revealed for free when the tour isn't unlocked.
// Beyond this, itinerary names + photos are blurred so the visitor knows more
// stops exist without being able to read them. Mirrors the mobile TourDetailScreen.
const FREE_PREVIEW_POIS = 2;

interface ItineraryListProps {
  pois: POI[];
  tourId: string;
  /** Free tours are never gated. */
  isFree: boolean;
  heroAccentFg: string;
  locale?: 'fr' | 'en';
}

/**
 * Itinerary (numbered POI list) with per-stop photo + teaser gating.
 *
 * Each stop shows its photo next to the description. Stops past the free preview
 * stay visible (NumberMark + blurred name/photo) so the visitor knows they exist
 * but can't read them, until the tour is owned. Ownership is resolved client-side
 * (auth lives in localStorage), so this is a Client Component island inside the
 * otherwise server-rendered tour detail page.
 */
export default function ItineraryList({
  pois,
  tourId,
  isFree,
  heroAccentFg,
  locale = 'fr',
}: ItineraryListProps) {
  const owned = useOwnedTourIds();
  const hasAccess = isFree || owned.has(tourId);

  if (pois.length === 0) {
    return (
      <Eyebrow style={{ color: tg.colors.ink60 }}>
        {locale === 'en' ? 'Itinerary being finalised' : 'Itinéraire en cours de finalisation'}
      </Eyebrow>
    );
  }

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {pois.map((poi, index) => {
        const locked = !hasAccess && index >= FREE_PREVIEW_POIS;
        return (
          <li
            key={poi.id}
            aria-label={
              locked
                ? locale === 'en'
                  ? `Stop ${poi.order} locked - unlock the tour to discover it`
                  : `Étape ${poi.order} verrouillée — débloquez la visite pour la découvrir`
                : undefined
            }
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

            <div style={{ flex: 1, minWidth: 0 }}>
              <h5
                aria-hidden={locked || undefined}
                style={{
                  fontFamily: tg.fonts.display,
                  fontSize: tg.fontSize.h5,
                  color: tg.colors.ink,
                  margin: 0,
                  marginBottom: tg.space[1],
                  ...(locked
                    ? { filter: 'blur(6px)', userSelect: 'none' }
                    : null),
                }}
              >
                {poi.title}
              </h5>
              {poi.description && (
                <p
                  aria-hidden={locked || undefined}
                  style={{
                    fontFamily: tg.fonts.sans,
                    fontSize: tg.fontSize.body,
                    color: tg.colors.ink80,
                    lineHeight: 1.5,
                    margin: 0,
                    ...(locked
                      ? { filter: 'blur(4px)', userSelect: 'none' }
                      : null),
                  }}
                >
                  {poi.description}
                </p>
              )}
            </div>

            {poi.photoKey ? (
              <div
                className="shrink-0 w-28 h-24 sm:w-36 sm:h-28 relative overflow-hidden"
                style={{
                  borderRadius: tg.radius.lg,
                  boxShadow: '0 6px 16px rgba(20, 18, 15, 0.12)',
                  background: tg.colors.paperSoft,
                }}
              >
                <div
                  className={`w-full h-full ${locked ? 'scale-110' : ''}`}
                  style={locked ? { filter: 'blur(12px)' } : undefined}
                >
                  <S3Image
                    s3Key={poi.photoKey}
                    alt={locked ? '' : poi.title}
                    className="w-full h-full"
                  />
                </div>
                {locked && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'rgba(20, 18, 15, 0.22)' }}
                  >
                    <span aria-hidden style={{ fontSize: tg.fontSize.h5 }}>
                      🔒
                    </span>
                  </div>
                )}
              </div>
            ) : (
              locked && (
                <span
                  aria-hidden
                  style={{ fontSize: tg.fontSize.body, alignSelf: 'center' }}
                >
                  🔒
                </span>
              )
            )}
          </li>
        );
      })}
    </ol>
  );
}
