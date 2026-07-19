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
import { useStudioLocale, type StudioLocale } from '@/lib/i18n/studio-locale';

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
const langLabel = (code: string, locale: StudioLocale) => locale === 'en'
  ? ({ fr: 'French', en: 'English', it: 'Italian', de: 'German', es: 'Spanish' }[code] ?? code.toUpperCase())
  : LANG_LABELS[code] ?? code.toUpperCase();

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

function formatRelative(iso: string, locale: StudioLocale, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return minutes <= 1 ? (locale === 'en' ? 'just now' : "à l'instant") : locale === 'en' ? `${minutes} min ago` : `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === 'en' ? `${hours}h ago` : `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return locale === 'en' ? 'yesterday' : 'hier';
  if (days < 7) return locale === 'en' ? `${days}d ago` : `il y a ${days} j.`;
  return date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short' });
}

/** listTourComments returns oldest→newest, so the last admin entry is the latest feedback. */
function latestAdminComment(comments: TourComment[]): TourComment | null {
  let last: TourComment | null = null;
  for (const c of comments) if (c.author === 'admin') last = c;
  return last;
}

export default function StudioAvisPage() {
  const { user } = useAuth();
  const { locale } = useStudioLocale();
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
  const copy = useMemo(() => locale === 'en' ? {
    loadError: 'Unable to load reviews.', loading: 'Loading reviews...', guideOnly: 'The Studio is for guides. Create a guide profile to get started.', retry: 'Try again',
    eyebrow: 'Reviews & feedback', titleStart: 'Your', titleEmphasis: 'feedback', intro: 'What listeners think and moderation feedback, all in one place.',
    listenerReview: 'listener review', listenerReviews: 'listener reviews', starsOutOf: 'stars out of 5', filterStars: 'Filter by',
    attention: 'Needs attention', tour: 'tour', tours: 'tours', untitled: 'Untitled tour', rejected: 'Rejected', revision: 'Changes requested',
    openFeedback: 'Open the tour to read the moderation feedback.', viewFix: 'View and fix', language: 'Language', allMasc: 'All', allFem: 'All', rating: 'Rating', reset: 'Reset',
    listenerSection: 'Listener reviews', noListener: 'No listener reviews yet. They will appear here after travellers listen to your tours.', noFilter: 'No reviews match these filters.', resetFilters: 'Reset filters',
    listener: 'Listener', replyPlaceholder: 'Your public reply to this review...', saving: 'Saving...', save: 'Save', cancel: 'Cancel', yourReply: 'Your reply', edit: 'Edit', reply: 'Reply',
    moderation: 'Moderation feedback', noModeration: 'No moderation feedback', forTour: ' for this tour', viewTours: 'View my tours',
  } : {
    loadError: 'Impossible de charger les avis.', loading: 'Chargement des avis...', guideOnly: 'Le Studio est réservé aux guides. Créez un profil guide pour commencer.', retry: 'Réessayer',
    eyebrow: 'Avis & retours', titleStart: 'Vos', titleEmphasis: 'retours', intro: 'Ce que vos auditeurs en pensent et les retours de la modération, au même endroit.',
    listenerReview: 'avis auditeur', listenerReviews: 'avis auditeurs', starsOutOf: 'étoiles sur 5', filterStars: 'Filtrer sur',
    attention: 'À traiter', tour: 'visite', tours: 'visites', untitled: 'Visite sans titre', rejected: 'Refusée', revision: 'Révision demandée',
    openFeedback: 'Ouvrez la visite pour voir le détail du retour de la modération.', viewFix: 'Voir et corriger', language: 'Langue', allMasc: 'Toutes', allFem: 'Toutes', rating: 'Note', reset: 'Réinitialiser',
    listenerSection: 'Avis des auditeurs', noListener: 'Aucun avis d’auditeur pour le moment. Ils apparaîtront ici après l’écoute de vos visites.', noFilter: 'Aucun avis ne correspond à ces filtres.', resetFilters: 'Réinitialiser les filtres',
    listener: 'Auditeur', replyPlaceholder: 'Votre réponse publique à cet avis...', saving: 'Enregistrement...', save: 'Enregistrer', cancel: 'Annuler', yourReply: 'Votre réponse', edit: 'Modifier', reply: 'Répondre',
    moderation: 'Retours de la modération', noModeration: 'Aucun retour de la modération', forTour: ' pour cette visite', viewTours: 'Voir mes visites',
  }, [locale]);

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
              tourTitle: s.title || copy.untitled,
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
      setError(copy.loadError);
      logger.error(SERVICE_NAME, 'Failed to load avis', { error: String(e) });
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError, copy.untitled]);

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
        <span className="sr-only">{copy.loading}</span>
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
          {copy.guideOnly}
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
            {copy.retry}
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
        <div className="tg-eyebrow text-grenadine">{copy.eyebrow}</div>
        <h1 className="font-display text-h3 text-ink mt-1 leading-none">
          {copy.titleStart} <em className="font-editorial italic">{copy.titleEmphasis}</em>.
        </h1>
        <p className="font-editorial italic text-body text-ink-60 max-w-xl mt-2">
          {copy.intro}
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
                aria-label={`${avgStars} ${copy.starsOutOf}`}
              >
                <span aria-hidden="true">{'★'.repeat(avgStars)}</span>
                <span aria-hidden="true" className="text-ink-20">
                  {'★'.repeat(5 - avgStars)}
                </span>
              </div>
              <div className="text-meta text-ink-60 mt-1">
                {ratedCount} {ratedCount > 1 ? copy.listenerReviews : copy.listenerReview}
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
                    title={`${copy.filterStars} ${star}`}
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
            {copy.attention} · {attention.length} {attention.length > 1 ? copy.tours : copy.tour}
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
                      {session.title || copy.untitled}
                    </div>
                    <span
                      className={[
                        'text-meta font-bold rounded-pill px-2.5 py-0.5 shrink-0',
                        isRejected ? 'bg-grenadine text-paper' : 'bg-ocre text-paper',
                      ].join(' ')}
                    >
                      {isRejected ? copy.rejected : copy.revision}
                    </span>
                  </div>
                  {feedback ? (
                    <p className="font-editorial italic text-caption text-ink-80 mt-2 leading-relaxed">
                      « {feedback} »
                    </p>
                  ) : (
                    <p className="text-meta text-ink-60 mt-2">
                      {copy.openFeedback}
                    </p>
                  )}
                  <div className="text-meta text-ink-40 mt-2">
                    {when ? `${formatRelative(when, locale)} · ` : ''}{copy.viewFix} →
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
              <span className="text-meta text-ink-60">{copy.tour}</span>
              <select
                value={filterTour}
                onChange={(e) => setFilterTour(e.target.value)}
                data-testid="avis-filter-tour"
                className={selectClass}
              >
                <option value="all">{copy.allMasc}</option>
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
              <span className="text-meta text-ink-60">{copy.language}</span>
              <select
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
                data-testid="avis-filter-lang"
                className={selectClass}
              >
                <option value="all">{copy.allFem}</option>
                {langOptions.map((l) => (
                  <option key={l} value={l}>
                    {langLabel(l, locale)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {filterRating !== 'all' && (
            <span className="text-meta text-ink-80 bg-paper-deep rounded-pill px-3 py-1">
              {copy.rating} : {filterRating}★
            </span>
          )}
          {anyFilterActive && (
            <button
              type="button"
              onClick={resetFilters}
              data-testid="avis-filter-reset"
              className="text-meta font-semibold text-grenadine underline hover:opacity-80"
            >
              {copy.reset}
            </button>
          )}
        </div>
      )}

      {/* ───── Avis des auditeurs ───── */}
      <section className="mb-9" data-testid="avis-auditeurs">
        <div className="tg-eyebrow text-mer mb-3">
          {copy.listenerSection}{filteredAuditor.length > 0 ? ` · ${filteredAuditor.length}` : ''}
        </div>
        {data.auditorReviews.length === 0 ? (
          <div className="bg-card border border-line rounded-lg p-6 text-caption text-ink-60">
            {copy.noListener}
          </div>
        ) : filteredAuditor.length === 0 ? (
          <div className="bg-card border border-line rounded-lg p-6 text-center" data-testid="avis-auditeurs-filtered-empty">
            <p className="text-caption text-ink-60 mb-2">{copy.noFilter}</p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-caption font-semibold text-grenadine underline hover:opacity-80"
            >
              {copy.resetFilters}
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
                    author={r.authorName || copy.listener}
                    when={formatRelative(r.createdAt, locale)}
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
                            placeholder={copy.replyPlaceholder}
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
                              {savingReply ? copy.saving : copy.save}
                            </button>
                            <button
                              type="button"
                              onClick={cancelReply}
                              className="text-meta text-ink-60 hover:text-ink transition"
                            >
                              {copy.cancel}
                            </button>
                          </div>
                        </div>
                      ) : reply ? (
                        <div>
                          <div className="text-meta font-bold text-ocre">{copy.yourReply}</div>
                          <p className="text-meta text-ink-80 mt-0.5 leading-relaxed">{reply.message}</p>
                          {canReply && (
                            <button
                              type="button"
                              onClick={() => startReply(r.id, reply.message)}
                              className="text-meta font-semibold text-grenadine underline hover:opacity-80 mt-1"
                            >
                              {copy.edit}
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
                          ↳ {copy.reply}
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
            {copy.moderation}{filteredModeration.length > 0 ? ` · ${filteredModeration.length}` : ''}
          </div>
          {filteredModeration.length === 0 ? (
            <div className="bg-card border border-line rounded-lg p-6 text-caption text-ink-60">
              {copy.noModeration}{filterTour !== 'all' ? copy.forTour : ''}.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredModeration.map((r) => (
                <ReviewItem
                  key={r.id}
                  author={r.author}
                  when={formatRelative(r.createdAt, locale)}
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
            {copy.viewTours}
          </Link>
        </div>
      )}
    </div>
  );
}
