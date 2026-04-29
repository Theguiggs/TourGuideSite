'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { trackEvent, StudioAnalyticsEvents } from '@/lib/analytics';
import {
  getStudioSession,
  listStudioScenes,
  createStudioSession,
} from '@/lib/api/studio';
import { getTranscriptionQuota } from '@/lib/api/transcription';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { StudioToast } from '@/components/studio/toast';
import { StepNav } from '@/components/studio/wizard';
import {
  QuotaTranscriptionCard,
  SceneOverviewCard,
} from '@/components/studio/wizard-accueil';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';
import {
  useStudioSessionStore,
  selectSetActiveSession,
  selectClearSession,
} from '@/lib/stores/studio-session-store';
import {
  useTranscriptionStore,
  selectQuota,
} from '@/lib/stores/transcription-store';
import { studioPersistenceService } from '@/lib/studio/studio-persistence-service';
import type { StudioSession, StudioScene } from '@/types/studio';

const SERVICE_NAME = 'SessionDetailPage';

const MONTH_LABEL_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export default function SessionDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();
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
  const stopAllPolling = useTranscriptionStore((s) => s.stopAllPolling);

  const guideId = user?.guideId || (shouldUseStubs() ? 'guide-1' : null);

  // Load session + scenes + quota
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let redirecting = false;

    async function load() {
      try {
        const [sess, scns] = await Promise.all([
          getStudioSession(sessionId),
          listStudioScenes(sessionId),
        ]);
        if (!cancelled) {
          if (
            sess &&
            sess.captureMode === 'phased_capture' &&
            sess.status === 'ready_for_cleanup'
          ) {
            logger.info(SERVICE_NAME, 'Redirecting to cleanup workspace', { sessionId });
            redirecting = true;
            router.replace(`/guide/studio/${sessionId}/cleanup`);
            return;
          }
          setSession(sess);
          setScenes(scns);
          if (sess) {
            setActiveSession(sess);
            studioPersistenceService.saveLastSessionId(sess.id);
          }
          logger.info(SERVICE_NAME, 'Session detail loaded', {
            sessionId,
            scenesCount: scns.length,
          });
          trackEvent(StudioAnalyticsEvents.STUDIO_SESSION_OPENED, { sessionId });
        }
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
        if (!cancelled && !redirecting) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      audioPlayerService.stop();
      stopAllPolling();
      clearSession();
    };
  }, [sessionId, setActiveSession, clearSession, guideId, setQuota, stopAllPolling, router]);

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
        trackEvent(StudioAnalyticsEvents.STUDIO_SESSION_CREATED, {
          sessionId: result.session.id,
        });
      } else {
        setCreateMessage(
          result.existingSessionId ? 'Session déjà existante.' : result.error,
        );
      }
    } catch (e) {
      setCreateMessage('Erreur inattendue.');
      logger.error(SERVICE_NAME, 'Create session failed', { error: String(e) });
    } finally {
      setIsCreating(false);
    }
  }, [session, guideId]);

  const handlePlayToggle = useCallback(
    async (scene: StudioScene) => {
      if (playingSceneId === scene.id) {
        audioPlayerService.pause();
        setPlayingSceneId(null);
      } else {
        const key = scene.studioAudioKey || scene.originalAudioKey || '';
        if (!key) return;
        try {
          const url = key.startsWith('data:')
            ? key
            : shouldUseStubs()
              ? key
              : await getPlayableUrl(key);
          const success = await audioPlayerService.play(url);
          if (success) {
            setPlayingSceneId(scene.id);
          }
        } catch (e) {
          logger.error(SERVICE_NAME, 'Failed to get playable URL', { key, error: String(e) });
        }
      }
    },
    [playingSceneId],
  );

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto" aria-busy="true">
        <span className="sr-only">Chargement de la session…</span>
        <div className="h-8 w-48 bg-paper-deep rounded animate-pulse mb-3" />
        <div className="h-16 bg-card border border-line rounded-md animate-pulse mb-4" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-card border border-line rounded-md animate-pulse mb-2.5"
          />
        ))}
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div
          className="bg-grenadine-soft border border-grenadine rounded-md p-4 text-danger"
          role="alert"
        >
          {error || 'Session introuvable.'}
        </div>
      </div>
    );
  }

  const monthLabel = MONTH_LABEL_FR[new Date().getMonth()];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* ───── Header ───── */}
      <div className="flex items-baseline gap-3.5 mb-1.5 flex-wrap">
        <h1 className="font-display text-h5 text-ink leading-none">
          {scenes.length} {scenes.length > 1 ? 'scènes' : 'scène'}
        </h1>
        {session.tourId && (
          <Link
            href="/guide/studio/tours"
            className="text-meta text-grenadine font-semibold underline underline-offset-2 hover:opacity-80 transition"
            data-testid="tour-link"
          >
            ↗ Voir dans Mes tours
          </Link>
        )}
      </div>
      <p className="font-editorial italic text-caption text-ink-60 mb-5">
        Vue d&apos;ensemble du tour. Cliquez sur une scène pour la lire ou allez à
        l&apos;onglet <strong className="not-italic font-semibold">Scènes</strong> pour le mode édition.
      </p>

      {/* ───── Quota transcription ───── */}
      {quota && (
        <div className="mb-5">
          <QuotaTranscriptionCard
            usedMin={quota.usedMinutes}
            totalMin={quota.limitMinutes}
            monthLabel={monthLabel}
          />
        </div>
      )}

      {/* ───── Bouton créer studio session (cas legacy draft sans tourId) ───── */}
      {session.status === 'draft' && !session.tourId && (
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleCreateStudioSession}
            disabled={isCreating}
            data-testid="create-studio-btn"
            className="bg-grenadine text-paper border-none px-4 py-2 rounded-md text-caption font-bold cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isCreating ? 'Création…' : 'Créer une session studio'}
          </button>
          {createMessage && (
            <span
              className={`text-meta ${
                createMessage.includes('créée') ? 'text-success' : 'text-danger'
              }`}
              role={createMessage.includes('créée') ? 'status' : 'alert'}
            >
              {createMessage}
            </span>
          )}
        </div>
      )}

      {/* ───── Liste scènes ───── */}
      {scenes.length === 0 ? (
        <div
          className="bg-paper-soft rounded-md p-6 text-center text-caption text-ink-60"
          data-testid="no-scenes"
        >
          Aucune scène dans cette session.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5" data-testid="scenes-list">
          {scenes.map((scene, i) => {
            const audioAvailable = !!(scene.studioAudioKey || scene.originalAudioKey);
            return (
              <SceneOverviewCard
                key={scene.id}
                index={i + 1}
                scene={scene}
                isPlaying={playingSceneId === scene.id}
                onPlayToggle={handlePlayToggle}
                audioAvailable={audioAvailable}
              />
            );
          })}
        </div>
      )}

      {/* ───── Step navigation ───── */}
      <StepNav
        prevHref="/guide/studio/tours"
        prevLabel="Mes tours"
        nextHref={`/guide/studio/${sessionId}/general`}
        nextLabel="Général"
      />

      <StudioToast />
    </div>
  );
}
