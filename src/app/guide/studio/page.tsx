'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import { trackEvent, StudioAnalyticsEvents } from '@/lib/analytics';
import { listStudioSessions, getStubScenesCount, listStudioScenes } from '@/lib/api/studio';
import { listLanguagePurchases } from '@/lib/api/language-purchase';
import { listTourComments } from '@/lib/api/tour-comments';
import type { TourLanguagePurchase } from '@/types/studio';
import { SessionCard } from '@/components/studio/session-card';
import { useAuth } from '@/lib/auth/auth-context';
import { studioPersistenceService } from '@/lib/studio/studio-persistence-service';
import { shouldUseStubs } from '@/config/api-mode';
import type { StudioSession } from '@/types/studio';

const SERVICE_NAME = 'StudioHomePage';

export default function StudioHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [sceneCounts, setSceneCounts] = useState<Record<string, number>>({});
  const [purchasesBySession, setPurchasesBySession] = useState<Record<string, TourLanguagePurchase[]>>({});
  const [hasAdminFeedback, setHasAdminFeedback] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSessionId, setLastSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(async (guideId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listStudioSessions(guideId);
      setSessions(result);

      // Compute scene counts: stub mode uses in-memory, real mode queries AppSync
      if (shouldUseStubs()) {
        const counts: Record<string, number> = {};
        for (const s of result) {
          counts[s.id] = getStubScenesCount(s.id);
        }
        setSceneCounts(counts);
      } else {
        const sceneLists = await Promise.all(result.map((s) => listStudioScenes(s.id)));
        const counts: Record<string, number> = {};
        result.forEach((s, i) => {
          counts[s.id] = sceneLists[i].length;
        });
        setSceneCounts(counts);
      }

      // Load language purchases per session
      const purchaseResults = await Promise.all(
        result.map(async (s) => {
          const r = await listLanguagePurchases(s.id);
          return { sessionId: s.id, purchases: r.ok ? r.value.filter((p) => p.status === 'active') : [] };
        }),
      );
      const pMap: Record<string, TourLanguagePurchase[]> = {};
      for (const r of purchaseResults) pMap[r.sessionId] = r.purchases;
      setPurchasesBySession(pMap);

      // Check for admin feedback (comments with author='admin') per tour
      const feedbackMap: Record<string, boolean> = {};
      for (const s of result) {
        if (s.tourId && ['revision_requested', 'rejected'].includes(s.status)) {
          feedbackMap[s.id] = true;
        } else if (s.tourId) {
          try {
            const comments = await listTourComments(s.tourId);
            const lastAdminComment = [...comments].reverse().find((c) => c.author === 'admin');
            feedbackMap[s.id] = !!lastAdminComment;
          } catch { feedbackMap[s.id] = false; }
        }
      }
      setHasAdminFeedback(feedbackMap);

      logger.info(SERVICE_NAME, 'Tours loaded', { count: result.length });
      trackEvent(StudioAnalyticsEvents.STUDIO_SESSIONS_VIEW, { count: result.length });
    } catch (e) {
      setError('Impossible de charger vos tours.');
      logger.error(SERVICE_NAME, 'Failed to load tours', { error: String(e) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const guideId = shouldUseStubs() ? 'guide-1' : user?.guideId ?? null;
    if (!guideId) {
      setIsLoading(false);
      return;
    }
    loadSessions(guideId);
    setLastSessionId(studioPersistenceService.getLastSessionId());
  }, [user, loadSessions]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mon Studio</h1>
        </div>
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only">Chargement des tours...</span>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user?.guideId && !shouldUseStubs()) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mon Studio</h1>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700" role="alert">
          Le Studio est réservé aux guides. Créez un profil guide pour commencer.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mon Studio</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">
          <p>{error}</p>
          <button
            onClick={() => loadSessions(user?.guideId || 'guide-1')}
            className="mt-2 text-sm font-medium text-red-800 underline hover:text-red-900"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mon Studio</h1>
        <p className="text-gray-600 mt-1">
          Créez et gérez vos tours audio — du terrain à la publication.
        </p>
      </div>

      {lastSessionId && sessions.some((s) => s.id === lastSessionId) && (
        <button
          onClick={() => router.push(`/guide/studio/${lastSessionId}`)}
          className="w-full mb-4 flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg text-left hover:bg-teal-100 transition-colors"
          data-testid="resume-session"
        >
          <span className="text-2xl" aria-hidden="true">⏯️</span>
          <div>
            <p className="font-medium text-teal-800">Reprendre votre dernier tour</p>
            <p className="text-sm text-teal-600">
              {sessions.find((s) => s.id === lastSessionId)?.title || 'Tour en cours'}
            </p>
          </div>
        </button>
      )}

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center" data-testid="empty-state">
          <div className="text-5xl mb-4" aria-hidden="true">🎙️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun tour en cours
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Enregistrez un tour sur le terrain avec l&apos;app mobile TourGuide, puis revenez ici pour le transformer en tour audio de qualité publication.
          </p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="sessions-list">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              scenesCount={sceneCounts[session.id] ?? 0}
              purchases={purchasesBySession[session.id] ?? []}
              hasAdminFeedback={hasAdminFeedback[session.id] ?? false}
              onClick={(id) => {
                logger.info(SERVICE_NAME, 'Tour clicked', { sessionId: id });
                router.push(`/guide/studio/${id}`);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
