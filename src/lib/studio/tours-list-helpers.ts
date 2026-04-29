import type { StudioSession, StudioSessionStatus } from '@/types/studio';

export type TourStatusFilter = 'all' | 'live' | 'draft' | 'review';

export type TourSortBy = 'recently_modified' | 'alphabetical' | 'most_played';

export interface TourStatusLabel {
  /** UI label (français). */
  label: string;
  /** Family color matching tokens (`success | ocre | mer | danger`). */
  color: 'success' | 'ocre' | 'mer' | 'danger';
  /** High-level filter bucket. */
  bucket: TourStatusFilter;
}

/**
 * Map a raw studio session status to its UI labelling.
 * The DB has 12+ statuses; we collapse them into 4 buckets the user understands.
 */
export function tourStatusLabel(status: StudioSessionStatus): TourStatusLabel {
  switch (status) {
    case 'published':
      return { label: 'En ligne', color: 'success', bucket: 'live' };

    case 'submitted':
    case 'revision_requested':
      return { label: 'En relecture', color: 'mer', bucket: 'review' };

    case 'rejected':
      return { label: 'Refusé', color: 'danger', bucket: 'review' };

    case 'archived':
      return { label: 'Archivé', color: 'ocre', bucket: 'draft' };

    case 'draft':
    case 'transcribing':
    case 'editing':
    case 'recording':
    case 'ready':
    case 'paused':
    case 'ready_for_cleanup':
    default:
      return { label: 'Brouillon', color: 'ocre', bucket: 'draft' };
  }
}

/**
 * Filter sessions by free-text query (city/title) and status bucket.
 * Empty query and 'all' filter are no-ops.
 */
export function filterTours(
  sessions: StudioSession[],
  query: string,
  statusFilter: TourStatusFilter,
): StudioSession[] {
  const q = query.trim().toLowerCase();
  return sessions.filter((s) => {
    if (statusFilter !== 'all') {
      const bucket = tourStatusLabel(s.status).bucket;
      if (bucket !== statusFilter) return false;
    }
    if (q) {
      const haystack = `${s.title ?? ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Sort sessions according to one of three strategies.
 * `most_played` falls back to `recently_modified` when play counts aren't available
 * (analytics endpoint not yet wired) — no fake data.
 */
export function sortTours(sessions: StudioSession[], sortBy: TourSortBy): StudioSession[] {
  const arr = [...sessions];
  switch (sortBy) {
    case 'alphabetical':
      return arr.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'fr'));
    case 'most_played':
      // No real play count yet → identical to recently_modified for the moment.
      return arr.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    case 'recently_modified':
    default:
      return arr.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }
}

/** Compute counts per filter bucket for the filter tabs UI. */
export function bucketCounts(sessions: StudioSession[]): Record<TourStatusFilter, number> {
  const counts: Record<TourStatusFilter, number> = {
    all: sessions.length,
    live: 0,
    draft: 0,
    review: 0,
  };
  for (const s of sessions) {
    const b = tourStatusLabel(s.status).bucket;
    counts[b] += 1;
  }
  return counts;
}
