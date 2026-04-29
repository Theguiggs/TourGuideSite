import type { StudioSession } from '@/types/studio';
import type { TourComment } from '@/lib/api/tour-comments';
import type { TourLanguagePurchase } from '@/types/studio';

/** A flattened review entry for the Dashboard "Avis récents" block. */
export interface DashboardReview {
  id: string;
  /** Display name of the reviewer (admin = modération équipe). */
  author: string;
  /** ISO date string. */
  createdAt: string;
  /** Tour title where this review was left. */
  tourTitle: string;
  /** The review content. */
  message: string;
  /** Optional rating 1..5 — currently no review system in DB; left null. */
  rating: number | null;
}

export interface DashboardSuggestion {
  /** Eyebrow label, e.g. "Suggestion · une action recommandée". */
  eyebrow: string;
  /** Main short title with optional emphasized word. */
  title: string;
  /** Body explanation. */
  body: string;
  /** CTA label. */
  ctaLabel: string;
  /** Suggested href to navigate to (relative). */
  ctaHref: string;
  /** Family color for the card. */
  color: 'mer' | 'olive';
}

/**
 * Pick the session to "resume" on the dashboard hero.
 * Strategy: the session with id === lastSessionId if it's still in draft/revision,
 * else the most-recent draft, else null.
 */
export function selectResumableSession(
  sessions: StudioSession[],
  lastSessionId: string | null,
): StudioSession | null {
  if (sessions.length === 0) return null;

  const isResumable = (s: StudioSession): boolean =>
    s.status === 'draft' ||
    s.status === 'editing' ||
    s.status === 'recording' ||
    s.status === 'transcribing' ||
    s.status === 'revision_requested';

  if (lastSessionId) {
    const last = sessions.find((s) => s.id === lastSessionId);
    if (last && isResumable(last)) return last;
  }

  const drafts = sessions.filter(isResumable);
  if (drafts.length === 0) return null;

  return [...drafts].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
}

/**
 * Pick the top tours to display on the dashboard.
 * Strategy: only published sessions, sorted by updatedAt desc as proxy for popularity
 * (real plays metric not available yet — placeholder until backend ships listening data).
 */
export function selectTopTours(sessions: StudioSession[], limit = 4): StudioSession[] {
  return sessions
    .filter((s) => s.status === 'published')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

/**
 * Flatten admin comments across all sessions into a single recent-reviews list.
 * Each session's comments are passed in via the commentsBySession map.
 */
export function selectRecentReviews(
  sessions: StudioSession[],
  commentsBySession: Record<string, TourComment[]>,
  limit = 3,
): DashboardReview[] {
  const reviews: DashboardReview[] = [];

  for (const s of sessions) {
    const comments = commentsBySession[s.id];
    if (!comments) continue;
    for (const c of comments) {
      reviews.push({
        id: c.id,
        author: c.authorName || (c.author === 'admin' ? 'Modération' : 'Guide'),
        createdAt: c.createdAt,
        tourTitle: s.title || 'Tour sans titre',
        message: c.message,
        rating: null,
      });
    }
  }

  return reviews
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Suggestion contextuelle Dashboard.
 * Règle actuelle (single-rule MVP) : tour publié sans version EN → suggérer la traduction.
 * Returns null if no actionable suggestion can be derived.
 */
export function selectSuggestion(
  sessions: StudioSession[],
  purchasesBySession: Record<string, TourLanguagePurchase[]>,
): DashboardSuggestion | null {
  const published = sessions.filter((s) => s.status === 'published');
  if (published.length === 0) return null;

  const candidate = published.find((s) => {
    const langs = new Set<string>(s.availableLanguages ?? []);
    langs.add(s.language); // source language always considered available
    const purchased = (purchasesBySession[s.id] ?? []).map((p) => p.language);
    for (const p of purchased) langs.add(p);
    return !langs.has('en');
  });

  if (!candidate) return null;

  const title = candidate.title || 'Votre tour';
  return {
    eyebrow: 'Suggestion · une action recommandée',
    title: `Votre tour ${title} n'a pas de version anglaise.`,
    body:
      "Une version EN pourrait étendre votre audience. Une part importante des visiteurs internationaux préfère écouter en anglais.",
    ctaLabel: 'Démarrer la traduction',
    ctaHref: `/guide/studio/${candidate.id}/general`,
    color: 'mer',
  };
}
