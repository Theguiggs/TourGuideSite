import type { StudioSession } from '@/types/studio';

/** Group sessions that share the same tourId. Orphan sessions (no tourId) are standalone. */
export interface TourGroup {
  tourId: string | null;
  title: string;
  /** Versions sorted by version desc (latest first). */
  sessions: StudioSession[];
  publishedVersion: number | null;
  latestVersion: number;
}

const ATTENTION_STATUSES: ReadonlyArray<StudioSession['status']> = [
  'revision_requested',
  'rejected',
];

/**
 * Group studio sessions by tourId.
 * Sessions with the same tourId are merged into one TourGroup with all versions sorted desc.
 * Sessions without a tourId become standalone groups.
 *
 * Output groups are sorted: needs-attention first, then by latest update desc.
 */
export function groupSessionsByTour(sessions: StudioSession[]): TourGroup[] {
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

  for (const s of orphans) {
    groups.push({
      tourId: null,
      title: s.title || 'Session sans titre',
      sessions: [s],
      publishedVersion: null,
      latestVersion: s.version ?? 1,
    });
  }

  groups.sort((a, b) => {
    const aAttention = a.sessions.some((s) => ATTENTION_STATUSES.includes(s.status)) ? 1 : 0;
    const bAttention = b.sessions.some((s) => ATTENTION_STATUSES.includes(s.status)) ? 1 : 0;
    if (aAttention !== bAttention) return bAttention - aAttention;
    const aDate = new Date(a.sessions[0].updatedAt).getTime();
    const bDate = new Date(b.sessions[0].updatedAt).getTime();
    return bDate - aDate;
  });

  return groups;
}

/** Returns true if any session in the group is in revision_requested or rejected. */
export function groupNeedsAttention(group: TourGroup): boolean {
  return group.sessions.some((s) => ATTENTION_STATUSES.includes(s.status));
}
