'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes } from '@/lib/api/studio';
import { withPublishedStatus } from '@/lib/studio/published-status';
import { StepNav } from '@/components/studio/wizard';
import { submitForReview, retractSubmission, deleteSession } from '@/lib/api/studio-submission';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { shouldUseStubs } from '@/config/api-mode';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';
import { S3Image } from '@/components/studio/s3-image';
import { ReviewFeedbackPanel } from '@/components/studio/review-feedback-panel';
import dynamic from 'next/dynamic';
import { AudioPlayerBar } from '@/components/studio/audio-player';
import type { StudioSession, StudioScene } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';
import { ConfirmDialog } from '@/components/ui/Dialog';

// Dynamic import for Leaflet map (no SSR — browser-only)
const PreviewMap = dynamic(() => import('@/components/studio/preview-map').then((m) => ({ default: m.PreviewMap })), {
  ssr: false,
  loading: () => <div className="bg-paper-soft rounded-lg h-64 animate-pulse" />,
});

const SERVICE_NAME = 'PreviewPage';

export default function PreviewPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();
  const { t } = useStudioLocale();

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetracting, setIsRetracting] = useState(false);
  const [viewMode, setViewMode] = useState<'studio' | 'catalogue'>('studio');
  // Refs mirror the playlist state so the audio-service subscriber reads the
  // latest values (not stale closures) when it fires synchronously inside play().
  const isPlayingAllRef = useRef(false);
  const playingIndexRef = useRef<number | null>(null);
  // Itinerary overrides — read from the same localStorage keys the Itinerary
  // editor writes to, so the preview shows the manual route, waypoints, and
  // any imported GPX path.
  const [itineraryWaypoints, setItineraryWaypoints] = useState<
    { id: string; lat: number; lng: number; afterPoiIndex: number; order: number }[]
  >([]);
  const [itineraryManualMode, setItineraryManualMode] = useState(false);
  const [itineraryPathOverride, setItineraryPathOverride] = useState<
    { lat: number; lng: number }[] | null
  >(null);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function load() {
      try {
        const [rawSess, scns] = await Promise.all([
          getStudioSession(sessionId),
          listStudioScenes(sessionId),
        ]);
        // GuideTour.status is the source of truth for publication; a session can
        // lag at 'submitted' after an admin approval (sync best-effort). Reconcile
        // it — same pattern as the dashboard / tours list (see withPublishedStatus).
        const sess = rawSess ? (await withPublishedStatus([rawSess]))[0] : rawSess;
        if (!cancelled) {
          setSession(sess);
          const activeScenes = scns.filter((s) => !s.archived);
          setScenes(activeScenes);
          if (sess) {
            setActiveSession(sess);
          }
          logger.info(SERVICE_NAME, 'Preview loaded', { sessionId, scenesCount: scns.length });
        }
      } catch (e) {
        if (!cancelled) {
          setError('Impossible de charger la session.');
          logger.error(SERVICE_NAME, 'Load failed', { error: String(e) });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    // Itinerary overrides from localStorage (same keys as itinerary/page.tsx).
    try {
      const savedWp = localStorage.getItem(`waypoints-${sessionId}`);
      if (savedWp) setItineraryWaypoints(JSON.parse(savedWp));
    } catch { /* ignore */ }
    try {
      const savedManual = localStorage.getItem(`manualMode-${sessionId}`);
      if (savedManual === 'true') setItineraryManualMode(true);
    } catch { /* ignore */ }
    try {
      const savedOverride = localStorage.getItem(`pathOverride-${sessionId}`);
      if (savedOverride) {
        const parsed = JSON.parse(savedOverride);
        // Itinerary stores { path: LatLng[], ... }; tolerate both shapes.
        const path = Array.isArray(parsed) ? parsed : parsed?.path;
        if (Array.isArray(path) && path.length > 1) setItineraryPathOverride(path);
      }
    } catch { /* ignore */ }

    return () => {
      cancelled = true;
      audioPlayerService.stop();
      clearSession();
    };
  }, [sessionId, setActiveSession, clearSession]);

  const resolveAudioUrl = useCallback(async (key: string): Promise<string> => {
    if (!key) return '';
    // Data URLs are playable directly
    if (key.startsWith('data:')) return key;
    if (shouldUseStubs()) return key;
    try {
      return await getPlayableUrl(key);
    } catch {
      return '';
    }
  }, []);

  const getSceneAudioKey = useCallback((scene: StudioScene): string => {
    return scene.studioAudioKey || scene.originalAudioKey || '';
  }, []);

  const getSceneTitle = useCallback((scene: StudioScene): string | null => {
    return scene.title ?? null;
  }, []);

  const getSceneTranscript = useCallback((scene: StudioScene): string | null => {
    return scene.transcriptText ?? null;
  }, []);

  // Find the next scene with a playable audio URL, starting at `fromIndex`.
  // Skips scenes whose source audio key resolves to an empty string.
  const findNextPlayable = useCallback(
    async (fromIndex: number): Promise<{ index: number; url: string } | null> => {
      for (let i = fromIndex; i < scenes.length; i++) {
        const key = getSceneAudioKey(scenes[i]);
        if (!key) continue;
        const url = await resolveAudioUrl(key);
        if (url) return { index: i, url };
      }
      return null;
    },
    [scenes, resolveAudioUrl, getSceneAudioKey],
  );

  // Listen for audio end to advance playlist. Uses refs (not state) to read the
  // latest playlist mode, because audio-service notifications fire synchronously
  // inside `play()` — before React has applied any setState scheduled by the
  // caller. Reading state here would race with the user's individual-scene click.
  useEffect(() => {
    const unsub = audioPlayerService.subscribe((state) => {
      // Only auto-advance when audio ENDED NATURALLY, not when stop() was
      // called internally by play() (which fires notify with currentUrl=null).
      // Natural end: audio reached its duration → isPlaying=false but
      // currentUrl is still set, and currentTime is at/near duration.
      const endedNaturally =
        !state.isPlaying &&
        state.currentUrl !== null &&
        state.duration > 0 &&
        state.currentTime >= state.duration - 0.5;
      if (endedNaturally && isPlayingAllRef.current && playingIndexRef.current !== null) {
        findNextPlayable(playingIndexRef.current + 1).then((next) => {
          if (next) {
            playingIndexRef.current = next.index;
            setPlayingIndex(next.index);
            audioPlayerService.play(next.url);
          } else {
            isPlayingAllRef.current = false;
            playingIndexRef.current = null;
            setIsPlayingAll(false);
            setPlayingIndex(null);
            logger.info(SERVICE_NAME, 'Playlist complete');
          }
        });
      }
    });
    return unsub;
  }, [findNextPlayable]);

  const handlePlayScene = useCallback(async (index: number) => {
    const scene = scenes[index];
    const key = getSceneAudioKey(scene);
    if (!key) return;

    if (playingIndex === index) {
      audioPlayerService.pause();
      isPlayingAllRef.current = false;
      playingIndexRef.current = null;
      setPlayingIndex(null);
      setIsPlayingAll(false);
    } else {
      // Exit playlist mode synchronously so the auto-advance subscriber
      // doesn't race against our play() call below.
      isPlayingAllRef.current = false;
      playingIndexRef.current = index;
      setIsPlayingAll(false);
      const url = await resolveAudioUrl(key);
      if (!url) {
        logger.warn('PreviewPage', 'No playable audio for scene', { index, key });
        return;
      }
      audioPlayerService.play(url);
      setPlayingIndex(index);
    }
  }, [scenes, playingIndex, resolveAudioUrl, getSceneAudioKey]);

  const handlePlayAll = useCallback(async () => {
    if (isPlayingAll) {
      audioPlayerService.stop();
      isPlayingAllRef.current = false;
      playingIndexRef.current = null;
      setIsPlayingAll(false);
      setPlayingIndex(null);
      return;
    }
    const first = await findNextPlayable(0);
    if (!first) {
      logger.warn(SERVICE_NAME, 'No playable scene found for playlist');
      return;
    }
    isPlayingAllRef.current = true;
    playingIndexRef.current = first.index;
    setIsPlayingAll(true);
    setPlayingIndex(first.index);
    audioPlayerService.play(first.url);
  }, [isPlayingAll, findNextPlayable]);

  const handleSubmitForReview = useCallback(async () => {
    if (!session?.tourId) return;
    setIsSubmitting(true);
    setSubmitMessage(null);
    setIsSubmitSuccess(false);
    try {
      const result = await submitForReview(sessionId, session.tourId);
      if (result.ok) {
        setIsSubmitSuccess(true);
        setSubmitMessage('Tour soumis en revue !');
        logger.info(SERVICE_NAME, 'Submitted for review', { sessionId, tourId: session.tourId });
        // Reload session to reflect new status
        const sess = await getStudioSession(sessionId);
        if (sess) { setSession(sess); setActiveSession(sess); }
      } else {
        setSubmitMessage(result.error);
      }
    } catch (e) {
      setSubmitMessage('Erreur inattendue.');
      logger.error(SERVICE_NAME, 'Submit for review failed', { error: String(e) });
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, session?.tourId, setActiveSession]);

  const handleRetract = useCallback(async () => {
    if (!session?.tourId) return;
    setIsRetracting(true);
    setSubmitMessage(null);
    setIsSubmitSuccess(false);
    try {
      const result = await retractSubmission(sessionId, session.tourId);
      if (result.ok) {
        setIsSubmitSuccess(true);
        setSubmitMessage('Publication retirée.');
        logger.info(SERVICE_NAME, 'Submission retracted', { sessionId, tourId: session.tourId });
        const sess = await getStudioSession(sessionId);
        if (sess) { setSession(sess); setActiveSession(sess); }
      } else {
        setSubmitMessage(result.error);
      }
    } catch (e) {
      setSubmitMessage('Erreur inattendue.');
      logger.error(SERVICE_NAME, 'Retract failed', { error: String(e) });
    } finally {
      setIsRetracting(false);
    }
  }, [sessionId, session?.tourId, setActiveSession]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await deleteSession(sessionId);
      if (result.ok) {
        logger.info(SERVICE_NAME, 'Session deleted', { sessionId });
        router.push('/guide/studio');
      } else {
        setShowDeleteConfirm(false);
        setSubmitMessage(result.error);
      }
    } catch (e) {
      logger.error(SERVICE_NAME, 'Delete failed', { error: String(e) });
    } finally {
      setIsDeleting(false);
    }
  }, [sessionId, router]);

  if (isLoading) {
    return (
      <div className="p-6" aria-busy="true">
        <span className="sr-only">{t("Chargement de l'aperçu...", 'Loading preview...')}</span>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-paper-soft rounded-lg h-16 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-sm mb-4 inline-block">
          &larr; {t('Retour à la session', 'Back to session')}
        </Link>
        <div className="bg-grenadine-soft border border-grenadine-soft rounded-lg p-4 text-danger" role="alert">
          {error || 'Session introuvable.'}
        </div>
      </div>
    );
  }

  const hasRevisionFeedback = session.status === 'revision_requested' || session.status === 'rejected';
  const canSubmit = ['draft', 'editing', 'recording', 'ready', 'revision_requested', 'rejected'].includes(session.status);
  const isPublished = session.status === 'published';
  const isArchived = session.status === 'archived';
  const isInReview = session.status === 'submitted';
  const canArchive = isPublished;
  const canSuspend = ['draft', 'editing', 'recording', 'ready', 'revision_requested', 'rejected'].includes(session.status);

  const displayTitle = session.title || 'Ma visite';

  // Le Studio travaille uniquement la source. Les langues visiteurs sont
  // fabriquées hors Studio et ne sont jamais éditables ici.
  return (
    <div className="p-6 max-w-3xl">
      <Link href={`/guide/studio/${sessionId}`} className="text-grenadine hover:opacity-80 text-sm mb-4 inline-block">
        &larr; {t('Retour à la session', 'Back to session')}
      </Link>

      <h1 className="text-2xl font-bold text-ink mb-1">Preview — {session.title || 'Session'}</h1>
      <p className="text-sm text-ink-60 mb-2" data-testid="preview-narration-mode">
        {session.narrationMode === 'recording'
          ? 'Voix humaine — les audios source sont prévisualisés.'
          : session.narrationMode === 'tts_on_demand'
            ? 'TTS à la demande — le Studio prévisualise les textes source, sans fabriquer d’audio.'
            : 'Mode de narration à choisir avant soumission.'}
      </p>

      {/* View mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('studio')}
          className={`py-1.5 px-4 rounded-lg text-sm font-medium transition ${
            viewMode === 'studio' ? 'bg-ink text-white' : 'bg-paper-soft text-ink-80 hover:bg-paper-deep'
          }`}
        >
          {t('Vue Studio', 'Studio view')}
        </button>
        <button
          onClick={() => setViewMode('catalogue')}
          className={`py-1.5 px-4 rounded-lg text-sm font-medium transition ${
            viewMode === 'catalogue' ? 'bg-ink text-white' : 'bg-paper-soft text-ink-80 hover:bg-paper-deep'
          }`}
        >
          {t('Vue Catalogue (touriste)', 'Catalogue view (visitor)')}
        </button>
      </div>

      {/* Cover photo (from Général) — Studio view only (catalogue view shows it
          as the card-header background instead). */}
      {viewMode === 'studio' && session.coverPhotoKey && (
        <div className="mb-4 rounded-xl overflow-hidden max-w-sm" data-testid="preview-cover">
          <S3Image
            s3Key={session.coverPhotoKey}
            alt="Photo de couverture du parcours"
            className="w-full h-48 object-cover"
            fallback=""
          />
        </div>
      )}

      {/* ═══ VUE CATALOGUE ═══ */}
      {viewMode === 'catalogue' && (
        <div className="bg-ink text-white rounded-2xl overflow-hidden mb-6 max-w-sm mx-auto" data-testid="catalogue-view">
          {/* Tour card header — cover photo (from Général) as background */}
          <div className="relative h-48 flex items-end p-4 overflow-hidden">
            {session.coverPhotoKey ? (
              <>
                <S3Image
                  s3Key={session.coverPhotoKey}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  fallback=""
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-grenadine to-ink" />
            )}
            <div className="relative">
              <p className="text-paper text-xs font-medium uppercase tracking-wider">{session.language.toUpperCase()}</p>
              <h2 className="text-xl font-bold">{displayTitle}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-paper-soft">
                <span>{scenes.length} etapes</span>
                <span>~{scenes.length * 3} min</span>
              </div>
            </div>
          </div>

          {/* Mini player */}
          <div className="p-4">
            {session.narrationMode === 'recording' ? (
              <>
                <button
                  onClick={handlePlayAll}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition ${
                    isPlayingAll ? 'bg-ocre text-ink' : 'bg-grenadine text-white'
                  }`}
                  data-testid="play-all-btn"
                >
                  {isPlayingAll ? t('Arrêter', 'Stop') : t('Écouter la visite', 'Play tour')}
                </button>
                <AudioPlayerBar compact />
              </>
            ) : (
              <p className="rounded-xl bg-white/10 p-3 text-sm text-paper-soft">
                L’audio sera créé à la première écoute connectée, après publication.
              </p>
            )}
          </div>

          {/* Scenes list (mobile style) */}
          <div className="px-4 pb-4 space-y-2">
            {scenes.map((scene, index) => {
              const isActive = playingIndex === index;
              const hasAudio = !!getSceneAudioKey(scene);
              const hasPhotos = scene.photosRefs.length > 0;
              return (
                <div
                  key={scene.id}
                  className={`rounded-xl overflow-hidden transition ${
                    isActive ? 'bg-grenadine' : 'bg-ink hover:opacity-90'
                  }`}
                >
                  {/* Photo carousel */}
                  {hasPhotos && (
                    <div className="flex gap-0.5 h-20 overflow-x-auto">
                      {scene.photosRefs.map((url, pi) => (
                        <S3Image
                          key={pi}
                          s3Key={url}
                          alt={`${scene.title || `Étape ${index + 1}`} — photo ${pi + 1}`}
                          className={`h-full object-cover flex-shrink-0 ${scene.photosRefs.length === 1 ? 'w-full' : 'w-28'}`}
                          fallback={`Photo ${pi + 1}`}
                        />
                      ))}
                    </div>
                  )}
                  <div
                    onClick={() => hasAudio && handlePlayScene(index)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isActive ? 'bg-grenadine text-white' : 'bg-ink-80 text-ink-40'
                    }`}>
                      {isActive ? '||' : index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-paper'}`}>
                        {getSceneTitle(scene) || `Étape ${index + 1}`}
                      </p>
                      {scene.poiDescription && (
                        <p className="text-xs text-ink-40 truncate">{scene.poiDescription}</p>
                      )}
                    </div>
                    {hasAudio && !isActive && (
                      <span className="text-ink-60 text-xs">{'>'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ VUE STUDIO ═══ */}
      {viewMode === 'studio' && (
        <>
          {/* Map — consumer view */}
          {scenes.some((s) => s.latitude && s.longitude) && (
            <div className="mb-6 rounded-lg overflow-hidden border border-line" data-testid="preview-map">
              <PreviewMap
                scenes={scenes}
                waypoints={itineraryWaypoints}
                manualMode={itineraryManualMode}
                pathOverride={itineraryPathOverride}
              />
            </div>
          )}

          {/* Playlist controls + player */}
          {session.narrationMode === 'recording' ? (
          <div className="mb-4 p-3 bg-ink rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={handlePlayAll}
                className={`font-medium py-2 px-5 rounded-lg text-sm transition ${
                  isPlayingAll
                    ? 'bg-ocre hover:brightness-110 text-ink'
                    : 'bg-grenadine hover:opacity-90 text-white'
                }`}
                data-testid="play-all-btn"
              >
                {isPlayingAll ? t('Arrêter', 'Stop') : t('Écouter tout', 'Play all')}
              </button>
              {isPlayingAll && playingIndex !== null && (
                <p className="text-xs text-ink-40">
                  Scene {playingIndex + 1}/{scenes.length} — {scenes[playingIndex]?.title || `Scene ${playingIndex + 1}`}
                </p>
              )}
            </div>
            <AudioPlayerBar compact />
          </div>
          ) : (
            <div className="mb-4 p-3 bg-olive-soft text-olive rounded-xl text-sm">
              Aucun audio n’est fabriqué dans le Studio. Les textes ci-dessous sont ceux qui seront synthétisés à la demande.
            </div>
          )}

      {/* Scenes list */}
      <div className="space-y-2 mb-6" data-testid="preview-scenes">
        {scenes.map((scene, index) => {
          const isActive = playingIndex === index;
          const hasAudio = !!getSceneAudioKey(scene);
          const sceneTranscript = getSceneTranscript(scene);

          return (
            <div
              key={scene.id}
              className={`p-4 rounded-lg border transition ${
                isActive ? 'border-grenadine bg-grenadine-soft' : 'border-line'
              }`}
              data-testid={`preview-scene-${scene.id}`}
            >
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-paper-deep flex items-center justify-center text-xs font-bold text-ink-80 flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-ink">
                      {getSceneTitle(scene) || `Scène ${index + 1}`}
                    </p>
                    {scene.qualityScore && (
                      <span className={`inline-flex px-1.5 py-0 rounded text-[10px] font-medium ${
                        scene.qualityScore === 'good' ? 'bg-olive-soft text-success' : 'bg-ocre-soft text-ocre-ink'
                      }`}>
                        {scene.qualityScore === 'good' ? '✓ Bonne' : '⚠ À améliorer'}
                      </span>
                    )}
                  </div>

                  {scene.poiDescription && (
                    <p className="text-sm text-ink-60 mb-2">{scene.poiDescription}</p>
                  )}

                  {/* Photos carousel */}
                  {scene.photosRefs.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      {scene.photosRefs.map((url, pi) => (
                        <S3Image key={pi} s3Key={url} alt={`Photo ${pi + 1}`} className="w-20 h-16 rounded border" fallback={`📷 ${pi + 1}`} />
                      ))}
                    </div>
                  )}

                  {/* Source transcript preview */}
                  {sceneTranscript && (
                    <p className="text-sm text-ink-80 line-clamp-2 mb-2 italic">
                      &ldquo;{sceneTranscript}&rdquo;
                    </p>
                  )}

                  {scene.moderationFeedback && (
                    <p className="text-xs text-danger mt-1">💬 {scene.moderationFeedback}</p>
                  )}
                </div>
                {hasAudio && (
                <button
                  onClick={() => handlePlayScene(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                    isActive ? 'bg-grenadine text-white' : 'bg-paper-soft text-ink-80 hover:bg-grenadine-soft'
                  }`}
                  aria-label={isActive ? `Pause scène ${index + 1}` : `Écouter scène ${index + 1}`}
                >
                  {isActive ? '⏸' : '▶'}
                </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

        </>
      )}

      {/* Review feedback panel — full admin review sheet */}
      {session.tourId && (
        <ReviewFeedbackPanel tourId={session.tourId} sessionStatus={session.status} />
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Submit / Resubmit */}
        {canSubmit && session.tourId && (
          <button
            onClick={handleSubmitForReview}
            disabled={isSubmitting}
            className="bg-mer hover:opacity-90 disabled:bg-ink-40 text-white font-medium py-2.5 px-6 rounded-lg transition"
            data-testid="submit-review-btn"
          >
            {isSubmitting ? t('Publication...', 'Publishing...') : hasRevisionFeedback ? t('📤 Republier', '📤 Republish') : t('📋 Publier', '📋 Publish')}
          </button>
        )}
        {canSubmit && !session.tourId && (
          <p className="text-sm text-danger" role="alert">
            {t('Cette version doit être rattachée à une visite avant soumission.', 'This version must be linked to a tour before submission.')}
          </p>
        )}

        {/* Retract — only when submitted, not yet reviewed */}
        {session.status === 'submitted' && session.tourId && (
          <button
            onClick={handleRetract}
            disabled={isRetracting}
            className="border border-ocre text-ocre-ink hover:bg-ocre-soft disabled:opacity-50 font-medium py-2.5 px-6 rounded-lg transition"
            data-testid="retract-btn"
          >
            {isRetracting ? 'Retrait...' : '↩ Retirer la publication'}
          </button>
        )}

        {/* Suspend — back to draft (only editable statuses) */}
        {canSuspend && (
          <button
            onClick={async () => {
              setIsSubmitting(true);
              setSubmitMessage(null);
              try {
                const { updateSessionStatus } = await import('@/lib/api/studio-submission');
                await updateSessionStatus(sessionId, 'draft');
                if (session.tourId) {
                  const { updateGuideTourMutation } = await import('@/lib/api/appsync-client');
                  await updateGuideTourMutation(session.tourId, { status: 'draft' });
                }
                setIsSubmitSuccess(true);
                setSubmitMessage('Parcours suspendu.');
                const sess = await getStudioSession(sessionId);
                if (sess) { setSession(sess); setActiveSession(sess); }
              } catch {
                setSubmitMessage('Erreur.');
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="border border-ink-40 text-ink-80 hover:bg-paper-soft disabled:opacity-50 font-medium py-2.5 px-5 rounded-lg transition text-sm"
            data-testid="suspend-btn"
          >
            ⏸ Suspendre
          </button>
        )}

        {/* Archive — only when published */}
        {canArchive && (
          <button
            onClick={async () => {
              setIsSubmitting(true);
              setSubmitMessage(null);
              try {
                const { updateSessionStatus } = await import('@/lib/api/studio-submission');
                await updateSessionStatus(sessionId, 'archived');
                if (session.tourId) {
                  const { updateGuideTourMutation } = await import('@/lib/api/appsync-client');
                  await updateGuideTourMutation(session.tourId, { status: 'archived' });
                }
                setIsSubmitSuccess(true);
                setSubmitMessage('Parcours archivé.');
                const sess = await getStudioSession(sessionId);
                if (sess) { setSession(sess); setActiveSession(sess); }
              } catch {
                setSubmitMessage('Erreur.');
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="border border-ocre text-ocre-ink hover:bg-ocre-soft disabled:opacity-50 font-medium py-2.5 px-5 rounded-lg transition text-sm"
            data-testid="archive-btn"
          >
            📦 Archiver
          </button>
        )}

        {/* Status messages for non-actionable states */}
        {isInReview && !canSubmit && (
          <span className="text-sm text-ink-60">
            ⏳ {t('En attente de la modération', 'Waiting for review')}
          </span>
        )}
        {isArchived && (
          <span className="text-sm text-ink-60">
            📦 {t('Parcours archivé', 'Tour archived')}
          </span>
        )}
        {isPublished && (
          <span className="text-sm text-success font-medium">
            ✅ {t('Parcours publié', 'Tour published')}
          </span>
        )}

        {/* Delete — not when published or archived */}
        {!isPublished && !isArchived && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-ink-60 hover:text-danger transition"
            data-testid="delete-btn"
          >
            🗑️ Supprimer
          </button>
        )}

        {submitMessage && (
          <span className={`text-sm ${isSubmitSuccess ? 'text-success' : 'text-danger'}`} role="status">
            {submitMessage}
          </span>
        )}
      </div>

      <StepNav
        prevHref={`/guide/studio/${sessionId}/scenes`}
        prevLabel={t('Scènes', 'Scenes')}
        nextHref={`/guide/studio/${sessionId}/submission`}
        nextLabel="Publication"
      />

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          open
          danger
          title={t('Supprimer cette session ?', 'Delete this session?')}
          description={t('Tous les fichiers audio, textes et métadonnées seront supprimés définitivement. Cette action est irréversible.', 'All audio files, text and metadata will be permanently deleted. This action cannot be undone.')}
          confirmLabel={isDeleting ? t('Suppression...', 'Deleting...') : t('Supprimer', 'Delete')}
          cancelLabel={t('Annuler', 'Cancel')}
          busy={isDeleting}
          confirmTestId="confirm-delete-btn"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
