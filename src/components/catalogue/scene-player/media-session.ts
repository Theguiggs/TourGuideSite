/**
 * LW-2 — Media Session : titre, couverture, position et précédent / suivant sur
 * l'écran verrouillé et les écouteurs.
 *
 * Tout accès à `navigator.mediaSession` est gardé : l'API est absente de jsdom
 * et de certains navigateurs, et `setActionHandler` peut lever pour une action
 * que le navigateur ne connaît pas (`seekto` sur d'anciens moteurs). Rien ici
 * ne doit faire tomber le lecteur : une Media Session absente est un lecteur
 * sans écran verrouillé, pas une erreur. La tolérance est par action : une
 * action refusée n'empêche pas les autres d'être posées, et le retrait ne
 * libère que ce qui a effectivement été lié.
 */

import { logger } from '@/lib/logger';

const SERVICE_NAME = 'MediaSession';

/** Saut des actions `seekbackward` / `seekforward` quand le navigateur n'en propose pas. */
export const SEEK_OFFSET_SECONDS = 10;

export type MediaSessionActionName =
  | 'play'
  | 'pause'
  | 'previoustrack'
  | 'nexttrack'
  | 'seekto'
  | 'seekbackward'
  | 'seekforward';

export type MediaSessionHandlers = Partial<
  Record<MediaSessionActionName, (details: MediaSessionActionDetails) => void>
>;

export interface MediaSessionMetadataInput {
  /** Titre de l'étape. */
  title: string;
  /** Titre de la visite. */
  artist: string;
  /** `coverUrl` de la réponse, s'il existe. */
  artwork?: string;
}

export interface MediaSessionPositionInput {
  duration: number;
  position: number;
  playbackRate?: number;
}

function session(): MediaSession | null {
  try {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return null;
    return navigator.mediaSession ?? null;
  } catch {
    return null;
  }
}

/** Pose les métadonnées de la piste en cours ; sans Media Session, ne fait rien. */
export function applyMediaSession({ title, artist, artwork }: MediaSessionMetadataInput): void {
  const current = session();
  if (!current) return;
  try {
    const init: MediaMetadataInit = {
      title,
      artist,
      album: artist,
      artwork: artwork ? [{ src: artwork }] : [],
    };
    // `MediaMetadata` accompagne toujours `mediaSession` dans un navigateur ;
    // un faux objet de test peut ne pas fournir la classe : on pose l'objet nu.
    current.metadata =
      typeof MediaMetadata === 'function'
        ? new MediaMetadata(init)
        : (init as unknown as MediaMetadata);
  } catch (error) {
    logger.info(SERVICE_NAME, 'metadata not applied', { error: String(error) });
  }
}

export function setMediaSessionPlaybackState(state: MediaSessionPlaybackState): void {
  const current = session();
  if (!current) return;
  try {
    current.playbackState = state;
  } catch (error) {
    logger.info(SERVICE_NAME, 'playbackState not applied', { error: String(error) });
  }
}

/**
 * Position et durée de la piste : sans elles, l'écran verrouillé n'affiche ni
 * curseur ni durée — et `seekto`, faute de glissière, devient inatteignable.
 * Une durée inconnue (avant `loadedmetadata`) efface l'état plutôt que de poser
 * une valeur que la spécification refuse.
 */
export function setMediaSessionPosition({
  duration,
  position,
  playbackRate,
}: MediaSessionPositionInput): void {
  const current = session();
  if (!current || typeof current.setPositionState !== 'function') return;
  try {
    if (!Number.isFinite(duration) || duration <= 0) {
      current.setPositionState();
      return;
    }
    const rate = Number.isFinite(playbackRate) && (playbackRate ?? 0) > 0 ? playbackRate : 1;
    current.setPositionState({
      duration,
      position: Math.min(Math.max(0, Number.isFinite(position) ? position : 0), duration),
      playbackRate: rate,
    });
  } catch (error) {
    logger.info(SERVICE_NAME, 'positionState not applied', { error: String(error) });
  }
}

/** Démontage : plus de piste, plus de métadonnées, plus de position. */
export function clearMediaSession(): void {
  const current = session();
  if (!current) return;
  try {
    current.metadata = null;
    current.playbackState = 'none';
  } catch (error) {
    logger.info(SERVICE_NAME, 'metadata not cleared', { error: String(error) });
  }
  try {
    current.setPositionState?.();
  } catch (error) {
    logger.info(SERVICE_NAME, 'positionState not cleared', { error: String(error) });
  }
}

/**
 * Enregistre les actions et rend la fonction qui les retire. Une action que le
 * navigateur refuse n'empêche pas les autres : chacune est posée à part, et
 * seule une action réellement liée est libérée.
 */
export function bindMediaSessionActions(handlers: MediaSessionHandlers): () => void {
  const current = session();
  if (!current) return () => {};
  const bound: MediaSessionActionName[] = [];
  for (const [action, handler] of Object.entries(handlers) as Array<
    [MediaSessionActionName, MediaSessionHandlers[MediaSessionActionName]]
  >) {
    if (!handler) continue;
    try {
      current.setActionHandler(action, handler);
      bound.push(action);
    } catch (error) {
      logger.info(SERVICE_NAME, 'action not supported', { action, error: String(error) });
    }
  }
  return () => {
    for (const action of bound) {
      try {
        current.setActionHandler(action, null);
      } catch (error) {
        logger.info(SERVICE_NAME, 'action not released', { action, error: String(error) });
      }
    }
  };
}
