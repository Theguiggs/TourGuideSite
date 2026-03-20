'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { trackEvent, StudioAnalyticsEvents } from '@/lib/analytics';
import { getStudioSession, listStudioScenes, getSessionStatusConfig, createStudioSession } from '@/lib/api/studio';
import { triggerTranscription, getTranscriptionQuota } from '@/lib/api/transcription';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { SceneListItem } from '@/components/studio/scene-list-item';
import { QuotaDisplay } from '@/components/studio/quota-display';
import { StudioToast } from '@/components/studio/toast';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { useTranscriptionStore, selectQuota } from '@/lib/stores/transcription-store';
import { studioPersistenceService } from '@/lib/studio/studio-persistence-service';
import type { StudioSession, StudioScene } from '@/types/studio';

const SERVICE_NAME = 'SessionDetailPage';

export default function SessionDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const { user } = useAuth();

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);
  const quota = useTranscriptionStore(selectQuota);
  const setQuota = useTranscriptionStore((s) => s.setQuota);
  const setSceneStatus = useTranscriptionStore((s) => s.setSceneStatus);
  const startPolling = useTranscriptionStore((s) => s.startPolling);
  const stopAllPolling = useTranscriptionStore((s) => s.stopAllPolling);

  const guideId = user?.guideId || (shouldUseStubs() ? 'guide-1' : null);

  // Load session + scenes + quota
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
          setScenes(scns);
          if (sess) {
            setActiveSession(sess);
            studioPersistenceService.saveLastSessionId(sess.id);
          }
          logger.info(SERVICE_NAME, 'Session detail loaded', { sessionId, scenesCount: scns.length });
          trackEvent(StudioAnalyticsEvents.STUDIO_SESSION_OPENED, { sessionId });
        }
        // Load quota
        if (guideId && !cancelled) {
          const q = await getTranscriptionQuota(guideId);
          setQuota(q);
        }
      } catch (e) {
        if (!cancelled) {
          setError('Impossible de charger la session.');
          logger.error(SERVICE_NAME, 'Failed to load session', { error: String(e) });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      audioPlayerService.stop();
      stopAllPolling();
      clearSession();
    };
  }, [sessionId, setActiveSession, clearSession, guideId, setQuota, stopAllPolling]);

  // Sync playingSceneId when audio ends naturally
  useEffect(() => {
    const unsub = audioPlayerService.subscribe((state) => {
      if (!state.isPlaying && playingSceneId) {
        setPlayingSceneId(null);
      }
    });
    return unsub;
  }, [playingSceneId]);

  const handleCreateStudioSession = useCallback(async () => {
    if (!session || !guideId) return;
    setIsCreating(true);
    setCreateMessage(null);

    try {
      const result = await createStudioSession(session.sourceSessionId, guideId);
      if (result.ok) {
        setCreateMessage('Session studio créée !');
        logger.info(SERVICE_NAME, 'Studio session created', { sessionId: result.session.id });
        trackEvent(StudioAnalyticsEvents.STUDIO_SESSION_CREATED, { sessionId: result.session.id });
      } else {
        setCreateMessage(result.existingSessionId ? 'Session déjà existante.' : result.error);
      }
    } catch (e) {
      setCreateMessage('Erreur inattendue.');
      logger.error(SERVICE_NAME, 'Create session failed', { error: String(e) });
    } finally {
      setIsCreating(false);
    }
  }, [session, guideId]);

  const handlePlayToggle = useCallback(async (scene: StudioScene) => {
    if (playingSceneId === scene.id) {
      audioPlayerService.pause();
      setPlayingSceneId(null);
    } else {
      const url = scene.originalAudioKey || '';
      const success = await audioPlayerService.play(url);
      if (success) {
        setPlayingSceneId(scene.id);
      }
    }
  }, [playingSceneId]);

  const handleTriggerTranscription = useCallback(async (sceneId: string) => {
    if (quota?.isExceeded) return;

    setSceneStatus(sceneId, { status: 'processing', error: null });

    try {
      const result = await triggerTranscription(sceneId, 3); // ~3 min per scene estimate
      if (result.ok) {
        setSceneStatus(sceneId, { status: 'processing', jobId: result.jobId });
        startPolling(sceneId, result.jobId);
        logger.info(SERVICE_NAME, 'Transcription triggered', { sceneId, jobId: result.jobId });
        trackEvent(StudioAnalyticsEvents.STUDIO_TRANSCRIPTION_TRIGGERED, { sceneId });
        // Refresh quota
        if (guideId) {
          const q = await getTranscriptionQuota(guideId);
          setQuota(q);
        }
      } else {
        setSceneStatus(sceneId, { status: 'failed', error: result.error });
        if (result.code === 2307) {
          logger.warn(SERVICE_NAME, 'Quota exceeded', { sceneId });
          trackEvent(StudioAnalyticsEvents.STUDIO_QUOTA_EXCEEDED, { sceneId });
        }
        trackEvent(StudioAnalyticsEvents.STUDIO_TRANSCRIPTION_FAILED, { sceneId });
      }
    } catch (e) {
      setSceneStatus(sceneId, { status: 'failed', error: 'Erreur inattendue.' });
      logger.error(SERVICE_NAME, 'Trigger transcription failed', { sceneId, error: String(e) });
    }
  }, [quota, guideId, setSceneStatus, startPolling, setQuota]);

  const handleRetryTranscription = useCallback(async (sceneId: string) => {
    logger.info(SERVICE_NAME, 'Retrying transcription', { sceneId });
    trackEvent(StudioAnalyticsEvents.STUDIO_TRANSCRIPTION_RETRIED, { sceneId });
    await handleTriggerTranscription(sceneId);
  }, [handleTriggerTranscription]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only">Chargement de la session...</span>
          <div className="bg-gray-100 rounded-lg h-16 animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-16 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href="/guide/studio" className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">
          &larr; Retour aux sessions
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
          {error || 'Session introuvable.'}
        </div>
      </div>
    );
  }

  const statusConfig = getSessionStatusConfig(session.status);

  return (
    <div className="p-6">
      <Link href="/guide/studio" className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">
        &larr; Retour aux sessions
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {session.title || 'Session sans titre'}
          </h1>
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          {scenes.length} {scenes.length > 1 ? 'scènes' : 'scène'} &middot; {session.language.toUpperCase()}
        </p>
      </div>

      {/* Workflow steps — ordered like the progress bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href={`/guide/studio/${sessionId}/general`}
          className="inline-flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          data-testid="general-link"
        >
          📋 Général
        </Link>
        <Link
          href={`/guide/studio/${sessionId}/itinerary`}
          className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          data-testid="itinerary-link"
        >
          🗺️ Itinéraire
        </Link>
        <Link
          href={`/guide/studio/${sessionId}/scenes`}
          className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          data-testid="scenes-link"
        >
          🎬 Scènes
        </Link>
        <Link
          href={`/guide/studio/${sessionId}/preview`}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          data-testid="preview-link-top"
        >
          👁 Preview
        </Link>
        <Link
          href={`/guide/studio/${sessionId}/submission`}
          className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
          data-testid="submission-link"
        >
          📤 Soumission
        </Link>
      </div>

      {/* Link to Mes Parcours if tour is linked */}
      {session.tourId && (
        <div className="mb-4">
          <Link
            href="/guide/tours"
            className="text-sm text-teal-600 hover:text-teal-700 underline"
            data-testid="tour-link"
          >
            🔗 Voir dans Mes Parcours
          </Link>
        </div>
      )}

      <QuotaDisplay quota={quota} />

      {session.status === 'draft' && !session.tourId && (
        <div className="my-4 flex items-center gap-3">
          <button
            onClick={handleCreateStudioSession}
            disabled={isCreating}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            data-testid="create-studio-btn"
          >
            {isCreating ? 'Création...' : 'Créer une session studio'}
          </button>
          {createMessage && (
            <span
              className={`text-sm ${createMessage.includes('créée') ? 'text-green-600' : 'text-red-600'}`}
              role={createMessage.includes('créée') ? 'status' : 'alert'}
            >
              {createMessage}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2 mt-4" data-testid="scenes-list">
        {scenes.map((scene) => (
          <SceneListItemWithTranscription
            key={scene.id}
            scene={scene}
            isPlaying={playingSceneId === scene.id}
            onPlayToggle={handlePlayToggle}
            isQuotaExceeded={quota?.isExceeded ?? false}
            onTriggerTranscription={handleTriggerTranscription}
            onRetryTranscription={handleRetryTranscription}
          />
        ))}
      </div>

      {scenes.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500" data-testid="no-scenes">
          Aucune sc&egrave;ne dans cette session.
        </div>
      )}

      <StudioToast />
    </div>
  );
}

/** Wrapper that connects each scene to the transcription store */
function SceneListItemWithTranscription(props: {
  scene: StudioScene;
  isPlaying: boolean;
  onPlayToggle: (scene: StudioScene) => void;
  isQuotaExceeded: boolean;
  onTriggerTranscription: (sceneId: string) => void;
  onRetryTranscription: (sceneId: string) => void;
}) {
  // Inline selector returns stable reference (same object) when unchanged — Zustand optimizes via Object.is
  const transcription = useTranscriptionStore((s) => s.scenes[props.scene.id] ?? null);
  return (
    <SceneListItem
      {...props}
      transcription={transcription}
    />
  );
}
