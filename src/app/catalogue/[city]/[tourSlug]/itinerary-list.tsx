'use client';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';

import { useEffect, useMemo, useRef, useState } from 'react';
import { NumberMark, Eyebrow, tg } from '@murmure/design-system/web';
import type { POI } from '@/types/tour';
import type { LanguageAudioTypes } from '@/lib/api/audio-source-policy';
import { useOwnsTour, usePurchasesRefreshTick } from '@/hooks/use-owned-tour-ids';
import { useAuth } from '@/lib/auth/auth-context';
import { FREE_PREVIEW_SCENES, isFullContent, mapScenesToPois, maskLockedPois, itineraryUsesSourceText, ITINERARY_SOURCE_COPY } from '@/lib/catalogue/scene-pois';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { S3Image } from '@/components/studio/s3-image';
import {
  ScenePlayer,
  SceneListenControl,
  TourPlayControl,
  SCENE_PLAYER_COPY,
  useScenePlayer,
  type PlaylistEntry,
} from '@/components/catalogue/scene-player';
import { revealElement } from '@/components/catalogue/scene-player/reveal';
import { LISTEN_ANCHOR } from '@/components/catalogue/scene-player/listen-link';
import VisitorMap from '@/components/catalogue/visitor-map/visitor-map';
import type { Coordinate } from '@/components/catalogue/visitor-map/geo';

const SERVICE_NAME = 'ItineraryList';

interface ItineraryListProps {
  pois: POI[];
  walkPath?: Coordinate[];
  tourId: string;
  cityId?: string;
  sourceLanguage?: string;
  languageAudioTypes?: LanguageAudioTypes;
  /** LW-2 — titre de la visite (Media Session). */
  tourTitle?: string;
  /** Free tours are never gated. */
  isFree: boolean;
  heroAccentFg: string;
  locale?: InterfaceLocale;
  /** Le contenu public n'a pas pu être lu au rendu : dire « indisponible », pas « en cours ». */
  contentUnavailable?: boolean;
}

/** Ce que le serveur a servi : des étapes, et s'il les a accordées en entier. */
interface ServedContent {
  pois: POI[];
  walkPath?: Coordinate[];
  /** Vrai seulement si la réponse reçue porte le contenu complet. */
  granted: boolean;
  /**
   * LW-2 — la liste affichée est celle que le serveur a arrêtée : plus rien ne
   * l'ouvrira. C'est la seule condition sous laquelle une reprise portant sur
   * une étape absente peut être purgée. Un échec de redemande ne la satisfait
   * PAS : la liste reste tronquée faute de réponse, pas faute de droits, et
   * purger là effacerait la reprise d'un acheteur pour une panne de réseau.
   */
  settled: boolean;
}

/**
 * Redemande le contenu complet une fois la page hydratée, et rapporte ce que le
 * serveur a accordé.
 *
 * Le rendu serveur reste le rendu public : il ne porte aucune identité, donc le
 * Lambda le sert tronqué — la première scène intégrale, les suivantes
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
function useServedContent(tourId: string, ssrPois: POI[], isFree: boolean, locale: InterfaceLocale): ServedContent {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const refreshTick = usePurchasesRefreshTick();
  // Le contenu obtenu est étiqueté de sa visite : une navigation client d'une
  // fiche à l'autre ne doit jamais afficher, même un instant, les étapes de la
  // précédente sous le titre de la suivante.
  const [served, setServed] = useState<
    ({ tourId: string } & Omit<ServedContent, 'settled'>) | null
  >(null);
  // Vrai dès le PREMIER rendu quand une redemande peut encore partir : sinon la
  // liste paraîtrait arrêtée le temps d'un rendu, et seule la chance de l'ordre
  // des effets empêcherait la purge d'une reprise encore verrouillée. La session
  // en cours de résolution compte : `isAuthenticated` est faux avant de devenir
  // vrai, et c'est précisément l'instant où l'acheteur revient sur la page.
  const awaitsGrant = !isFree && (authLoading || isAuthenticated) && !shouldUseStubs();
  const [pending, setPending] = useState(awaitsGrant);

  useEffect(() => {
    // Visite gratuite : le serveur ne tronque rien, aucune demande à faire.
    if (isFree || !isAuthenticated || shouldUseStubs()) {
      setServed(null);
      setPending(false);
      return;
    }
    let cancelled = false;
    setPending(true);
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
        const granted = result.data.hasFullAccess ?? isFullContent(result.data.scenes);
        const mapped = mapScenesToPois(result.data.scenes);
        setServed({
          tourId,
          pois: granted ? mapped : maskLockedPois(mapped, locale),
          walkPath: result.data.walkPath,
          granted,
        });
      } catch (error) {
        logger.warn(SERVICE_NAME, 'authenticated tour content refetch failed', {
          tourId,
          error: String(error),
        });
      } finally {
        if (!cancelled) setPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tourId, isFree, isAuthenticated, refreshTick, locale]);

  const granted = served?.tourId === tourId ? served.granted : false;
  // « Arrêtée » = le serveur a accordé le contenu complet, ou personne ne va
  // redemander. Une redemande en vol, refusée ou tombée laisse la liste ouverte.
  const settled = !pending && (granted || !awaitsGrant);

  return served?.tourId === tourId
    ? { pois: served.pois, walkPath: served.walkPath, granted, settled }
    : { pois: ssrPois, granted: false, settled };
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
  walkPath,
  tourId,
  cityId,
  sourceLanguage,
  languageAudioTypes,
  tourTitle = '',
  isFree,
  heroAccentFg,
  locale = 'fr',
  contentUnavailable = false,
}: ItineraryListProps) {
  // Hooks appelés sans condition : `isFree` court-circuiterait l'appel et
  // désordonnerait la liste des hooks au premier rendu où il change.
  const ownsTour = useOwnsTour(tourId);
  const { pois: displayedPois, walkPath: servedPath, granted, settled } = useServedContent(tourId, pois, isFree, locale);
  // En mode bouchons il n'y a pas de serveur pour juger : on retombe sur ce que
  // le client sait, faute de réponse à lire. Hors bouchons, la possession
  // calculée côté navigateur ne décide de rien ici — elle sert au badge.
  const hasAccess = isFree || granted || (shouldUseStubs() && ownsTour);

  // LW-2 : la liste jouable — étapes servies ET narrées, dans l'ordre
  // d'affichage — et « des étapes verrouillées suivent » (fin d'aperçu). Même
  // règle de verrou que `StopList` : le lecteur ne décide de rien, il enchaîne
  // ce que le serveur a servi.
  const playlist = useMemo<PlaylistEntry[]>(
    () =>
      displayedPois.flatMap((poi, index) =>
        !isLocked(hasAccess, index) && poi.hasAudio === true
          ? [{ id: poi.id, title: poi.title, order: poi.order }]
          : [],
      ),
    [displayedPois, hasAccess],
  );
  // Des étapes verrouillées suivent l'aperçu : c'est la fin d'aperçu du lecteur.
  const lockedAfter = !hasAccess && displayedPois.length > FREE_PREVIEW_SCENES;

  if (displayedPois.length === 0) {
    const text = contentUnavailable
      ? translate(locale, 'Itinéraire momentanément indisponible — réessayez dans un instant.', 'Itinerary temporarily unavailable — please try again in a moment.')
      : translate(locale, 'Itinéraire en cours de finalisation', 'Itinerary being finalised');
    return (
      <Eyebrow id={LISTEN_ANCHOR.slice(1)} style={{ color: tg.colors.ink60 }} data-testid={contentUnavailable ? 'itinerary-unavailable' : 'itinerary-empty'}>
        {text}
      </Eyebrow>
    );
  }

  return (
    // LW-1 : un seul <audio> pour toute la liste, possédé par le lecteur ; la
    // liste, elle, reste ici. Le contexte relie les deux.
    <ScenePlayer
      cityId={cityId}
      audioLanguage={sourceLanguage}
      languageAudioTypes={languageAudioTypes}
      tourId={tourId}
      locale={locale}
      playlist={playlist}
      lockedAfter={lockedAfter}
      tourTitle={tourTitle}
      playlistSettled={settled}
    >
      {/* LW-2 : « Écouter la visite », reprise, fin de séquence — au-dessus de la liste. */}
      <TourPlayControl />
      {itineraryUsesSourceText(displayedPois, locale, sourceLanguage) && <p className="mb-4 text-body text-ink-80" data-testid="itinerary-source-language">{ITINERARY_SOURCE_COPY[locale]}</p>}
      {playlist.length === 0 && (
        <p id={LISTEN_ANCHOR.slice(1)} role="status" style={{ color: tg.colors.ink, fontSize: tg.fontSize.body }}>
          {settled ? SCENE_PLAYER_COPY[locale].noAudio : SCENE_PLAYER_COPY[locale].unavailable}
        </p>
      )}
      <StopList
        pois={displayedPois}
        hasAccess={hasAccess}
        heroAccentFg={heroAccentFg}
        locale={locale}
      />
      <VisitorMap key={tourId} pois={displayedPois} path={servedPath ?? walkPath} hasAccess={hasAccess} locale={locale} />
    </ScenePlayer>
  );
}

/** Une étape est verrouillée quand l'accès n'est pas accordé et qu'elle dépasse l'aperçu gratuit. */
function isLocked(hasAccess: boolean, index: number): boolean {
  return !hasAccess && index >= FREE_PREVIEW_SCENES;
}

interface StopListProps {
  pois: POI[];
  hasAccess: boolean;
  heroAccentFg: string;
  locale: InterfaceLocale;
}

/**
 * La liste numérotée. Rendue SOUS `<ScenePlayer>` pour lire la scène en cours
 * (`aria-current` sur l'étape) — l'îlot parent, lui, est au-dessus du contexte.
 */
function StopList({ pois, hasAccess, heroAccentFg, locale }: StopListProps) {
  const { currentSceneId, sequence } = useScenePlayer();
  const itemRefs = useRef(new Map<string, HTMLLIElement>());

  // LW-2 : en séquence, la liste suit l'étape en cours. `revealElement` garde
  // l'appel (jsdom n'implémente pas `scrollIntoView`) et honore
  // `prefers-reduced-motion` : la vue va au même endroit, sans glissement.
  useEffect(() => {
    if (!sequence || !currentSceneId) return;
    revealElement(itemRefs.current.get(currentSceneId));
  }, [sequence, currentSceneId]);

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {pois.map((poi, index) => {
        const locked = isLocked(hasAccess, index);
        // Le bouton n'existe que pour une étape servie ET narrée : pas de
        // bouton sur une étape floutée, ni sur une scène sans audio.
        const listenable = !locked && poi.hasAudio === true;
        const isCurrent = currentSceneId === poi.id;
        return (
          <li
            key={poi.id}
            ref={(node) => {
              if (node) itemRefs.current.set(poi.id, node);
              else itemRefs.current.delete(poi.id);
            }}
            aria-current={isCurrent ? 'true' : undefined}
            aria-label={
              locked
                ? translate(locale, `Étape ${poi.order} verrouillée — débloquez la visite pour la découvrir`, `Stop ${poi.order} locked - unlock the tour to discover it`)
                : undefined
            }
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: tg.space[5],
              marginBottom: tg.space[6],
              // Étape en cours : marque visible, en plus d'`aria-current`. La
              // bordure transparente des autres évite tout décalage au passage.
              paddingLeft: tg.space[3],
              borderLeft: `3px solid ${isCurrent ? heroAccentFg : 'transparent'}`,
              borderRadius: tg.radius.md,
              backgroundColor: isCurrent ? tg.colors.paperSoft : undefined,
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
              {listenable && <SceneListenControl sceneId={poi.id} title={poi.title} />}
              {poi.description && (
                <p
                  aria-hidden={locked || undefined}
                  style={{
                    fontFamily: tg.fonts.sans,
                    fontSize: tg.fontSize.body,
                    color: tg.colors.ink80,
                    lineHeight: 1.5,
                    margin: 0,
                    ...(listenable ? { marginTop: tg.space[2] } : null),
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
