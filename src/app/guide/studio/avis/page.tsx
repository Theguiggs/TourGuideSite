'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { listStudioSessions } from '@/lib/api/studio';
import { listTourComments, type TourComment } from '@/lib/api/tour-comments';
import { listTourReviews, listReviewRepliesByTour, upsertReviewReply } from '@/lib/api/appsync-client';
import { selectRecentReviews, type DashboardReview } from '@/lib/studio/dashboard-helpers';
import { ReviewItem } from '@/components/studio/dashboard';
import type { StudioSession } from '@/types/studio';

const SERVICE_NAME = 'StudioAvisPage';

/** Sessions a guide must act on: the moderation team asked for changes or rejected. */
const ATTENTION_STATUSES = ['revision_requested', 'rejected'] as const;

const LANG_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'Anglais',
  it: 'Italien',
  de: 'Allemand',
  es: 'Espagnol',
};
const langLabel = (code: string) => LANG_LABELS[code] ?? code.toUpperCase();

/** Shape returned by listTourReviews (AppSync TourReview model, loosely typed). */
interface ReviewLike {
  id: string;
  rating: number;
  comment?: string | null;
  language?: string | null;
  createdAt: string;
  authorName?: string | null;
  verified?: boolean | null;
}

interface AuditorReview {
  id: string;
  rating: number;
  comment: string;
  language: string | null;
  createdAt: string;
  tourId: string;
  tourTitle: string;
  authorName: string | null;
  verified: boolean;
}

interface AttentionTour {
  session: StudioSession;
  feedback: string | null;
  when: string | null;
}

interface AvisData {
  auditorReviews: AuditorReview[];
  avgRating: number | null;
  ratedCount: number;
  /** Count of ratings per star, indices 1..5 (0 unused). Over ALL rated reviews. */
  histogram: number[];
  /** Guide reply per reviewId. */
  repliesByReview: Record<string, { id: string; message: string }>;
  moderation: DashboardReview[];
  attention: AttentionTour[];
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

/** listTourComments returns oldest→newest, so the last admin entry is the latest feedback. */
function latestAdminComment(comments: TourComment[]): TourComment | null {
  let last: TourComment | null = null;
  for (const c of comments) if (c.author === 'admin') last = c;
  return last;
}

export default function StudioAvisPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AvisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (front-only, applied to the loaded data)
  const [filterTour, setFilterTour] = useState<string>('all');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  // Guide reply editing
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [draftReply, setDraftReply] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const loadAvis = useCallback(async (guideId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const sessions = await listStudioSessions(guideId);
      const useStubs = shouldUseStubs();

      const commentsBySession: Record<string, TourComment[]> = {};
      const auditorReviews: AuditorReview[] = [];
      const repliesByReview: Record<string, { id: string; message: string }> = {};
      let ratedSum = 0;
      let ratedCount = 0; // every review carrying a rating (incl. rating-only, no comment)
      const histogram = [0, 0, 0, 0, 0, 0]; // index 1..5

      // Per tour: moderation comments + auditor reviews + guide replies, in parallel.
      await Promise.all(
        sessions.map(async (s) => {
          if (!s.tourId) {
            commentsBySession[s.id] = [];
            return;
          }
          const tourId = s.tourId;
          const [comments, reviews, replies] = await Promise.all([
            listTourComments(tourId).catch(() => [] as TourComment[]),
            useStubs
              ? Promise.resolve([] as ReviewLike[])
              : (listTourReviews(tourId).catch(() => []) as Promise<ReviewLike[]>),
            useStubs ? Promise.resolve([]) : listReviewRepliesByTour(tourId).catch(() => []),
          ]);
          commentsBySession[s.id] = comments;
          for (const rep of replies) {
            if (rep.reviewId && rep.message) repliesByReview[rep.reviewId] = { id: rep.id, message: rep.message };
          }
          for (const r of reviews) {
            // The average + histogram reflect ALL ratings…
            if (typeof r.rating === 'number') {
              ratedSum += r.rating;
              ratedCount += 1;
              const star = Math.round(r.rating);
              if (star >= 1 && star <= 5) histogram[star] += 1;
            }
            // …but the readable list only shows reviews with an actual comment.
            if (!r.comment || !r.comment.trim()) continue;
            auditorReviews.push({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              language: r.language ?? null,
              createdAt: r.createdAt,
              tourId,
              tourTitle: s.title || 'Tour sans titre',
              authorName: r.authorName ?? null,
              verified: !!r.verified,
            });
          }
        }),
      );

      auditorReviews.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const avgRating = ratedCount > 0 ? ratedSum / ratedCount : null;

      // All moderation/guide comments, newest first (no 3-item cap unlike the dashboard).
      const moderation = selectRecentReviews(sessions, commentsBySession, Number.MAX_SAFE_INTEGER);

      const attention: AttentionTour[] = sessions
        .filter((s) => (ATTENTION_STATUSES as readonly string[]).includes(s.status))
        .map((s) => {
          const fb = latestAdminComment(commentsBySession[s.id] ?? []);
          return { session: s, feedback: fb?.message ?? null, when: fb?.createdAt ?? null };
        });

      setData({ auditorReviews, avgRating, ratedCount, histogram, repliesByReview, moderation, attention });
      logger.info(SERVICE_NAME, 'Avis loaded', {
        auditor: auditorReviews.length,
        rated: ratedCount,
        moderation: moderation.length,
        attention: attention.length,
      });
    } catch (e) {
      setError('Impossible de charger les avis.');
      logger.error(SERVICE_NAME, 'Failed to load avis', { error: String(e) });
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
    loadAvis(guideId);
  }, [user, loadAvis]);

  // ─── Derived (hooks must run before any early return) ───
  const tourOptions = useMemo(() => {
    const set = new Set<string>();
    (data?.auditorReviews ?? []).forEach((r) => set.add(r.tourTitle));
    (data?.moderation ?? []).forEach((r) => set.add(r.tourTitle));
    return [...set].sort();
  }, [data]);

  const langOptions = useMemo(() => {
    const set = new Set<string>();
    (data?.auditorReviews ?? []).forEach((r) => {
      if (r.language) set.add(r.language);
    });
    return [...set].sort();
  }, [data]);

  const filteredAuditor = useMemo(() => {
    return (data?.auditorReviews ?? []).filter(
      (r) =>
        (filterTour === 'all' || r.tourTitle === filterTour) &&
        (filterLang === 'all' || (r.language ?? '') === filterLang) &&
        (filterRating === 'all' || Math.round(r.rating) === filterRating),
    );
  }, [data, filterTour, filterLang, filterRating]);

  const filteredModeration = useMemo(() => {
    return (data?.moderation ?? []).filter((r) => filterTour === 'all' || r.tourTitle === filterTour);
  }, [data, filterTour]);

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto" aria-busy="true">
        <span className="sr-only">Chargement des avis…</span>
        <div className="h-12 w-48 bg-paper-deep rounded-md animate-pulse mb-6" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card border border-line rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ─── No guide profile (real mode) ───
  if (!user?.guideId && !shouldUseStubs()) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-ocre-soft border border-ocre rounded-lg p-4 text-ocre" role="alert">
          Le Studio est réservé aux guides. Créez un profil guide pour commencer.
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-grenadine-soft border border-grenadine rounded-lg p-4" role="alert">
          <p className="text-danger">{error}</p>
          <button
            type="button"
            onClick={() => loadAvis(user?.guideId || 'guide-1')}
            className="mt-2 text-caption font-medium text-danger underline hover:opacity-80"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { avgRating, ratedCount, histogram, attention } = data;
  const avgStars = avgRating !== null ? Math.round(avgRating) : 0;
  const auditorOnlyFilterActive = filterLang !== 'all' || filterRating !== 'all';
  const anyFilterActive = filterTour !== 'all' || auditorOnlyFilterActive;
  const resetFilters = () => {
    setFilterTour('all');
    setFilterLang('all');
    setFilterRating('all');
  };

  // Replying is a real-mode, guide-only action.
  const canReply = !shouldUseStubs() && !!user?.guideId;

  const startReply = (reviewId: string, current: string) => {
    setReplyError(null);
    setDraftReply(current);
    setEditingReviewId(reviewId);
  };
  const cancelReply = () => {
    setEditingReviewId(null);
    setDraftReply('');
    setReplyError(null);
  };
  const saveReply = async (review: AuditorReview) => {
    const guideId = user?.guideId;
    const text = draftReply.trim();
    if (!guideId || !text) return;
    setSavingReply(true);
    setReplyError(null);
    const existing = data.repliesByReview[review.id];
    const result = await upsertReviewReply({
      reviewId: review.id,
      tourId: review.tourId,
      guideId,
      message: text,
      existingId: existing?.id ?? null,
    });
    setSavingReply(false);
    if (result.ok) {
      setData((prev) =>
        prev
          ? { ...prev, repliesByReview: { ...prev.repliesByReview, [review.id]: { id: result.id, message: text } } }
          : prev,
      );
      cancelReply();
    } else {
      setReplyError(result.error);
    }
  };

  const selectClass =
    'bg-card border border-line rounded-md px-3 py-2 text-meta text-ink focus:outline-none focus:border-grenadine transition';

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* ───── Header + note moyenne + histogramme ───── */}
      <header className="mb-7">
        <div className="tg-eyebrow text-grenadine">Avis & retours</div>
        <h1 className="font-display text-h3 text-ink mt-1 leading-none">
          Vos <em className="font-editorial italic">retours</em>.
        </h1>
        <p className="font-editorial italic text-body text-ink-60 max-w-xl mt-2">
          Ce que vos auditeurs en pensent, et les retours de la modération — au même endroit.
        </p>

        {ratedCount > 0 && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
            {/* Note moyenne */}
            <div className="bg-card border border-line rounded-lg px-6 py-4 text-center">
              <div className="font-display text-h3 text-ink leading-none">
                {avgRating!.toFixed(1)}
              </div>
              <div
                className="text-ocre text-caption font-bold mt-1"
                aria-label={`${avgStars} étoiles sur 5`}
              >
                <span aria-hidden="true">{'★'.repeat(avgStars)}</span>
                <span aria-hidden="true" className="text-ink-20">
                  {'★'.repeat(5 - avgStars)}
                </span>
              </div>
              <div className="text-meta text-ink-60 mt-1">
                {ratedCount} avis auditeur{ratedCount > 1 ? 's' : ''}
              </div>
            </div>

            {/* Histogramme cliquable (filtre par note) */}
            <div className="bg-card border border-line rounded-lg px-5 py-4">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = histogram[star] ?? 0;
                const pct = ratedCount > 0 ? (count / ratedCount) * 100 : 0;
                const active = filterRating === star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFilterRating(active ? 'all' : star)}
                    aria-pressed={active}
                    data-testid={`avis-histo-${star}`}
                    className={[
                      'w-full flex items-center gap-3 py-1 group',
                      active ? 'opacity-100' : 'opacity-90 hover:opacity-100',
                    ].join(' ')}
                    title={`Filtrer sur ${star} étoile${star > 1 ? 's' : ''}`}
                  >
                    <span className="text-meta text-ink-60 w-8 text-right shrink-0">
                      {star}★
                    </span>
                    <span className="flex-1 h-2.5 bg-paper-deep rounded-pill overflow-hidden">
                      <span
                        className={['block h-full rounded-pill transition-all', active ? 'bg-grenadine' : 'bg-ocre group-hover:bg-grenadine'].join(' ')}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="text-meta text-ink-60 w-7 text-right shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* ───── À traiter (tours en révision / refusés) — toujours visible ───── */}
      {attention.length > 0 && (
        <section className="mb-9" data-testid="avis-attention">
          <div className="tg-eyebrow text-ocre mb-3">
            À traiter · {attention.length} tour{attention.length > 1 ? 's' : ''}
          </div>
          <div className="flex flex-col gap-2.5">
            {attention.map(({ session, feedback, when }) => {
              const isRejected = session.status === 'rejected';
              return (
                <Link
                  key={session.id}
                  href={`/guide/studio/${session.id}/submission`}
                  data-testid="avis-attention-item"
                  className="block bg-card border border-ocre rounded-lg p-4 no-underline hover:bg-paper-soft transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-caption font-semibold text-ink truncate">
                      {session.title || 'Tour sans titre'}
                    </div>
                    <span
                      className={[
                        'text-meta font-bold rounded-pill px-2.5 py-0.5 shrink-0',
                        isRejected ? 'bg-grenadine text-paper' : 'bg-ocre text-paper',
                      ].join(' ')}
                    >
                      {isRejected ? 'Refusé' : 'Révision demandée'}
                    </span>
                  </div>
                  {feedback ? (
                    <p className="font-editorial italic text-caption text-ink-80 mt-2 leading-relaxed">
                      « {feedback} »
                    </p>
                  ) : (
                    <p className="text-meta text-ink-60 mt-2">
                      Ouvrez le tour pour voir le détail du retour de la modération.
                    </p>
                  )}
                  <div className="text-meta text-ink-40 mt-2">
                    {when ? `${formatRelative(when)} · ` : ''}Voir et corriger →
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ───── Barre de filtres ───── */}
      {(tourOptions.length > 0 || langOptions.length > 0) && (
        <div className="flex items-center gap-3 flex-wrap mb-5" data-testid="avis-filters">
          {tourOptions.length > 0 && (
            <label className="flex items-center gap-2">
              <span className="text-meta text-ink-60">Tour</span>
              <select
                value={filterTour}
                onChange={(e) => setFilterTour(e.target.value)}
                data-testid="avis-filter-tour"
                className={selectClass}
              >
                <option value="all">Tous</option>
                {tourOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}
          {langOptions.length > 0 && (
            <label className="flex items-center gap-2">
              <span className="text-meta text-ink-60">Langue</span>
              <select
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
                data-testid="avis-filter-lang"
                className={selectClass}
              >
                <option value="all">Toutes</option>
                {langOptions.map((l) => (
                  <option key={l} value={l}>
                    {langLabel(l)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {filterRating !== 'all' && (
            <span className="text-meta text-ink-80 bg-paper-deep rounded-pill px-3 py-1">
              Note : {filterRating}★
            </span>
          )}
          {anyFilterActive && (
            <button
              type="button"
              onClick={resetFilters}
              data-testid="avis-filter-reset"
              className="text-meta font-semibold text-grenadine underline hover:opacity-80"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* ───── Avis des auditeurs ───── */}
      <section className="mb-9" data-testid="avis-auditeurs">
        <div className="tg-eyebrow text-mer mb-3">
          Avis des auditeurs{filteredAuditor.length > 0 ? ` · ${filteredAuditor.length}` : ''}
        </div>
        {data.auditorReviews.length === 0 ? (
          <div className="bg-card border border-line rounded-lg p-6 text-caption text-ink-60">
            Aucun avis d&apos;auditeur pour le moment. Ils apparaîtront ici une fois vos tours écoutés.
          </div>
        ) : filteredAuditor.length === 0 ? (
          <div className="bg-card border border-line rounded-lg p-6 text-center" data-testid="avis-auditeurs-filtered-empty">
            <p className="text-caption text-ink-60 mb-2">Aucun avis ne correspond à ces filtres.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-caption font-semibold text-grenadine underline hover:opacity-80"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredAuditor.map((r) => {
              const reply = data.repliesByReview[r.id];
              const isEditing = editingReviewId === r.id;
              return (
                <div key={r.id} data-testid="avis-auditeur-item">
                  <ReviewItem
                    author={r.authorName || 'Auditeur'}
                    when={formatRelative(r.createdAt)}
                    tourTitle={r.language ? `${r.tourTitle} · ${r.language.toUpperCase()}` : r.tourTitle}
                    quote={r.comment}
                    rating={r.rating}
                    verified={r.verified}
                  />

                  {/* Réponse du guide */}
                  {(reply || canReply) && (
                    <div className="ml-4 mt-1.5 border-l-2 border-ocre pl-3">
                      {isEditing ? (
                        <div data-testid="avis-reply-editor">
                          <textarea
                            value={draftReply}
                            onChange={(e) => setDraftReply(e.target.value)}
                            rows={3}
                            maxLength={1000}
                            autoFocus
                            placeholder="Votre réponse publique à cet avis…"
                            className="w-full bg-paper border border-line rounded-md px-3 py-2 text-meta text-ink placeholder:text-ink-40 focus:outline-none focus:border-grenadine transition"
                          />
                          {replyError && <p className="text-meta text-danger mt-1">{replyError}</p>}
                          <div className="flex items-center gap-3 mt-1.5">
                            <button
                              type="button"
                              onClick={() => saveReply(r)}
                              disabled={savingReply || !draftReply.trim()}
                              data-testid="avis-reply-save"
                              className="bg-grenadine text-paper px-4 py-1.5 rounded-pill text-meta font-bold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {savingReply ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelReply}
                              className="text-meta text-ink-60 hover:text-ink transition"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : reply ? (
                        <div>
                          <div className="text-meta font-bold text-ocre">Votre réponse</div>
                          <p className="text-meta text-ink-80 mt-0.5 leading-relaxed">{reply.message}</p>
                          {canReply && (
                            <button
                              type="button"
                              onClick={() => startReply(r.id, reply.message)}
                              className="text-meta font-semibold text-grenadine underline hover:opacity-80 mt-1"
                            >
                              Modifier
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startReply(r.id, '')}
                          data-testid="avis-reply-btn"
                          className="text-meta font-semibold text-grenadine hover:opacity-80 transition"
                        >
                          ↳ Répondre
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ───── Retours de la modération (masqués si filtre note/langue actif) ───── */}
      {!auditorOnlyFilterActive && (
        <section data-testid="avis-moderation">
          <div className="tg-eyebrow text-ink-60 mb-3">
            Retours de la modération{filteredModeration.length > 0 ? ` · ${filteredModeration.length}` : ''}
          </div>
          {filteredModeration.length === 0 ? (
            <div className="bg-card border border-line rounded-lg p-6 text-caption text-ink-60">
              Aucun retour de la modération{filterTour !== 'all' ? ' pour ce tour' : ''}.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredModeration.map((r) => (
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
        </section>
      )}

      {/* ───── Empty global ───── */}
      {ratedCount === 0 && data.moderation.length === 0 && attention.length === 0 && (
        <div className="mt-6 text-center" data-testid="avis-empty">
          <Link
            href="/guide/studio/tours"
            className="text-caption font-semibold text-grenadine underline hover:opacity-80"
          >
            Voir mes tours
          </Link>
        </div>
      )}
    </div>
  );
}
