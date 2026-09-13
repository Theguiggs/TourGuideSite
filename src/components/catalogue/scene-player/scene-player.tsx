'use client';

/**
 * LW-1 — lecteur de scène de la fiche Visite. LW-2 — mode « visite ».
 *
 * Le lecteur possède l'élément, l'itinéraire possède la liste : un contexte
 * React relie les deux pour que chaque `<li>` n'ait qu'un contrôle sans état
 * propre. Un seul `<audio>` sert toute la liste. Chaque changement d’étape
 * exige un geste du visiteur ; la fin d’une piste ne lance jamais la suivante.
 *
 * Accès : le lecteur ne joue que les URLs que la réponse serveur porte. Il ne
 * calcule rien ; une scène sans URL dans la réponse est « indisponible ».
 *
 * Redemande : au plus UNE par tentative (un clic « Écouter » sur une nouvelle
 * scène, ou la commande manuelle suivante, ouvre une tentative). Elle est
 * consommée soit par l'expiration au clic, soit par la première erreur média
 * réseau / source en cours de piste. Une seconde erreur affiche le message.
 * Jamais de boucle.
 *
 * Position et durée ne passent PAS par le contexte principal : chaque
 * `timeupdate` re-rendrait toute la liste. Elles vont par abonnement au seul
 * contrôle de la scène en cours.
 *
 * Mode visite (LW-2) : `sequence` est un état EN PLUS du lecteur LW-1, pas un
 * remplacement. Il relie les commandes de l’en-tête, la reprise et le message
 * de fin. `ended` arrête l’écoute. Le visiteur choisit ensuite une étape ou
 * la commande suivante. En bout de liste : message de fin d’aperçu (des étapes
 * verrouillées suivent) ou « visite terminée ».
 *
 * `advance` ne crée pas de chemin parallèle : `openAttempt` est la mécanique
 * unique d'une nouvelle scène (clic isolé, suivant / précédent,
 * reprise), avec `sequence` conservé. Relance unique, `pausedByUser`,
 * `release` et les messages LW-1 s'appliquent tels quels.
 *
 * Media Session : métadonnées et état de position reposés à chaque piste,
 * `playbackState` suit `playing`, actions retirées au démontage. Reprise :
 * `localStorage` par visite (scène + position, jamais d'URL), écrite au plus
 * toutes les 5 s, à la pause, au masquage de l'onglet et au démontage, lue au
 * montage, purgée quand la dernière étape jouable se termine.
 *
 * LW-3 : choix de langue, URLs traduites servies et repli sur la narration source.
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
import { AnalyticsEvents, trackEvent } from '@/lib/analytics';
import { LISTEN_ANCHOR } from './listen-link';
import { useSceneAudio } from './use-scene-audio';
import { useListeningLanguage } from './use-listening-language';
import { audioLanguageCode } from './language-policy';
import type { LanguageAudioTypes } from '@/lib/api/audio-source-policy';
import {
  applyMediaSession,
  bindMediaSessionActions,
  clearMediaSession,
  setMediaSessionPlaybackState,
  setMediaSessionPosition,
  SEEK_OFFSET_SECONDS,
} from './media-session';
import { clearResume, readResume, writeResume, pruneResumes, RESUME_CLEAR_EVENT, RESUME_CLEAR_KEY } from './resume-store';

const SERVICE_NAME = 'ScenePlayer';

/** Codes `MediaError` (la classe n'existe pas dans jsdom). */
const MEDIA_ERR_ABORTED = 1;
const MEDIA_ERR_DECODE = 3;

/** À une frontière de piste, les URLs doivent encore valoir ce temps-là, sinon on redemande d'abord. */
export const SEQUENCE_MIN_VALIDITY_MS = 5 * 60_000;
/** Rythme maximal d'écriture de la reprise pendant la lecture. */
export const RESUME_WRITE_INTERVAL_MS = 5_000;
/**
 * Une reprise qui tombe dans la dernière seconde d'une piste repart de zéro :
 * poser la position là déclencherait `ended`, voire « Visite terminée »,
 * sur une piste jamais jouée.
 */
export const RESUME_TAIL_GUARD_SECONDS = 1;

export type ScenePlayerLocale = 'fr' | 'en';

export const SCENE_PLAYER_COPY = {
  fr: {
    listen: 'Écouter',
    pause: 'Pause',
    loading: 'Chargement…',
    unavailable: 'Audio momentanément indisponible',
    noAudio: 'Aucun audio disponible pour cette visite pour le moment.',
    tapAgain: 'Touchez à nouveau pour lancer l’écoute',
    listenTo: (title: string) => `Écouter « ${title} »`,
    pauseTitle: (title: string) => `Mettre en pause « ${title} »`,
    seek: (title: string) => `Position dans « ${title} »`,
    playTour: 'Écouter la visite',
    resumeTour: 'Reprendre la visite',
    resumeAt: (step: number) => `Reprendre à l’étape ${step}`,
    nowPlaying: (step: number, total: number, title: string) =>
      `Étape ${step} sur ${total} : ${title}`,
    previewEnd: 'Débloquez la visite pour écouter la suite.',
    previewEndLink: 'Débloquer la visite',
    tourComplete: 'Visite terminée',
  },
  en: {
    listen: 'Listen',
    pause: 'Pause',
    loading: 'Loading…',
    unavailable: 'Audio temporarily unavailable',
    noAudio: 'No audio is available for this tour yet.',
    tapAgain: 'Tap again to start playback',
    listenTo: (title: string) => `Listen to “${title}”`,
    pauseTitle: (title: string) => `Pause “${title}”`,
    seek: (title: string) => `Position in “${title}”`,
    playTour: 'Listen to the tour',
    resumeTour: 'Resume the tour',
    resumeAt: (step: number) => `Resume at stop ${step}`,
    nowPlaying: (step: number, total: number, title: string) =>
      `Stop ${step} of ${total}: ${title}`,
    previewEnd: 'Unlock the tour to keep listening.',
    previewEndLink: 'Unlock the tour',
    tourComplete: 'Tour complete',
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

/** Une étape de la liste jouable : servie ET narrée, dans l'ordre d'affichage. */
export interface PlaylistEntry {
  id: string;
  title: string;
  /** Numéro affiché de l'étape ; à défaut, son rang dans la liste jouable. */
  order?: number;
}

/** Comment la séquence s'est terminée. */
export type SequenceEnding =
  /** La dernière étape jouable est finie et des étapes verrouillées suivent. */
  | 'preview-end'
  /** La dernière étape de la visite est finie. */
  | 'complete';

export interface ResumeOffer {
  sceneId: string;
  language?: string;
  position: number;
  /** Numéro d'étape à afficher. */
  step: number;
}

interface ScenePlayerContextValue {
  languageOptions: readonly string[];
  selectedLanguage: string;
  baseLanguage: string;
  languageAudioTypes?: LanguageAudioTypes;
  fallbackCount: number;
  languageStatus: 'idle' | 'loading' | 'ready' | 'error';
  changeLanguage(language: string): void;
  retryLanguages(): void;
  keyboardSeek(offset: number): void;
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
  // LW-2
  playlist: readonly PlaylistEntry[];
  sequence: boolean;
  ending: SequenceEnding | null;
  resumeOffer: ResumeOffer | null;
  /** Lance la visite : depuis `fromSceneId` (à `position`), sinon depuis l'étape en cours, sinon la première. */
  startSequence(fromSceneId?: string, position?: number): void;
  next(): void;
  previous(): void;
}

const ScenePlayerContext = createContext<ScenePlayerContextValue | null>(null);

/**
 * Une tentative = un clic « Écouter » sur une scène qui n'est pas la scène
 * courante — ou, en séquence, une nouvelle piste. `retryUsed` est le compteur
 * de redemande : une seule par tentative.
 */
interface Attempt {
  language?: string;
  completed?: boolean;
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

interface OpenAttemptOptions {
  autoplay?: boolean;
  resumeLanguage?: string;
  /** Validité restante exigée des URLs (frontière de piste). */
  minValidityMs?: number;
  /** Position de départ (reprise). */
  position?: number;
}

interface PlayerActions {
  play(): void;
  pause(): void;
  next(): void;
  previous(): void;
  seek(seconds: number): void;
  seekBy(offsetSeconds: number): void;
}

/** Position de reprise en attente de la durée (`loadedmetadata`). */
interface PendingSeek {
  attempt: Attempt;
  position: number;
}

const ZERO_PROGRESS: Progress = { position: 0, duration: 0 };
const EMPTY_PLAYLIST: readonly PlaylistEntry[] = [];
const NO_ACTIONS: PlayerActions = {
  play() {},
  pause() {},
  next() {},
  previous() {},
  seek() {},
  seekBy() {},
};

function errorName(error: unknown): string {
  return typeof error === 'object' && error !== null && 'name' in error
    ? String((error as { name: unknown }).name)
    : '';
}

export interface ScenePlayerProps {
  tourId: string;
  cityId?: string;
  audioLanguage?: string;
  languageAudioTypes?: LanguageAudioTypes;
  locale?: ScenePlayerLocale;
  /** LW-2 — étapes servies et narrées, dans l'ordre d'affichage. */
  playlist?: readonly PlaylistEntry[];
  /** LW-2 — des étapes verrouillées suivent la liste jouable (fin d'aperçu). */
  lockedAfter?: boolean;
  /** LW-2 — titre de la visite (Media Session). */
  tourTitle?: string;
  /**
   * LW-2 — faux tant que la liste jouable peut encore s'ouvrir (redemande de
   * l'acheteur en vol) : une reprise sur une étape encore verrouillée n'est
   * ni proposée ni purgée avant que le serveur ait répondu.
   */
  playlistSettled?: boolean;
  children: ReactNode;
}

/**
 * Une visite = une instance : changer de `tourId` remonte le lecteur à neuf
 * (état, tentative, élément, séquence, Media Session). La piste de la visite
 * précédente ne survit pas, et rien de ce qu'elle avait obtenu ne sert à la
 * suivante.
 */
export function ScenePlayer(props: ScenePlayerProps) {
  return <ScenePlayerInstance key={props.tourId} {...props} />;
}

function ScenePlayerInstance({
  tourId,
  cityId = 'unknown',
  audioLanguage = 'und',
  languageAudioTypes,
  locale = 'fr',
  playlist: playlistProp,
  lockedAfter = false,
  tourTitle = '',
  playlistSettled = true,
  children,
}: ScenePlayerProps) {
  const playlist = playlistProp ?? EMPTY_PLAYLIST;
  const baseLanguage = audioLanguageCode(audioLanguage) ?? 'und';
  const { ensureFresh, refetch, readCoverUrl, inventory, languageStatus, readInventory, resolveAudio } = useSceneAudio(tourId, playlistSettled && playlist.length > 0);
  const listeningLanguage = useListeningLanguage(tourId, baseLanguage, locale, playlist.map((entry) => entry.id), inventory, readInventory);
  const { readSelection, select: selectLanguage } = listeningLanguage;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const attemptRef = useRef<Attempt | null>(null);
  const progressRef = useRef<Progress>(ZERO_PROGRESS);
  const listenersRef = useRef(new Set<ProgressListener>());
  // Lus depuis les gestionnaires d'événements média : toujours la liste courante.
  const playlistRef = useRef(playlist);
  const lockedAfterRef = useRef(lockedAfter);
  const sequenceRef = useRef(false);
  const lastResumeWriteRef = useRef(0);
  const actionsRef = useRef<PlayerActions>(NO_ACTIONS);
  const pendingSeekRef = useRef<PendingSeek | null>(null);
  const listenSessionRef = useRef<{ from: 'purchases' | 'tour_page' | 'resume'; started: boolean }>({ from: 'tour_page', started: false });
  const anchorHandledRef = useRef(false);
  const entryFromRef = useRef<'purchases' | 'tour_page'>('tour_page');

  // La mesure ne doit jamais interrompre la lecture si le transport lève.
  const measure = useCallback((event: Parameters<typeof trackEvent>[0], properties?: Record<string, unknown>) => {
    try { trackEvent(event, { tour_id: tourId, city_id: cityId, ...properties }); }
    catch { /* L’écoute prime sur la télémétrie. */ }
  }, [tourId, cityId]);
  // Une réponse peut arriver après le démontage : l'élément est alors détaché,
  // le faire jouer n'annonce rien et la reprise écrite viserait la mauvaise scène.
  const mountedRef = useRef(true);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ScenePlayerError | null>(null);
  const [sequence, setSequenceState] = useState(false);
  const [ending, setEnding] = useState<SequenceEnding | null>(null);
  const [resumeCandidate, setResumeCandidate] = useState<{ sceneId: string; position: number; language?: string } | null>(
    null,
  );
  const copy = SCENE_PLAYER_COPY[locale];

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    playlistRef.current = playlist;
    lockedAfterRef.current = lockedAfter;
  }, [playlist, lockedAfter]);

  // Le mode visite est silencieux quand la liste manque : le bouton d'en-tête
  // disparaît sans rien dire. En développement, on le dit.
  useEffect(() => {
    if (playlistProp === undefined && process.env.NODE_ENV !== 'production') {
      logger.warn(SERVICE_NAME, 'playlist absente : le mode visite est inactif', { tourId });
    }
  }, [playlistProp, tourId]);

  const setSequence = useCallback((value: boolean) => {
    sequenceRef.current = value;
    setSequenceState(value);
  }, []);

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

  /**
   * Position et durée vers l'écran verrouillé. Sans cet état, la notification
   * n'affiche ni curseur ni durée — et `seekto`, faute de glissière à saisir,
   * n'est atteignable par personne.
   */
  const publishPositionState = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setMediaSessionPosition({
      duration: audio.duration,
      position: audio.currentTime,
      playbackRate: audio.playbackRate,
    });
  }, []);

  /** Message sur la scène : la tentative est close et, en séquence, la séquence s'arrête. */
  const fail = useCallback(
    (sceneId: string, message: string = copy.unavailable) => {
      const current = attemptRef.current;
      if (current && current.sceneId === sceneId) current.failed = true;
      setSequence(false);
      setPlaying(false);
      setLoading(false);
      setError({ sceneId, message });
    },
    [copy.unavailable, setSequence],
  );

  /** Lance la lecture de la `src` posée. Un seul `play()` en vol par tentative. */
  const startPlayback = useCallback(
    async (audio: HTMLAudioElement, attempt: Attempt) => {
      if (attempt.playPending) return;
      attempt.pausedByUser = false;
      attempt.playPending = true;
      attempt.completed = false;
      try {
        await audio.play();
        if (attemptRef.current !== attempt) return;
        if (!listenSessionRef.current.started) {
          listenSessionRef.current.started = true;
          measure(AnalyticsEvents.WEB_LISTEN_START, { language: attempt.language ?? baseLanguage, from: listenSessionRef.current.from });
        }
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
    [fail, copy.tapAgain, measure, baseLanguage],
  );

  const titleOf = useCallback(
    (sceneId: string) => playlistRef.current.find((entry) => entry.id === sceneId)?.title ?? tourTitle,
    [tourTitle],
  );

  /**
   * La mécanique unique d'une nouvelle scène : la précédente s'arrête, une
   * tentative s'ouvre, les URLs sont vérifiées (ou redemandées), la source est
   * posée, la lecture part. `sequence` n'est pas touché : un clic isolé le
   * laisse faux, une commande suivante le laisse vrai.
   */
  const openAttempt = useCallback(
    async (sceneId: string, options: OpenAttemptOptions = {}) => {
      const audio = audioRef.current;
      if (!audio) return;
      const current = attemptRef.current;

      audio.pause();
      if (current?.ready) audio.currentTime = 0;
      const attempt: Attempt = {
        sceneId,
        retryUsed: false,
        ready: false,
        retrying: false,
        playPending: false,
        pausedByUser: options.autoplay === false,
        failed: false,
      };
      attemptRef.current = attempt;
      pendingSeekRef.current = null;
      // La première position de la nouvelle piste s'écrit sans attendre : la
      // reprise ne doit pas rester sur la scène précédente.
      lastResumeWriteRef.current = 0;
      setCurrentSceneId(sceneId);
      setPlaying(false);
      setLoading(true);
      setError(null);
      setEnding(null);
      setResumeCandidate(null);
      publishProgress(ZERO_PROGRESS);

      const { urls, outcome } = await ensureFresh({ minValidityMs: options.minValidityMs });
      // Démonté entre-temps (navigation, changement de visite) : l'élément est
      // détaché, plus rien à lancer ni à annoncer.
      if (!mountedRef.current || attemptRef.current !== attempt) return;
      // L'expiration au clic (ou à la frontière) a consommé la redemande de cette tentative.
      if (outcome === 'refreshed') attempt.retryUsed = true;
      const resolved = urls ? resolveAudio(sceneId, readSelection(), baseLanguage) : null;
      if (!resolved) {
        // Réponse absente ou sans URL pour cette scène : message, pas de
        // redemande — le serveur a dit ce qu'il avait à dire.
        fail(sceneId);
        return;
      }
      audio.src = resolved.url;
      attempt.language = resolved.language;
      const startAt = options.resumeLanguage && options.resumeLanguage !== resolved.language ? 0 : options.position ?? 0;
      if (startAt > 0) {
        // La position n'est POSÉE qu'une fois la durée connue : avec
        // `preload="none"`, rien ne dit encore où la piste finit, et une
        // narration republiée plus courte ferait démarrer la lecture après sa
        // propre fin. L'affichage, lui, montre tout de suite où l'on reprend.
        pendingSeekRef.current = { attempt, position: startAt };
        publishProgress({ position: startAt, duration: 0 });
      }
      attempt.ready = true;
      applyMediaSession({ title: titleOf(sceneId), artist: tourTitle, artwork: readCoverUrl() });
      publishPositionState();
      if (options.autoplay !== false) await startPlayback(audio, attempt);
      else setLoading(false);
    },
    [
      ensureFresh,
      fail,
      startPlayback,
      publishProgress,
      publishPositionState,
      readCoverUrl,
      titleOf,
      tourTitle,
      resolveAudio,
      readSelection,
      baseLanguage,
    ],
  );

  /** Fin de la liste jouable : la séquence s'arrête sur un message, la reprise est purgée. */
  const finishSequence = useCallback(
    (reason: SequenceEnding) => {
      setSequence(false);
      setEnding(reason);
      clearResume(tourId);
    },
    [setSequence, tourId],
  );

  // Reprise : lue au montage (jamais au rendu serveur — `localStorage` n'y
  // existe pas, et une pastille rendue d'un seul côté ferait diverger l'hydratation).
  useEffect(() => {
    pruneResumes();
    const entry = readResume(tourId);
    if (entry) setResumeCandidate({ sceneId: entry.sceneId, position: entry.position, language: entry.language });
  }, [tourId]);

  const resumeIndex = resumeCandidate
    ? playlist.findIndex((entry) => entry.id === resumeCandidate.sceneId)
    : -1;

  // Scène mémorisée absente de la liste jouable (verrouillée, retirée) : pas de
  // pastille, et la clé est purgée — une fois la liste stabilisée.
  useEffect(() => {
    if (!resumeCandidate || resumeIndex >= 0 || !playlistSettled) return;
    clearResume(tourId);
    setResumeCandidate(null);
  }, [resumeCandidate, resumeIndex, playlistSettled, tourId]);

  const resumeOffer = useMemo<ResumeOffer | null>(() => {
    if (!resumeCandidate || resumeIndex < 0 || currentSceneId !== null) return null;
    return {
      sceneId: resumeCandidate.sceneId,
      language: resumeCandidate.language,
      position: resumeCandidate.position,
      step: playlist[resumeIndex]?.order ?? resumeIndex + 1,
    };
  }, [resumeCandidate, resumeIndex, currentSceneId, playlist]);

  // Démontage (navigation, changement de visite) : la position est mémorisée,
  // la piste s'arrête, et le téléchargement en cours avec elle.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      const attempt = attemptRef.current;
      if (attempt?.ready && !attempt.failed && !attempt.completed && !audio.ended && audio.currentTime > 0) {
        writeResume(tourId, { sceneId: attempt.sceneId, position: audio.currentTime, language: attempt.language });
      }
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, [tourId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reprise : au plus une écriture toutes les 5 s pendant la lecture ; à la
    // pause, tout de suite. Jamais pour une piste finie (la suivante, ou la
    // purge, prend le relais).
    const persistResume = (force: boolean) => {
      const attempt = attemptRef.current;
      if (!attempt || !attempt.ready || attempt.failed || attempt.completed || audio.ended) return;
      const now = Date.now();
      if (!force && now - lastResumeWriteRef.current < RESUME_WRITE_INTERVAL_MS) return;
      lastResumeWriteRef.current = now;
      writeResume(tourId, { sceneId: attempt.sceneId, position: audio.currentTime, language: attempt.language });
    };

    const onTimeUpdate = () => {
      publishProgress({ position: audio.currentTime, duration: progressRef.current.duration });
      persistResume(false);
    };
    const onDuration = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const pending = pendingSeekRef.current;
      if (pending && pending.attempt === attemptRef.current) {
        // La durée est connue : la reprise peut enfin être posée — ou
        // abandonnée si elle tombe après la fin de la piste (narration
        // republiée plus courte, position à la toute fin).
        pendingSeekRef.current = null;
        const safe =
          duration > 0 && pending.position > duration - RESUME_TAIL_GUARD_SECONDS
            ? 0
            : pending.position;
        audio.currentTime = safe;
        publishProgress({ position: safe, duration });
      } else {
        publishProgress({ position: progressRef.current.position, duration });
      }
      publishPositionState();
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      persistResume(true);
    };
    // Onglet masqué ou page quittée : sur mobile, l'onglet peut être tué sans
    // rien d'autre. Sans cette écriture, jusqu'à 5 s d'écoute sont perdues.
    const onPageHide = () => persistResume(true);
    const onEnded = () => {
      const attempt = attemptRef.current;
      if (!attempt || !attempt.ready || attempt.failed || attempt.completed) return;
      attempt.completed = true;
      const completedIndex = playlistRef.current.findIndex((entry) => entry.id === attempt.sceneId);
      if (completedIndex >= 0) measure(AnalyticsEvents.WEB_SCENE_COMPLETE, { scene_order: playlistRef.current[completedIndex].order ?? completedIndex + 1 });
      setPlaying(false);
      publishProgress({ position: 0, duration: progressRef.current.duration });
      // Le visiteur choisit chaque étape à son arrivée. Même en mode visite,
      // la fin ne charge ni ne joue la piste suivante.
      const list = playlistRef.current;
      const index = list.findIndex((entry) => entry.id === attempt.sceneId);
      if (index < 0) {
        setSequence(false);
        return;
      }
      const next = list[index + 1];
      if (next) {
        // Pendant la marche, mémoriser l’étape à écouter sans charger son audio.
        const language = resolveAudio(next.id, readSelection(), baseLanguage)?.language ?? baseLanguage;
        writeResume(tourId, { sceneId: next.id, position: 0, language });
        return;
      }
      clearResume(tourId);
      if (!sequenceRef.current) return;
      if (!lockedAfterRef.current) measure(AnalyticsEvents.WEB_LISTEN_COMPLETE);
      finishSequence(lockedAfterRef.current ? 'preview-end' : 'complete');
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
        const resolved = urls ? resolveAudio(attempt.sceneId, readSelection(), baseLanguage) : null;
        if (!resolved) {
          fail(attempt.sceneId);
          return;
        }
        audio.src = resolved.url;
        const position = resolved.language === attempt.language ? resumeAt : 0;
        attempt.language = resolved.language;
        audio.currentTime = position;
        publishProgress({ position, duration: progressRef.current.duration });
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
    window.addEventListener('pagehide', onPageHide);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [
    tourId,
    measure,
    resolveAudio,
    readSelection,
    baseLanguage,
    refetch,
    fail,
    startPlayback,
    publishProgress,
    publishPositionState,
    openAttempt,
    finishSequence,
    setSequence,
  ]);

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

      // Autre scène : la précédente s'arrête, position remise à zéro. En
      // séquence, la visite continue depuis celle-ci ; hors séquence, elle
      // se joue seule.
      if (!sequenceRef.current) {
        listenSessionRef.current = { from: entryFromRef.current, started: false };
        entryFromRef.current = 'tour_page';
      }
      anchorHandledRef.current = true;
      void openAttempt(sceneId);
    },
    [playing, startPlayback, openAttempt],
  );

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio || !attemptRef.current?.ready) return;
      // La glissière ne dépasse jamais la durée, mais `seekto` vient de
      // l'extérieur : un saut au-delà de la fin déclencherait `ended`, donc
      // le message de fin, sur une piste qu'on n'a pas écoutée.
      const known = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      const duration = known > 0 ? known : progressRef.current.duration;
      let target = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
      if (duration > 0) target = Math.min(target, duration);
      // Un saut explicite l'emporte sur une reprise encore en attente de durée.
      pendingSeekRef.current = null;
      audio.currentTime = target;
      publishProgress({ position: target, duration: progressRef.current.duration });
      publishPositionState();
    },
    [publishProgress, publishPositionState],
  );

  /** Saut relatif (`seekbackward` / `seekforward` de l'écran verrouillé). */
  const seekBy = useCallback(
    (offsetSeconds: number) => {
      const audio = audioRef.current;
      if (!audio || !attemptRef.current?.ready) return;
      seek(audio.currentTime + offsetSeconds);
    },
    [seek],
  );

  const release = useCallback(
    (sceneId: string) => {
      const current = attemptRef.current;
      if (!current || current.sceneId !== sceneId) return;
      const audio = audioRef.current;
      if (audio) {
        // Ce qui se ferme ici, c'est l'accès (déconnexion, liste servie qui
        // rétrécit), pas la visite : la position se garde, comme au démontage.
        if (current.ready && !current.failed && !current.completed && !audio.ended && audio.currentTime > 0) {
          writeResume(tourId, { sceneId: current.sceneId, position: audio.currentTime, language: current.language });
        }
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      attemptRef.current = null;
      pendingSeekRef.current = null;
      // Sans cela, l'écran verrouillé continue d'annoncer — et de proposer de
      // reprendre — une piste que plus rien ne peut jouer.
      clearMediaSession();
      setMediaSessionPlaybackState('none');
      setSequence(false);
      setCurrentSceneId(null);
      setPlaying(false);
      setLoading(false);
      setError(null);
      publishProgress(ZERO_PROGRESS);
    },
    [publishProgress, setSequence, tourId],
  );

  useEffect(() => {
    const clear = () => {
      // Invalider AVANT pause : ni son événement ni le démontage ne doivent réécrire.
      const current = attemptRef.current;
      if (current) current.failed = true;
      if (current) release(current.sceneId);
      setResumeCandidate(null);
      anchorHandledRef.current = true;
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === RESUME_CLEAR_KEY) clear();
    };
    window.addEventListener(RESUME_CLEAR_EVENT, clear);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(RESUME_CLEAR_EVENT, clear);
      window.removeEventListener('storage', onStorage);
    };
  }, [release]);

  /** Reprend la scène en cours (Media Session `play`, bouton de visite). */
  const resumeCurrent = useCallback(() => {
    const audio = audioRef.current;
    const current = attemptRef.current;
    if (!audio || !current || current.failed) return;
    if (current.retrying) {
      // Relance en vol : une pause demandée pendant son voyage est annulée, et
      // la lecture partira à l'arrivée de la source. Sans cela, « Écouter la
      // visite » bascule en mode visite sans que rien ne démarre.
      current.pausedByUser = false;
      return;
    }
    if (!current.ready || current.playPending) return;
    setError(null);
    void startPlayback(audio, current);
  }, [startPlayback]);

  /** Met en pause la scène en cours (Media Session `pause`). */
  const pauseCurrent = useCallback(() => {
    const audio = audioRef.current;
    const current = attemptRef.current;
    if (!audio || !current || current.failed) return;
    if (current.retrying) {
      current.pausedByUser = true;
      return;
    }
    audio.pause();
    setPlaying(false);
  }, []);

  /**
   * Piste suivante — bouton, écouteurs, écran verrouillé. Cette commande
   * manuelle lance une seule étape et conserve les contrôles de visite.
   * La marge de validité permet d’écouter la narration demandée.
   */
  const next = useCallback(() => {
    const current = attemptRef.current;
    if (!current) return;
    const list = playlistRef.current;
    const index = list.findIndex((entry) => entry.id === current.sceneId);
    if (index < 0) return;
    const target = list[index + 1];
    if (!target) {
      // Même frontière que `ended` : on la dit plutôt que de l'avaler. Et on
      // arrête la piste en cours : « passer » depuis l'écran verrouillé est un
      // geste d'avance, pas de reprise — laisser le son courir sous un message
      // qui annonce la fin ferait dire au lecteur le contraire de ce qu'on
      // entend. Après `ended`, il n'y a rien à arrêter : ce chemin-là est le
      // seul à en avoir besoin.
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        setPlaying(false);
      }
      finishSequence(lockedAfterRef.current ? 'preview-end' : 'complete');
      return;
    }
    setSequence(true);
    void openAttempt(target.id, { minValidityMs: SEQUENCE_MIN_VALIDITY_MS });
  }, [openAttempt, finishSequence, setSequence]);

  const previous = useCallback(() => {
    const current = attemptRef.current;
    if (!current) return;
    const list = playlistRef.current;
    const index = list.findIndex((entry) => entry.id === current.sceneId);
    if (index < 0) return;
    setSequence(true);
    if (index > 0) {
      void openAttempt(list[index - 1].id, { minValidityMs: SEQUENCE_MIN_VALIDITY_MS });
      return;
    }
    // En tête de liste : la première repart de zéro.
    const audio = audioRef.current;
    if (!audio || !current.ready || current.failed) {
      void openAttempt(current.sceneId, { minValidityMs: SEQUENCE_MIN_VALIDITY_MS });
      return;
    }
    pendingSeekRef.current = null;
    audio.currentTime = 0;
    publishProgress({ position: 0, duration: progressRef.current.duration });
    publishPositionState();
    if (!playing) resumeCurrent();
  }, [
    openAttempt,
    publishProgress,
    publishPositionState,
    playing,
    resumeCurrent,
    setSequence,
  ]);

  const startSequence = useCallback(
    (fromSceneId?: string, position?: number) => {
      const list = playlistRef.current;
      setEnding(null);
      if (fromSceneId !== undefined) {
        // Reprise : seulement une scène encore jouable.
        if (!list.some((entry) => entry.id === fromSceneId)) return;
        anchorHandledRef.current = true;
        listenSessionRef.current = { from: 'resume', started: false };
        entryFromRef.current = 'tour_page';
        setSequence(true);
        void openAttempt(fromSceneId, { position, resumeLanguage: resumeCandidate?.language ?? baseLanguage });
        return;
      }
      const current = attemptRef.current;
      if (
        ending === null &&
        current &&
        !current.failed &&
        list.some((entry) => entry.id === current.sceneId)
      ) {
        // Une étape déjà en cours (isolée, ou en pause) : la visite continue
        // depuis elle. Une relance en vol compte comme à l'arrêt : `playing`
        // est peut-être encore vrai, mais c'est `pausedByUser` qui décide —
        // et `resumeCurrent` l'efface.
        setSequence(true);
        if (current.retrying || !playing) resumeCurrent();
        return;
      }
      // Rien en cours, ou une séquence finie : la visite (re)part de la première étape.
      const first = list[0];
      if (!first) return;
      listenSessionRef.current = { from: entryFromRef.current, started: false };
      entryFromRef.current = 'tour_page';
      anchorHandledRef.current = true;
      setSequence(true);
      void openAttempt(first.id);
    },
    [openAttempt, resumeCurrent, playing, ending, setSequence, resumeCandidate, baseLanguage],
  );

  const changeLanguage = useCallback((language: string) => {
    if (!selectLanguage(language)) return;
    const current = attemptRef.current;
    if (!current) return;
    const autoplay = !current.pausedByUser && (playing || loading);
    listenSessionRef.current.started = false;
    void openAttempt(current.sceneId, { autoplay });
  }, [selectLanguage, openAttempt, playing, loading]);

  const retryLanguages = useCallback(() => { void refetch(); }, [refetch]);

  // L’ancre ne vaut pas permission d’autoplay : une seule tentative, avec repli LW-1.
  useEffect(() => {
    const enter = () => {
      if (window.location.hash !== LISTEN_ANCHOR || anchorHandledRef.current) return;
      entryFromRef.current = 'purchases';
      if (!playlistSettled || playlist.length === 0) return;
      const entry = readResume(tourId);
      const canResume = entry && playlist.some((scene) => scene.id === entry.sceneId);
      if (canResume && (!resumeOffer || resumeOffer.sceneId !== entry.sceneId || resumeOffer.position !== entry.position || resumeOffer.language !== entry.language)) {
        setResumeCandidate({ sceneId: entry.sceneId, position: entry.position, language: entry.language });
        return;
      }
      if (canResume) anchorHandledRef.current = true;
      else anchorHandledRef.current = true;
      const target = document.querySelector<HTMLButtonElement>(canResume ? '[data-testid="tour-resume-button"]' : '[data-testid="tour-play-button"]');
      target?.focus();
    };
    enter();
    window.addEventListener('hashchange', enter);
    return () => window.removeEventListener('hashchange', enter);
  }, [playlistSettled, playlist, tourId, startSequence, resumeOffer]);

  // Media Session : les gestionnaires sont posés une fois et lisent toujours
  // les actions du dernier rendu ; ils sont retirés au démontage, avec les
  // métadonnées. `playbackState` suit `playing`.
  useEffect(() => {
    actionsRef.current = { play: resumeCurrent, pause: pauseCurrent, next, previous, seek, seekBy };
  }, [resumeCurrent, pauseCurrent, next, previous, seek, seekBy]);

  useEffect(() => {
    const unbind = bindMediaSessionActions({
      play: () => actionsRef.current.play(),
      pause: () => actionsRef.current.pause(),
      previoustrack: () => actionsRef.current.previous(),
      nexttrack: () => actionsRef.current.next(),
      seekto: (details) => {
        if (typeof details.seekTime === 'number') actionsRef.current.seek(details.seekTime);
      },
      // Reculer de dix secondes est LE geste de la narration : une phrase
      // manquée se rattrape sans rouvrir le téléphone.
      seekbackward: (details) => {
        const offset = typeof details.seekOffset === 'number' ? details.seekOffset : SEEK_OFFSET_SECONDS;
        actionsRef.current.seekBy(-offset);
      },
      seekforward: (details) => {
        const offset = typeof details.seekOffset === 'number' ? details.seekOffset : SEEK_OFFSET_SECONDS;
        actionsRef.current.seekBy(offset);
      },
    });
    return () => {
      unbind();
      clearMediaSession();
    };
  }, []);

  useEffect(() => {
    if (currentSceneId === null) return;
    setMediaSessionPlaybackState(playing ? 'playing' : 'paused');
  }, [playing, currentSceneId]);

  const value = useMemo<ScenePlayerContextValue>(
    () => ({
      locale,
      languageOptions: listeningLanguage.available,
      selectedLanguage: listeningLanguage.selected,
      baseLanguage,
      languageAudioTypes,
      fallbackCount: listeningLanguage.fallbackCount,
      languageStatus,
      changeLanguage,
      retryLanguages,
      keyboardSeek: seekBy,
      currentSceneId,
      playing,
      loading,
      error,
      toggle,
      seek,
      release,
      subscribeProgress,
      readProgress,
      playlist,
      sequence,
      ending,
      resumeOffer,
      startSequence,
      next,
      previous,
    }),
    [
      locale,
      listeningLanguage.available,
      listeningLanguage.selected,
      listeningLanguage.fallbackCount,
      baseLanguage,
      languageAudioTypes,
      languageStatus,
      changeLanguage,
      retryLanguages,
      seekBy,
      currentSceneId,
      playing,
      loading,
      error,
      toggle,
      seek,
      release,
      subscribeProgress,
      readProgress,
      playlist,
      sequence,
      ending,
      resumeOffer,
      startSequence,
      next,
      previous,
    ],
  );

  return (
    <ScenePlayerContext.Provider value={value}>
      {/* L'unique élément de la liste. Sans `controls`, il n'a pas de rendu :
          les contrôles visibles sont les `SceneListenControl` de chaque étape
          et le `TourPlayControl` d'en-tête. */}
      <audio ref={audioRef} preload="none" data-testid="scene-audio" />
      {children}
    </ScenePlayerContext.Provider>
  );
}

/** État du lecteur (scène en cours, séquence…) pour marquer et suivre l'étape. */
export function useScenePlayer(): Pick<ScenePlayerContextValue, 'currentSceneId' | 'playing' | 'sequence'> {
  const ctx = useContext(ScenePlayerContext);
  return {
    currentSceneId: ctx?.currentSceneId ?? null,
    playing: ctx?.playing ?? false,
    sequence: ctx?.sequence ?? false,
  };
}

/**
 * Ce dont l'en-tête de visite a besoin, et rien de plus — le contexte lui-même
 * ne sort pas du module. `null` hors `<ScenePlayer>` : il n'y a pas de lecteur
 * à piloter.
 */
export type TourPlayerView = Pick<
  ScenePlayerContextValue,
  | 'locale'
  | 'playlist'
  | 'sequence'
  | 'playing'
  | 'loading'
  | 'currentSceneId'
  | 'ending'
  | 'resumeOffer'
  | 'startSequence'
  | 'next'
  | 'toggle'
  | 'keyboardSeek'
  | 'languageOptions'
  | 'selectedLanguage'
  | 'baseLanguage'
  | 'languageAudioTypes'
  | 'fallbackCount'
  | 'languageStatus'
  | 'changeLanguage'
  | 'retryLanguages'
>;

export function useTourPlayer(): TourPlayerView | null {
  return useContext(ScenePlayerContext);
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
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          if (isCurrent) ctx.keyboardSeek(event.key === 'ArrowLeft' ? -10 : 10);
        } else if (event.key === ' ' && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          if (!event.repeat) toggle(sceneId);
        }
      }}
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
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          event.stopPropagation();
          setDragValue(null);
          ctx.keyboardSeek(event.key === 'ArrowLeft' ? -10 : 10);
        }}
        onChange={(event) => setDragValue(Number(event.currentTarget.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        style={{ flexBasis: '100%', maxWidth: 360, accentColor: tg.colors.ink, margin: 0 }}
      />
    </>
  );
}
