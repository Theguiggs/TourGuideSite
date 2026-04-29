'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { trackEvent, StudioAnalyticsEvents } from '@/lib/analytics';
import { listStudioSessions, listStudioScenes } from '@/lib/api/studio';
import { listLanguagePurchases } from '@/lib/api/language-purchase';
import { listTourComments, type TourComment } from '@/lib/api/tour-comments';
import { studioPersistenceService } from '@/lib/studio/studio-persistence-service';
import {
  selectResumableSession,
  selectTopTours,
  selectRecentReviews,
  selectSuggestion,
  type DashboardReview,
  type DashboardSuggestion,
} from '@/lib/studio/dashboard-helpers';
import {
  KpiCard,
  ResumeHero,
  TopTourRow,
  ReviewItem,
  SuggestionCard,
} from '@/components/studio/dashboard';
import type { StudioSession, TourLanguagePurchase } from '@/types/studio';

const SERVICE_NAME = 'StudioDashboardPage';

interface DashboardData {
  sessions: StudioSession[];
  scenesPerSession: Record<string, { total: number; done: number }>;
  purchasesBySession: Record<string, TourLanguagePurchase[]>;
  recentReviews: DashboardReview[];
  suggestion: DashboardSuggestion | null;
  resumable: StudioSession | null;
}

function formatRelative(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return minutes <= 1 ? "à l'instant" : `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j.`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function StudioDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (guideId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const sessions = await listStudioSessions(guideId);

      // Scenes per session — for resume hero progression bar
      const scenesPerSession: Record<string, { total: number; done: number }> = {};
      const sceneLists = await Promise.all(sessions.map((s) => listStudioScenes(s.id)));
      sessions.forEach((s, i) => {
        const list = sceneLists[i];
        scenesPerSession[s.id] = {
          total: list.length,
          done: list.filter((sc) => sc.status === 'finalized').length,
        };
      });

      // Language purchases per session — for suggestion engine
      const purchaseResults = await Promise.all(
        sessions.map(async (s) => {
          const r = await listLanguagePurchases(s.id);
          return {
            sessionId: s.id,
            purchases: r.ok ? r.value.filter((p) => p.status === 'active') : [],
          };
        }),
      );
      const purchasesBySession: Record<string, TourLanguagePurchase[]> = {};
      for (const r of purchaseResults) purchasesBySession[r.sessionId] = r.purchases;

      // Comments per session (admin/guide) — for recent reviews block
      const commentsBySession: Record<string, TourComment[]> = {};
      for (const s of sessions) {
        if (!s.tourId) continue;
        try {
          const comments = await listTourComments(s.tourId);
          commentsBySession[s.id] = comments;
        } catch {
          commentsBySession[s.id] = [];
        }
      }

      const lastSessionId = studioPersistenceService.getLastSessionId();
      const resumable = selectResumableSession(sessions, lastSessionId);
      const recentReviews = selectRecentReviews(sessions, commentsBySession);
      const suggestion = selectSuggestion(sessions, purchasesBySession);

      setData({
        sessions,
        scenesPerSession,
        purchasesBySession,
        recentReviews,
        suggestion,
        resumable,
      });
      logger.info(SERVICE_NAME, 'Dashboard loaded', { sessions: sessions.length });
      trackEvent(StudioAnalyticsEvents.STUDIO_SESSIONS_VIEW, { count: sessions.length });
    } catch (e) {
      setError('Impossible de charger le tableau de bord.');
      logger.error(SERVICE_NAME, 'Failed to load dashboard', { error: String(e) });
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
    loadDashboard(guideId);
  }, [user, loadDashboard]);

  const greetingName = useMemo(() => {
    if (!user?.displayName) return undefined;
    return user.displayName.split(/\s+/)[0];
  }, [user?.displayName]);

  // ─── Loading state ───
  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto" aria-busy="true">
        <span className="sr-only">Chargement du tableau de bord…</span>
        <div className="h-40 bg-paper-deep rounded-xl animate-pulse mb-7" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-card border border-line rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          <div className="h-64 bg-card border border-line rounded-lg animate-pulse" />
          <div className="h-64 bg-card border border-line rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // ─── No guide profile (real mode only) ───
  if (!user?.guideId && !shouldUseStubs()) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-ocre-soft border border-ocre rounded-lg p-4 text-ocre" role="alert">
          Le Studio est réservé aux guides. Créez un profil guide pour commencer.
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-grenadine-soft border border-grenadine rounded-lg p-4" role="alert">
          <p className="text-danger">{error}</p>
          <button
            type="button"
            onClick={() => loadDashboard(user?.guideId || 'guide-1')}
            className="mt-2 text-caption font-medium text-danger underline hover:opacity-80"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { sessions, scenesPerSession, recentReviews, suggestion, resumable } = data;

  // ─── Empty state (no sessions yet) ───
  if (sessions.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div
          className="bg-card border border-line rounded-xl p-12 text-center"
          data-testid="dashboard-empty"
        >
          <div className="font-display text-h5 text-ink mb-2">
            Bienvenue dans votre Studio
          </div>
          <p className="text-caption text-ink-60 max-w-md mx-auto mb-6">
            Vous n&apos;avez pas encore créé de tour. Lancez-vous : enregistrez un parcours sur le terrain avec l&apos;app mobile, puis revenez ici pour le transformer en tour audio.
          </p>
          <Link
            href="/guide/studio/nouveau"
            className="inline-flex items-center gap-2 bg-grenadine text-paper px-6 py-3 rounded-pill text-caption font-bold no-underline hover:opacity-90 transition"
          >
            ＋ Créer un nouveau tour
          </Link>
        </div>
      </div>
    );
  }

  const topTours = selectTopTours(sessions);

  // KPIs : valeurs réelles si dispo, sinon "—" (pas de mock).
  const publishedCount = sessions.filter((s) => s.status === 'published').length;
  const reviewsThisMonth = recentReviews.length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ───── Hero "Reprendre" ───── */}
      {resumable && (
        <section className="mb-8">
          <ResumeHero
            session={resumable}
            scenesTotal={scenesPerSession[resumable.id]?.total ?? 0}
            scenesDone={scenesPerSession[resumable.id]?.done ?? 0}
            guideName={greetingName}
          />
        </section>
      )}

      {/* ───── KPIs ───── */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
          <div>
            <div className="tg-eyebrow text-ink-60">Le mois en bref</div>
            <h2 className="font-display text-h5 text-ink mt-1">Vos chiffres.</h2>
          </div>
          <Link
            href="/guide/studio/revenus"
            className="text-meta text-ink-60 hover:text-ink no-underline transition"
          >
            Voir tous les revenus →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KpiCard
            label="Tours publiés"
            value={String(publishedCount)}
            color="mer"
            icon="◉"
          />
          <KpiCard label="Revenus nets" value="—" sub="ce mois" color="olive" icon="€" />
          <KpiCard label="Note moyenne" value="—" sub="/ 5" color="ocre" icon="★" />
          <KpiCard
            label="Avis récents"
            value={String(reviewsThisMonth)}
            color="grenadine"
            icon="✎"
          />
        </div>
      </section>

      {/* ───── Top tours + Avis récents ───── */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 mb-10">
        <div>
          <div className="tg-eyebrow text-mer mb-3">Tours qui marchent</div>
          {topTours.length === 0 ? (
            <div className="bg-card border border-line rounded-lg p-6 text-caption text-ink-60">
              Aucun tour publié pour le moment.
            </div>
          ) : (
            <div className="bg-card border border-line rounded-lg overflow-hidden">
              {topTours.map((s, i) => {
                const cityFromTitle = (s.title ?? '').split(/[—\-,]/)[0]?.trim() || 'Tour';
                return (
                  <TopTourRow
                    key={s.id}
                    href={`/guide/studio/${s.id}`}
                    city={cityFromTitle}
                    title={s.title || 'Tour sans titre'}
                    plays={null}
                    rating={null}
                    isLast={i === topTours.length - 1}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="tg-eyebrow text-grenadine mb-3">
            {recentReviews.length} avis récent{recentReviews.length > 1 ? 's' : ''}
          </div>
          {recentReviews.length === 0 ? (
            <div className="bg-card border border-line rounded-lg p-6 text-caption text-ink-60">
              Aucun avis pour le moment.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentReviews.map((r) => (
                <ReviewItem
                  key={r.id}
                  author={r.author}
                  when={formatRelative(r.createdAt)}
                  tourTitle={r.tourTitle}
                  quote={r.message}
                  rating={r.rating}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───── Suggestion contextuelle ───── */}
      {suggestion && (
        <section>
          <SuggestionCard
            eyebrow={suggestion.eyebrow}
            title={suggestion.title}
            body={suggestion.body}
            ctaLabel={suggestion.ctaLabel}
            ctaHref={suggestion.ctaHref}
            color={suggestion.color}
            icon="✦"
          />
        </section>
      )}
    </div>
  );
}
