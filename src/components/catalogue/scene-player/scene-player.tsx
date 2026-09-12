'use client';

/**
 * LW-1 — lecteur de scène de la fiche Visite.
 *
 * Le lecteur possède l'élément, l'itinéraire possède la liste : un contexte
 * React relie les deux pour que chaque `<li>` n'ait qu'un contrôle sans état
 * propre. Il n'y a qu'UN `<audio>` pour toute la liste, débloqué par le premier
 * geste utilisateur, dont on change la `src` ensuite — prérequis de
 * l'enchaînement (LW-2) : un `<audio>` par étape exigerait un geste par étape.
 *
 * Accès : le lecteur ne joue que les URLs que la réponse serveur porte. Il ne
 * calcule rien ; une scène sans URL dans la réponse est « indisponible ».
 *
 * Redemande : au plus UNE par tentative (un clic « Écouter » sur une nouvelle
 * scène ouvre une tentative). Elle est consommée soit par l'expiration au clic,
 * soit par la première erreur média réseau / source en cours de piste. Une
 * seconde erreur affiche le message. Jamais de boucle.
 *
 * Position et durée ne passent PAS par le contexte principal : chaque
 * `timeupdate` re-rendrait toute la liste. Elles vont par abonnement au seul
 * contrôle de la scène en cours.
 *
 * Périmètre LW-1 : langue de base (`audioUrl`) seulement, pas d'enchaînement,
 * pas de Media Session, pas de reprise entre visites.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pause, Play } from 'lucide-react';
import { Button, tg } from '@murmure/design-system/web';
import { logger } from '@/lib/logger';
import { useSceneAudio } from './use-scene-audio';

const SERVICE_NAME = 'ScenePlayer';

/** Codes `MediaError` (la classe n'existe pas dans jsdom). */
const MEDIA_ERR_ABORTED = 1;
const MEDIA_ERR_DECODE = 3;

export type ScenePlayerLocale = 'fr' | 'en';

export const SCENE_PLAYER_COPY = {
  fr: {
    listen: 'Écouter',
    pause: 'Pause',
    loading: 'Chargement…',
    unavailable: 'Audio momentanément indisponible',
    tapAgain: "Touchez à nouveau pour lancer l'écoute",
    listenTo: (title: string) => `Écouter « ${title} »`,
    pauseTitle: (title: string) => `Mettre en pause « ${title} »`,
    seek: (title: string) => `Position dans « ${title} »`,
  },
  en: {
    listen: 'Listen',
    pause: 'Pause',
    loading: 'Loading…',
    unavailable: 'Audio temporarily unavailable',
    tapAgain: 'Tap again to start playback',
    listenTo: (title: string) => `Listen to “${title}”`,
    pauseTitle: (title: string) => `Pause “${title}”`,
    seek: (title: string) => `Position in “${title}”`,
  },
} as const;

type SceneCopy = (typeof SCENE_PLAYER_COPY)[ScenePlayerLocale];

/** `m:ss` ; une durée inconnue (NaN, Infinity) se lit `0:00`. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
}

interface ScenePlayerError {
  sceneId: string;
  message: string;
}

interface Progress {
  position: number;
  duration: number;
}

type ProgressListener = (progress: Progress) => void;

interface ScenePlayerContextValue {
  locale: ScenePlayerLocale;
  currentSceneId: string | null;
  playing: boolean;
  loading: boolean;
  error: ScenePlayerError | null;
  toggle(sceneId: string): void;
  seek(seconds: number): void;
  /** Le contrôle de la scène en cours disparaît : la lecture s'arrête avec lui. */
  release(sceneId: string): void;
  subscribeProgress(listener: ProgressListener): () => void;
  readProgress(): Progress;
}

const ScenePlayerContext = createContext<ScenePlayerContextValue | null>(null);

/**
 * Une tentative = un clic « Écouter » sur une scène qui n'est pas la scène
 * courante. `retryUsed` est le compteur de redemande : une seule par tentative.
 */
interface Attempt {
  sceneId: string;
  retryUsed: boolean;
  /** `src` posée : les clics suivants sur la même scène sont pause / reprise. */
  ready: boolean;
  /** Redemande après erreur média en vol. */
  retrying: boolean;
  /** `play()` en attente de résolution : pas de second `play()` par-dessus. */
  playPending: boolean;
  /** Pause demandée pendant la relance : on pose la source, on ne relance pas. */
  pausedByUser: boolean;
  /** Tentative close sur un message : le clic suivant en ouvre une nouvelle. */
  failed: boolean;
}

const ZERO_PROGRESS: Progress = { position: 0, duration: 0 };

function errorName(error: unknown): string {
  return typeof error === 'object' && error !== null && 'name' in error
    ? String((error as { name: unknown }).name)
    : '';
}

export interface ScenePlayerProps {
  tourId: string;
  locale?: ScenePlayerLocale;
  children: ReactNode;
}

/**
 * Une visite = une instance : changer de `tourId` remonte le lecteur à neuf
 * (état, tentative, élément). La piste de la visite précédente ne survit pas,
 * et rien de ce qu'elle avait obtenu ne sert à la suivante.
 */
export function ScenePlayer(props: ScenePlayerProps) {
  return <ScenePlayerInstance key={props.tourId} {...props} />;
}

function ScenePlayerInstance({ tourId, locale = 'fr', children }: ScenePlayerProps) {
  const { ensureFresh, refetch } = useSceneAudio(tourId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const attemptRef = useRef<Attempt | null>(null);
  const progressRef = useRef<Progress>(ZERO_PROGRESS);
  const listenersRef = useRef(new Set<ProgressListener>());
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ScenePlayerError | null>(null);
  const copy = SCENE_PLAYER_COPY[locale];

  const publishProgress = useCallback((progress: Progress) => {
    progressRef.current = progress;
    listenersRef.current.forEach((listener) => listener(progress));
  }, []);

  const subscribeProgress = useCallback((listener: ProgressListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const readProgress = useCallback(() => progressRef.current, []);

  const fail = useCallback(
    (sceneId: string, message: string = copy.unavailable) => {
      const current = attemptRef.current;
      if (current && current.sceneId === sceneId) current.failed = true;
      setPlaying(false);
      setLoading(false);
      setError({ sceneId, message });
    },
    [copy.unavailable],
  );

  /** Lance la lecture de la `src` posée. Un seul `play()` en vol par tentative. */
  const startPlayback = useCallback(
    async (audio: HTMLAudioElement, attempt: Attempt) => {
      if (attempt.playPending) return;
      attempt.playPending = true;
      try {
        await audio.play();
        if (attemptRef.current !== attempt) return;
        setPlaying(true);
        setLoading(false);
      } catch (playError) {
        if (attemptRef.current !== attempt) return;
        setLoading(false);
        const name = errorName(playError);
        // Interrompu par une pause ou un changement de source : rien à dire.
        if (name === 'AbortError') return;
        // Politique d'autoplay : le geste n'a pas été reconnu, on en demande un autre.
        if (name === 'NotAllowedError') {
          setPlaying(false);
          setError({ sceneId: attempt.sceneId, message: copy.tapAgain });
          return;
        }
        // Une erreur média est prise en charge par `onError` (redemande, puis
        // message) ; ici, on ne traite que les refus de `play()` lui-même.
        if (audio.error) return;
        logger.warn(SERVICE_NAME, 'play() refused', {
          sceneId: attempt.sceneId,
          error: String(playError),
        });
        fail(attempt.sceneId);
      } finally {
        attempt.playPending = false;
      }
    },
    [fail, copy.tapAgain],
  );

  // Démontage (navigation, changement de visite) : la piste s'arrête avec lui,
  // et le téléchargement en cours avec elle.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () =>
      publishProgress({ position: audio.currentTime, duration: progressRef.current.duration });
    const onDuration = () =>
      publishProgress({
        position: progressRef.current.position,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      publishProgress({ position: 0, duration: progressRef.current.duration });
    };
    const onError = () => {
      const attempt = attemptRef.current;
      if (!attempt || !attempt.ready) return;
      const code = audio.error?.code;
      // Chargement interrompu par nous (pause, nouvelle source) : ni relance, ni message.
      if (code === MEDIA_ERR_ABORTED) return;
      // Un fichier illisible ne le devient pas en le redemandant.
      if (code === MEDIA_ERR_DECODE || attempt.retryUsed) {
        logger.warn(SERVICE_NAME, 'media error, no retry left', { sceneId: attempt.sceneId, code });
        fail(attempt.sceneId);
        return;
      }
      // Réseau ou source refusée (403 d'une signature expirée) : une redemande.
      attempt.retryUsed = true;
      attempt.retrying = true;
      attempt.pausedByUser = false;
      // Position à reprendre, lue AVANT de changer la source (qui la remet à 0).
      const resumeAt = audio.currentTime;
      setLoading(true);
      void (async () => {
        const urls = await refetch();
        if (attemptRef.current !== attempt) return;
        attempt.retrying = false;
        const url = urls?.[attempt.sceneId];
        if (!url) {
          fail(attempt.sceneId);
          return;
        }
        audio.src = url;
        if (resumeAt > 0) audio.currentTime = resumeAt;
        publishProgress({ position: resumeAt, duration: progressRef.current.duration });
        if (attempt.pausedByUser) {
          // L'utilisateur a mis en pause pendant la relance : source prête,
          // position gardée, lecture au prochain clic.
          setLoading(false);
          setPlaying(false);
          return;
        }
        await startPlayback(audio, attempt);
      })();
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [refetch, fail, startPlayback, publishProgress]);

  const toggle = useCallback(
    (sceneId: string) => {
      const audio = audioRef.current;
      if (!audio) return;
      const current = attemptRef.current;

      // Même scène, tentative encore ouverte. Une tentative close sur un message
      // n'est pas reprise : le clic en ouvre une nouvelle, comme pour une autre scène.
      if (current && current.sceneId === sceneId && !current.failed) {
        // Relance en vol : le clic vaut pause (ou annule la pause) à l'arrivée.
        if (current.retrying) {
          current.pausedByUser = !current.pausedByUser;
          return;
        }
        // Première demande en vol : on n'empile pas les tentatives.
        if (!current.ready) return;
        // Source posée : pause / reprise, à la même position, sans requête.
        if (playing) {
          audio.pause();
          setPlaying(false);
          return;
        }
        if (current.playPending) return;
        setError(null);
        void startPlayback(audio, current);
        return;
      }

      // Autre scène : la précédente s'arrête, position remise à zéro.
      audio.pause();
      if (current?.ready) audio.currentTime = 0;
      const attempt: Attempt = {
        sceneId,
        retryUsed: false,
        ready: false,
        retrying: false,
        playPending: false,
        pausedByUser: false,
        failed: false,
      };
      attemptRef.current = attempt;
      setCurrentSceneId(sceneId);
      setPlaying(false);
      setLoading(true);
      setError(null);
      publishProgress(ZERO_PROGRESS);

      void (async () => {
        const { urls, outcome } = await ensureFresh();
        if (attemptRef.current !== attempt) return;
        // L'expiration au clic a consommé la redemande de cette tentative.
        if (outcome === 'refreshed') attempt.retryUsed = true;
        const url = urls?.[sceneId];
        if (!url) {
          // Réponse absente ou sans URL pour cette scène : message, pas de
          // redemande — le serveur a dit ce qu'il avait à dire.
          fail(sceneId);
          return;
        }
        audio.src = url;
        attempt.ready = true;
        await startPlayback(audio, attempt);
      })();
    },
    [playing, ensureFresh, fail, startPlayback, publishProgress],
  );

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio || !attemptRef.current?.ready) return;
      const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
      audio.currentTime = clamped;
      publishProgress({ position: clamped, duration: progressRef.current.duration });
    },
    [publishProgress],
  );

  const release = useCallback(
    (sceneId: string) => {
      const current = attemptRef.current;
      if (!current || current.sceneId !== sceneId) return;
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      attemptRef.current = null;
      setCurrentSceneId(null);
      setPlaying(false);
      setLoading(false);
      setError(null);
      publishProgress(ZERO_PROGRESS);
    },
    [publishProgress],
  );

  const value = useMemo<ScenePlayerContextValue>(
    () => ({
      locale,
      currentSceneId,
      playing,
      loading,
      error,
      toggle,
      seek,
      release,
      subscribeProgress,
      readProgress,
    }),
    [locale, currentSceneId, playing, loading, error, toggle, seek, release, subscribeProgress, readProgress],
  );

  return (
    <ScenePlayerContext.Provider value={value}>
      {/* L'unique élément de la liste. Sans `controls`, il n'a pas de rendu :
          les contrôles visibles sont les `SceneListenControl` de chaque étape. */}
      <audio ref={audioRef} preload="none" data-testid="scene-audio" />
      {children}
    </ScenePlayerContext.Provider>
  );
}

/** État du lecteur (scène en cours…) pour marquer l'étape : `aria-current`. */
export function useScenePlayer(): Pick<ScenePlayerContextValue, 'currentSceneId' | 'playing'> {
  const ctx = useContext(ScenePlayerContext);
  return { currentSceneId: ctx?.currentSceneId ?? null, playing: ctx?.playing ?? false };
}

export interface SceneListenControlProps {
  sceneId: string;
  title: string;
}

/**
 * Le contrôle d'une étape : Play/Pause, et — pour la scène en cours — la
 * glissière de position et les temps `m:ss`. Sans état propre : tout vient du
 * contexte. Hors `<ScenePlayer>`, ne rend rien (aucun élément à piloter).
 */
export function SceneListenControl(props: SceneListenControlProps) {
  const ctx = useContext(ScenePlayerContext);
  if (!ctx) return null;
  return <SceneListenControlInner {...props} ctx={ctx} />;
}

function SceneListenControlInner({
  sceneId,
  title,
  ctx,
}: SceneListenControlProps & { ctx: ScenePlayerContextValue }) {
  const { locale, currentSceneId, playing, loading, error, toggle, release } = ctx;
  const copy = SCENE_PLAYER_COPY[locale];
  const isCurrent = currentSceneId === sceneId;
  const isPlaying = isCurrent && playing;
  const isLoading = isCurrent && loading;
  const sceneError = error && error.sceneId === sceneId ? error.message : null;
  const label = isLoading ? copy.loading : isPlaying ? copy.pause : copy.listen;

  // Le contrôle de la scène en cours disparaît (déconnexion, accès perdu,
  // liste changée) : la lecture s'arrête avec lui. Sans effet quand une autre
  // scène a simplement pris la main — `release` ne touche que sa propre scène.
  useEffect(() => {
    if (!isCurrent) return;
    return () => release(sceneId);
  }, [isCurrent, sceneId, release]);

  return (
    <div
      data-testid={`scene-listen-${sceneId}`}
      style={{ marginTop: tg.space[2], display: 'flex', flexDirection: 'column', gap: tg.space[2] }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: tg.space[3], flexWrap: 'wrap' }}>
        <Button
          variant="ghost"
          size="sm"
          aria-busy={isLoading || undefined}
          accessibilityLabel={
            isLoading ? copy.loading : isPlaying ? copy.pauseTitle(title) : copy.listenTo(title)
          }
          testID={`scene-listen-button-${sceneId}`}
          iconLeft={
            isPlaying ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )
          }
          onClick={() => toggle(sceneId)}
        >
          {label}
        </Button>
        {isCurrent && <SceneProgress sceneId={sceneId} title={title} copy={copy} ctx={ctx} />}
      </div>
      {sceneError && (
        <p
          role="alert"
          data-testid={`scene-error-${sceneId}`}
          style={{
            fontFamily: tg.fonts.sans,
            fontSize: tg.fontSize.caption,
            color: tg.colors.grenadine,
            margin: 0,
          }}
        >
          {sceneError}
        </p>
      )}
    </div>
  );
}

/**
 * Temps et glissière de la scène en cours — seul composant abonné à la
 * position : la liste ne se re-rend pas à chaque `timeupdate`. Pendant le
 * glissement, la valeur est locale ; l'élément n'est déplacé qu'au relâchement.
 */
function SceneProgress({
  sceneId,
  title,
  copy,
  ctx,
}: {
  sceneId: string;
  title: string;
  copy: SceneCopy;
  ctx: ScenePlayerContextValue;
}) {
  const { seek, subscribeProgress, readProgress } = ctx;
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [dragValue, setDragValue] = useState<number | null>(null);

  useEffect(() => subscribeProgress(setProgress), [subscribeProgress]);

  const max = progress.duration > 0 ? Math.floor(progress.duration) : 0;
  const shown = dragValue ?? progress.position;
  const commit = () => {
    if (dragValue === null) return;
    seek(dragValue);
    setDragValue(null);
  };

  return (
    <>
      <span
        data-testid={`scene-time-${sceneId}`}
        style={{
          fontFamily: tg.fonts.mono,
          fontSize: tg.fontSize.meta,
          color: tg.colors.ink60,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatTime(shown)} / {formatTime(progress.duration)}
      </span>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={Math.min(Math.floor(shown), max)}
        disabled={max <= 0}
        aria-label={copy.seek(title)}
        aria-valuetext={formatTime(shown)}
        onChange={(event) => setDragValue(Number(event.currentTarget.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        style={{ flexBasis: '100%', maxWidth: 360, accentColor: tg.colors.ink, margin: 0 }}
      />
    </>
  );
}
