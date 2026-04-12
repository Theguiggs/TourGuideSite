'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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

/** Group sessions that share the same tourId. Orphan sessions (no tourId) are standalone. */
interface TourGroup {
  tourId: string | null;
  title: string;
  sessions: StudioSession[]; // sorted by version desc
  publishedVersion: number | null;
  latestVersion: number;
}

function groupSessionsByTour(
  sessions: StudioSession[],
): TourGroup[] {
  const byTour = new Map<string, StudioSession[]>();
  const orphans: StudioSession[] = [];

  for (const s of sessions) {
    if (s.tourId) {
      const existing = byTour.get(s.tourId) ?? [];
      existing.push(s);
      byTour.set(s.tourId, existing);
    } else {
      orphans.push(s);
    }
  }

  const groups: TourGroup[] = [];

  for (const [tourId, tourSessions] of byTour) {
    // Sort by version desc so latest is first
    const sorted = [...tourSessions].sort((a, b) => (b.version ?? 1) - (a.version ?? 1));
    const published = sorted.find((s) => s.status === 'published');
    groups.push({
      tourId,
      title: sorted[0].title || 'Tour sans titre',
      sessions: sorted,
      publishedVersion: published ? (published.version ?? 1) : null,
      latestVersion: sorted[0].version ?? 1,
    });
  }

  // Orphans as individual groups
  for (const s of orphans) {
    groups.push({
      tourId: null,
      title: s.title || 'Session sans titre',
      sessions: [s],
      publishedVersion: null,
      latestVersion: s.version ?? 1,
    });
  }

  // Sort groups: needs attention first, then by latest update
  groups.sort((a, b) => {
    const aAttention = a.sessions.some((s) => ['revision_requested', 'rejected'].includes(s.status)) ? 1 : 0;
    const bAttention = b.sessions.some((s) => ['revision_requested', 'rejected'].includes(s.status)) ? 1 : 0;
    if (aAttention !== bAttention) return bAttention - aAttention;
    const aDate = new Date(a.sessions[0].updatedAt).getTime();
    const bDate = new Date(b.sessions[0].updatedAt).getTime();
    return bDate - aDate;
  });

  return groups;
}

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

  const tourGroups = useMemo(() => groupSessionsByTour(sessions), [sessions]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mon Studio</h1>
        </div>
        <div className="space-y-3" aria-busy="true">
          <span className="sr-only">Chargement des tours...</span>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-14 animate-pulse" />
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
          Le Studio est reserve aux guides. Creez un profil guide pour commencer.
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
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  const handleClick = (id: string) => {
    logger.info(SERVICE_NAME, 'Tour clicked', { sessionId: id });
    router.push(`/guide/studio/${id}`);
  };

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Mon Studio</h1>
        <p className="text-gray-500 text-sm mt-1">
          Creez et gerez vos tours audio — du terrain a la publication.
        </p>
      </div>

      {lastSessionId && sessions.some((s) => s.id === lastSessionId) && (
        <button
          onClick={() => router.push(`/guide/studio/${lastSessionId}`)}
          className="w-full mb-4 flex items-center gap-3 px-4 py-2.5 bg-teal-50 border border-teal-200 rounded-lg text-left hover:bg-teal-100 transition-colors"
          data-testid="resume-session"
        >
          <span className="text-lg" aria-hidden="true">&#x23EF;&#xFE0F;</span>
          <p className="text-sm font-medium text-teal-800">
            Reprendre : <span className="text-teal-600">{sessions.find((s) => s.id === lastSessionId)?.title || 'Tour en cours'}</span>
          </p>
        </button>
      )}

      {tourGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center" data-testid="empty-state">
          <div className="text-4xl mb-3" aria-hidden="true">&#x1F399;&#xFE0F;</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun tour en cours
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            Enregistrez un tour sur le terrain avec l&apos;app mobile TourGuide, puis revenez ici pour le transformer en tour audio.
          </p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="sessions-list">
          {tourGroups.map((group) => (
            <TourGroupCard
              key={group.tourId ?? group.sessions[0].id}
              group={group}
              sceneCounts={sceneCounts}
              purchasesBySession={purchasesBySession}
              hasAdminFeedback={hasAdminFeedback}
              onClick={handleClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TourGroupCard({
  group,
  sceneCounts,
  purchasesBySession,
  hasAdminFeedback,
  onClick,
}: {
  group: TourGroup;
  sceneCounts: Record<string, number>;
  purchasesBySession: Record<string, TourLanguagePurchase[]>;
  hasAdminFeedback: Record<string, boolean>;
  onClick: (id: string) => void;
}) {
  // Single session, not grouped — use standalone card
  if (group.sessions.length === 1) {
    const s = group.sessions[0];
    return (
      <SessionCard
        session={s}
        scenesCount={sceneCounts[s.id] ?? 0}
        purchases={purchasesBySession[s.id] ?? []}
        hasAdminFeedback={hasAdminFeedback[s.id] ?? false}
        onClick={onClick}
      />
    );
  }

  // Multiple versions — grouped card
  const needsAttention = group.sessions.some((s) => ['revision_requested', 'rejected'].includes(s.status));

  return (
    <div
      className={`bg-white rounded-lg border overflow-hidden ${
        needsAttention ? 'border-red-300' : 'border-gray-200'
      }`}
      data-testid={`tour-group-${group.tourId}`}
    >
      {/* Group header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 truncate text-sm">{group.title}</h3>
        <span className="flex-1" />
        {group.publishedVersion !== null && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-700 shrink-0">
            V{group.publishedVersion} publiee
          </span>
        )}
        <span className="text-xs text-gray-400 shrink-0">{group.sessions.length} versions</span>
      </div>

      {/* Version rows */}
      <div className="divide-y divide-gray-50">
        {group.sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            scenesCount={sceneCounts[s.id] ?? 0}
            purchases={purchasesBySession[s.id] ?? []}
            hasAdminFeedback={hasAdminFeedback[s.id] ?? false}
            onClick={onClick}
            compact
          />
        ))}
      </div>
    </div>
  );
}
