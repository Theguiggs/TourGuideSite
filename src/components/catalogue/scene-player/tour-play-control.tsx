'use client';
import { translate } from '@/lib/i18n/translate';

/**
 * LW-2 — en-tête de l'itinéraire : « Écouter la visite » / « Pause », la
 * pastille « Reprendre à l'étape N » quand une reprise valide existe, et le
 * message de fin de séquence (fin d'aperçu → lien vers le bloc d'achat
 * `#acheter` ; visite terminée).
 *
 * Sans état propre : tout vient du lecteur (`useTourPlayer`). Hors
 * `<ScenePlayer>`, ou sans étape jouable, ne rend rien.
 *
 * Deux dettes d'accessibilité réglées ici :
 * — le message de fin apparaît en TÊTE d'itinéraire alors que le défilement
 *   automatique vient d'emmener la vue sur la dernière étape : au moment où
 *   l'intention d'achat est la plus forte, l'appel à l'action serait hors
 *   champ. On l'amène dans la vue et on lui donne le focus.
 * — `aria-current` sur l'étape ne s'annonce pas : une région `aria-live`
 *   discrète dit l'étape en cours à chaque changement de piste.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button, tg } from '@murmure/design-system/web';
import { SCENE_PLAYER_COPY, useTourPlayer } from './scene-player';
import { PURCHASE_ANCHOR } from './purchase-anchor';
import { revealElement } from './reveal';
import { LISTEN_ANCHOR } from './listen-link';
import { LanguageControl } from './language-control';

/** Hors flux visuel, lu par les lecteurs d'écran. */
const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function TourPlayControl() {
  const player = useTourPlayer();
  const endingRef = useRef<HTMLParagraphElement | null>(null);
  const ending = player?.ending ?? null;

  // La fin de séquence vient à la vue plutôt que d'attendre qu'on la cherche.
  useEffect(() => {
    if (!ending) return;
    const node = endingRef.current;
    if (!node) return;
    revealElement(node);
    if (typeof node.focus === 'function') node.focus();
  }, [ending]);

  if (!player || player.playlist.length === 0) return null;
  const {
    locale,
    playlist,
    sequence,
    playing,
    loading,
    currentSceneId,
    resumeOffer,
    startSequence,
    toggle,
  } = player;
  const copy = SCENE_PLAYER_COPY[locale];
  const isLoading = sequence && loading;
  const isPlaying = sequence && playing;
  const label = isLoading
    ? copy.loading
    : isPlaying
      ? copy.pause
      : sequence && currentSceneId
        ? copy.resumeTour
        : copy.playTour;

  const onClick = () => {
    // En séquence, le bouton est pause / reprise de l'étape en cours (même
    // mécanique que le contrôle de l'étape) ; sinon il lance la visite.
    if (sequence && currentSceneId) toggle(currentSceneId);
    else startSequence();
  };

  const currentIndex = currentSceneId
    ? playlist.findIndex((entry) => entry.id === currentSceneId)
    : -1;
  const current = currentIndex >= 0 ? playlist[currentIndex] : undefined;

  return (
    <div
      id={LISTEN_ANCHOR.slice(1)}
      data-testid="tour-play-control"
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || !(event.target instanceof HTMLButtonElement)) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          player.keyboardSeek(event.key === 'ArrowLeft' ? -10 : 10);
        }
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: tg.space[3], marginBottom: tg.space[6] }}
    >
      <LanguageControl />
      <p style={{ margin: 0, fontFamily: tg.fonts.sans, color: tg.colors.ink60 }}>
        {translate(locale, 'À chaque étape, appuyez sur Écouter lorsque vous arrivez. L’audio s’arrête à la fin de chaque étape.', 'At each stop, tap Listen when you arrive. Audio stops at the end of each stop.')}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: tg.space[3], flexWrap: 'wrap' }}>
        <Button
          variant="primary"
          size="md"
          aria-busy={isLoading || undefined}
          testID="tour-play-button"
          iconLeft={
            isPlaying ? (
              <Pause size={16} aria-hidden="true" />
            ) : (
              <Play size={16} aria-hidden="true" />
            )
          }
          onClick={onClick}
        >
          {label}
        </Button>
        {resumeOffer && (
          <Button
            variant="ghost"
            size="sm"
            testID="tour-resume-button"
            iconLeft={<RotateCcw size={14} aria-hidden="true" />}
            onClick={() => startSequence(resumeOffer.sceneId, resumeOffer.position)}
          >
            {copy.resumeAt(resumeOffer.step)}
          </Button>
        )}
        {currentIndex >= 0 && currentIndex < playlist.length - 1 && (
          <Button variant="ghost" size="sm" testID="tour-next-button" onClick={player.next}>
            {translate(locale, 'Écouter l’étape suivante', 'Listen to the next stop')}
          </Button>
        )}
      </div>
      {/* L’étape courante est annoncée pour la visite comme pour une scène isolée. */}
      <p aria-live="polite" data-testid="tour-now-playing" style={VISUALLY_HIDDEN}>
        {current
          ? copy.nowPlaying(
              current.order ?? currentIndex + 1,
              playlist.length,
              current.title,
            )
          : ''}
      </p>
      {ending === 'preview-end' && (
        <p
          ref={endingRef}
          tabIndex={-1}
          role="status"
          data-testid="tour-ending-preview"
          style={{
            fontFamily: tg.fonts.sans,
            fontSize: tg.fontSize.body,
            color: tg.colors.ink,
            margin: 0,
          }}
        >
          {copy.previewEnd}{' '}
          <a
            href={PURCHASE_ANCHOR}
            data-testid="tour-ending-purchase-link"
            style={{ color: tg.colors.ink, fontWeight: 600, textDecoration: 'underline' }}
          >
            {copy.previewEndLink}
          </a>
        </p>
      )}
      {ending === 'complete' && (
        <p
          ref={endingRef}
          tabIndex={-1}
          role="status"
          data-testid="tour-ending-complete"
          style={{
            fontFamily: tg.fonts.sans,
            fontSize: tg.fontSize.caption,
            color: tg.colors.ink60,
            margin: 0,
          }}
        >
          {copy.tourComplete}
        </p>
      )}
    </div>
  );
}
