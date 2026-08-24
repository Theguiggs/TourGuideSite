'use client';

import { useEffect, useState } from 'react';
import { NumberMark, Eyebrow, tg } from '@murmure/design-system/web';
import type { POI } from '@/types/tour';
import { useOwnsTour, usePurchasesRefreshTick } from '@/hooks/use-owned-tour-ids';
import { useAuth } from '@/lib/auth/auth-context';
import { FREE_PREVIEW_SCENES, isFullContent, mapScenesToPois } from '@/lib/catalogue/scene-pois';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { S3Image } from '@/components/studio/s3-image';

const SERVICE_NAME = 'ItineraryList';

interface ItineraryListProps {
  pois: POI[];
  tourId: string;
  /** Free tours are never gated. */
  isFree: boolean;
  heroAccentFg: string;
  locale?: 'fr' | 'en';
}

/** Ce que le serveur a servi : des étapes, et s'il les a accordées en entier. */
interface ServedContent {
  pois: POI[];
  /** Vrai seulement si la réponse reçue porte le contenu complet. */
  granted: boolean;
}

/**
 * Redemande le contenu complet une fois la page hydratée, et rapporte ce que le
 * serveur a accordé.
 *
 * Le rendu serveur reste le rendu public : il ne porte aucune identité, donc le
 * Lambda le sert tronqué — les deux premières scènes intégrales, les suivantes
 * privées d'audio, de description et de photos. L'identité n'existant que dans
 * le navigateur, c'est lui qui
 * redemande — et seulement s'il y a une session : un anonyme ne redemande rien,
 * et voit exactement ce qu'il voyait.
 *
 * `granted` se lit dans la réponse, jamais dans ce que le navigateur croit
 * posséder. C'est ce qui garantit que les deux verrous s'ouvrent ensemble : on
 * ne défloute que ce qui est réellement arrivé.
 *
 * En cas d'échec — réseau, jeton expiré, requête refusée — on garde l'aperçu du
 * rendu serveur, flou compris. La page ne casse pas, l'échec est journalisé.
 */
function useServedContent(tourId: string, ssrPois: POI[], isFree: boolean): ServedContent {
  const { isAuthenticated } = useAuth();
  const refreshTick = usePurchasesRefreshTick();
  // Le contenu obtenu est étiqueté de sa visite : une navigation client d'une
  // fiche à l'autre ne doit jamais afficher, même un instant, les étapes de la
  // précédente sous le titre de la suivante.
  const [served, setServed] = useState<({ tourId: string } & ServedContent) | null>(null);

  useEffect(() => {
    // Visite gratuite : le serveur ne tronque rien, aucune demande à faire.
    if (isFree || !isAuthenticated || shouldUseStubs()) {
      setServed(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { getPublishedTourContent } = await import('@/lib/api/appsync-client');
        const result = await getPublishedTourContent(tourId);
        if (cancelled) return;
        if (!result.ok) {
          logger.warn(SERVICE_NAME, 'authenticated tour content refetch refused', {
            tourId,
            error: result.error,
          });
          return;
        }
        // Une réponse vide ne remplace pas un rendu serveur qui, lui, a des
        // étapes : on ne détruit pas un itinéraire affiché pour du néant.
        if (result.data.scenes.length === 0) return;
        setServed({
          tourId,
          pois: mapScenesToPois(result.data.scenes),
          granted: isFullContent(result.data.scenes),
        });
      } catch (error) {
        logger.warn(SERVICE_NAME, 'authenticated tour content refetch failed', {
          tourId,
          error: String(error),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tourId, isFree, isAuthenticated, refreshTick]);

  return served?.tourId === tourId
    ? { pois: served.pois, granted: served.granted }
    : { pois: ssrPois, granted: false };
}

/**
 * Itinerary (numbered POI list) with per-stop photo + teaser gating.
 *
 * Each stop shows its photo next to the description. Stops past the free preview
 * stay visible (NumberMark + blurred name/photo) so the visitor knows they exist
 * but can't read them, until the tour is owned. Ownership is resolved client-side
 * (auth lives in localStorage), so this is a Client Component island inside the
 * otherwise server-rendered tour detail page.
 *
 * Les deux verrous vivent ici et s'ouvrent ensemble, parce qu'ils n'en font
 * qu'un : le flou tombe quand — et seulement quand — le serveur a envoyé le
 * contenu complet. Déflouter sur ce que le navigateur croit posséder afficherait
 * des étapes vides dès que la redemande échoue ; c'est exactement l'écran que ce
 * composant ne doit jamais produire.
 */
export default function ItineraryList({
  pois,
  tourId,
  isFree,
  heroAccentFg,
  locale = 'fr',
}: ItineraryListProps) {
  // Hooks appelés sans condition : `isFree` court-circuiterait l'appel et
  // désordonnerait la liste des hooks au premier rendu où il change.
  const ownsTour = useOwnsTour(tourId);
  const { pois: displayedPois, granted } = useServedContent(tourId, pois, isFree);
  // En mode bouchons il n'y a pas de serveur pour juger : on retombe sur ce que
  // le client sait, faute de réponse à lire. Hors bouchons, la possession
  // calculée côté navigateur ne décide de rien ici — elle sert au badge.
  const hasAccess = isFree || granted || (shouldUseStubs() && ownsTour);

  if (displayedPois.length === 0) {
    return (
      <Eyebrow style={{ color: tg.colors.ink60 }}>
        {locale === 'en' ? 'Itinerary being finalised' : 'Itinéraire en cours de finalisation'}
      </Eyebrow>
    );
  }

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {displayedPois.map((poi, index) => {
        const locked = !hasAccess && index >= FREE_PREVIEW_SCENES;
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
