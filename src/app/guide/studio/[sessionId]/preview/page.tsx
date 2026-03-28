'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes, getSceneStatusConfig } from '@/lib/api/studio';
import { submitSessionForModeration, submitForReview, retractSubmission, deleteSession } from '@/lib/api/studio-submission';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { shouldUseStubs } from '@/config/api-mode';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';
import { S3Image } from '@/components/studio/s3-image';
import { ScenePhotos } from '@/components/studio/scene-photos';
import { ReviewFeedbackPanel } from '@/components/studio/review-feedback-panel';
import dynamic from 'next/dynamic';
import type { StudioSession, StudioScene } from '@/types/studio';

// Dynamic import for Leaflet map (no SSR — browser-only)
const PreviewMap = dynamic(() => import('@/components/studio/preview-map').then((m) => ({ default: m.PreviewMap })), {
  ssr: false,
  loading: () => <div className="bg-gray-100 rounded-lg h-64 animate-pulse" />,
});

const SERVICE_NAME = 'PreviewPage';

export default function PreviewPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();

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

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function load() {
      try {
        const [sess, scns] = await Promise.all([
          getStudioSession(sessionId),
          listStudioScenes(sessionId),
        ]);
        if (!cancelled) {
          setSession(sess);
          setScenes(scns.filter((s) => !s.archived));
          if (sess) setActiveSession(sess);
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
    return () => {
      cancelled = true;
      audioPlayerService.stop();
      clearSession();
    };
  }, [sessionId, setActiveSession, clearSession]);

  const resolveAudioUrl = useCallback(async (key: string): Promise<string> => {
    // Data URLs (TTS audio) are playable directly
    if (key.startsWith('data:')) return key;
    if (shouldUseStubs()) return key;
    try {
      return await getPlayableUrl(key);
    } catch {
      return key;
    }
  }, []);

  // Listen for audio end to advance playlist
  useEffect(() => {
    const unsub = audioPlayerService.subscribe((state) => {
      if (!state.isPlaying && isPlayingAll && playingIndex !== null) {
        const nextIndex = playingIndex + 1;
        if (nextIndex < scenes.length && (scenes[nextIndex].studioAudioKey || scenes[nextIndex].originalAudioKey)) {
          setPlayingIndex(nextIndex);
          const key = scenes[nextIndex].studioAudioKey || scenes[nextIndex].originalAudioKey || '';
          resolveAudioUrl(key).then((url) => audioPlayerService.play(url));
        } else {
          setIsPlayingAll(false);
          setPlayingIndex(null);
          logger.info(SERVICE_NAME, 'Playlist complete');
        }
      }
    });
    return unsub;
  }, [isPlayingAll, playingIndex, scenes, resolveAudioUrl]);

  const handlePlayScene = useCallback(async (index: number) => {
    const scene = scenes[index];
    const key = scene.studioAudioKey || scene.originalAudioKey || '';
    if (!key) return;

    if (playingIndex === index) {
      audioPlayerService.pause();
      setPlayingIndex(null);
      setIsPlayingAll(false);
    } else {
      const url = await resolveAudioUrl(key);
      audioPlayerService.play(url);
      setPlayingIndex(index);
    }
  }, [scenes, playingIndex, resolveAudioUrl]);

  const handlePlayAll = useCallback(async () => {
    if (isPlayingAll) {
      audioPlayerService.stop();
      setIsPlayingAll(false);
      setPlayingIndex(null);
      return;
    }
    const firstWithAudio = scenes.findIndex((s) => s.studioAudioKey || s.originalAudioKey);
    if (firstWithAudio >= 0) {
      setIsPlayingAll(true);
      setPlayingIndex(firstWithAudio);
      const key = scenes[firstWithAudio].studioAudioKey || scenes[firstWithAudio].originalAudioKey || '';
      const url = await resolveAudioUrl(key);
      audioPlayerService.play(url);
    }
  }, [isPlayingAll, scenes, resolveAudioUrl]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitMessage(null);
    setIsSubmitSuccess(false);
    try {
      const result = await submitSessionForModeration(sessionId);
      if (result.ok) {
        setIsSubmitSuccess(true);
        setSubmitMessage('Tour soumis pour modération !');
        logger.info(SERVICE_NAME, 'Submitted', { sessionId });
      } else {
        setSubmitMessage(result.error);
      }
    } catch (e) {
      setSubmitMessage('Erreur inattendue.');
      logger.error(SERVICE_NAME, 'Submit failed', { error: String(e) });
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId]);

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
  }, [sessionId, session?.tourId]);

  const handleRetract = useCallback(async () => {
    if (!session?.tourId) return;
    setIsRetracting(true);
    setSubmitMessage(null);
    setIsSubmitSuccess(false);
    try {
      const result = await retractSubmission(sessionId, session.tourId);
      if (result.ok) {
        setIsSubmitSuccess(true);
        setSubmitMessage('Soumission retirée.');
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
  }, [sessionId, session?.tourId]);

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
        <span className="sr-only">Chargement du preview...</span>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-gray-100 rounded-lg h-16 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">
          &larr; Retour à la session
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
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

  return (
    <div className="p-6 max-w-3xl">
      <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">
        &larr; Retour à la session
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Preview — {session.title || 'Session'}</h1>
      <p className="text-sm text-gray-500 mb-4">Aperçu tel que le touriste le verra dans l&apos;application.</p>

      {/* Map — consumer view */}
      {scenes.some((s) => s.latitude && s.longitude) && (
        <div className="mb-6 rounded-lg overflow-hidden border border-gray-200" data-testid="preview-map">
          <PreviewMap scenes={scenes} />
        </div>
      )}

      {/* Playlist controls */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handlePlayAll}
          className={`font-medium py-2 px-5 rounded-lg text-sm transition-colors ${
            isPlayingAll
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
          data-testid="play-all-btn"
        >
          {isPlayingAll ? '⏹ Arrêter' : '▶ Écouter tout'}
        </button>
      </div>

      {/* Scenes list */}
      <div className="space-y-2 mb-6" data-testid="preview-scenes">
        {scenes.map((scene, index) => {
          const statusConfig = getSceneStatusConfig(scene.status);
          const isActive = playingIndex === index;
          const hasAudio = !!(scene.studioAudioKey || scene.originalAudioKey);

          return (
            <div
              key={scene.id}
              className={`p-4 rounded-lg border transition-colors ${
                isActive ? 'border-teal-400 bg-teal-50' : 'border-gray-200'
              }`}
              data-testid={`preview-scene-${scene.id}`}
            >
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">
                      {scene.title || `Scène ${index + 1}`}
                    </p>
                    {scene.qualityScore && (
                      <span className={`inline-flex px-1.5 py-0 rounded text-[10px] font-medium ${
                        scene.qualityScore === 'good' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {scene.qualityScore === 'good' ? '✓ Bonne' : '⚠ À améliorer'}
                      </span>
                    )}
                  </div>

                  {scene.poiDescription && (
                    <p className="text-sm text-gray-500 mb-2">{scene.poiDescription}</p>
                  )}

                  {/* Photos carousel */}
                  {scene.photosRefs.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      {scene.photosRefs.map((url, pi) => (
                        <S3Image key={pi} s3Key={url} alt={`Photo ${pi + 1}`} className="w-20 h-16 rounded border" fallback={`📷 ${pi + 1}`} />
                      ))}
                    </div>
                  )}

                  {/* Transcribed text preview */}
                  {scene.transcriptText && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2 italic">
                      &ldquo;{scene.transcriptText}&rdquo;
                    </p>
                  )}

                  {scene.moderationFeedback && (
                    <p className="text-xs text-red-600 mt-1">💬 {scene.moderationFeedback}</p>
                  )}
                </div>
                {hasAudio && (
                <button
                  onClick={() => handlePlayScene(index)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-teal-100'
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
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
            data-testid="submit-review-btn"
          >
            {isSubmitting ? 'Soumission...' : hasRevisionFeedback ? '📤 Resoumettre en revue' : '📋 Soumettre en revue'}
          </button>
        )}
        {canSubmit && !session.tourId && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
            data-testid="submit-btn"
          >
            {isSubmitting ? 'Soumission...' : hasRevisionFeedback ? '📤 Resoumettre' : '📤 Soumettre pour modération'}
          </button>
        )}

        {/* Retract — only when submitted, not yet reviewed */}
        {session.status === 'submitted' && session.tourId && (
          <button
            onClick={handleRetract}
            disabled={isRetracting}
            className="border border-orange-500 text-orange-700 hover:bg-orange-50 disabled:opacity-50 font-medium py-2.5 px-6 rounded-lg transition-colors"
            data-testid="retract-btn"
          >
            {isRetracting ? 'Retrait...' : '↩ Retirer la soumission'}
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
              } catch (e) {
                setSubmitMessage('Erreur.');
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="border border-gray-400 text-gray-600 hover:bg-gray-50 disabled:opacity-50 font-medium py-2.5 px-5 rounded-lg transition-colors text-sm"
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
              } catch (e) {
                setSubmitMessage('Erreur.');
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="border border-amber-500 text-amber-700 hover:bg-amber-50 disabled:opacity-50 font-medium py-2.5 px-5 rounded-lg transition-colors text-sm"
            data-testid="archive-btn"
          >
            📦 Archiver
          </button>
        )}

        {/* Status messages for non-actionable states */}
        {isInReview && !canSubmit && (
          <span className="text-sm text-gray-500">
            ⏳ En attente de la modération
          </span>
        )}
        {isArchived && (
          <span className="text-sm text-gray-500">
            📦 Parcours archivé
          </span>
        )}
        {isPublished && (
          <span className="text-sm text-green-600 font-medium">
            ✅ Parcours publié
          </span>
        )}

        {/* Delete — not when published or archived */}
        {!isPublished && !isArchived && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            data-testid="delete-btn"
          >
            🗑️ Supprimer
          </button>
        )}

        {submitMessage && (
          <span className={`text-sm ${isSubmitSuccess ? 'text-green-600' : 'text-red-600'}`} role="status">
            {submitMessage}
          </span>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Supprimer cette session ?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Tous les fichiers audio, textes et métadonnées seront supprimés définitivement. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                data-testid="confirm-delete-btn"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
