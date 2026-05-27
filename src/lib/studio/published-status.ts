import type { StudioSession } from '@/types/studio';
import { shouldUseStubs } from '@/config/api-mode';

/**
 * `GuideTour.status` is the source of truth for publication (it's what the public
 * catalogue reads). `StudioSession.status` is NOT synced on publish, so a live
 * tour can linger at 'submitted' on the guide side. This promotes each session's
 * status to 'published' when its GuideTour is published, so guide-facing lists,
 * counts and KPIs match reality.
 *
 * Self-heal (Option 1): beyond the read-time promotion, when a session is stuck
 * at exactly 'submitted' while its tour is already live, we persist the fix.
 * The write runs with the guide's own credentials — the guide owns the session,
 * so unlike the admin's approve-time sync (which can be denied), this succeeds.
 * It is fire-and-forget: if it fails, the read-time promotion still shows the
 * correct status.
 *
 * The heal is deliberately NARROWER than the display promotion (only 'submitted',
 * never 'draft'/'editing'): a V2 created via cloneSessionAsV2 SHARES its parent's
 * tourId, so a draft V2 sibling of a published V1 must never be written to
 * 'published'. A genuinely-pending submission keeps its GuideTour at 'review'
 * (set by submitForReview), so this only ever fires for an approved-but-unsynced
 * session.
 *
 * Real mode only: in stub mode the sessions are self-consistent and the AppSync
 * client isn't configured. Failures degrade to the original status (never throws).
 */
export async function withPublishedStatus(sessions: StudioSession[]): Promise<StudioSession[]> {
  if (shouldUseStubs() || sessions.length === 0) return sessions;

  const { getGuideTourById, updateStudioSessionMutation } = await import('@/lib/api/appsync-client');
  const statuses = await Promise.all(
    sessions.map((s) =>
      s.tourId
        ? getGuideTourById(s.tourId)
            .then((t) => (t as { status?: string } | null)?.status ?? null)
            .catch(() => null)
        : Promise.resolve(null),
    ),
  );

  // Persist the fix for approved-but-unsynced sessions (narrow: 'submitted' only).
  sessions.forEach((s, i) => {
    if (statuses[i] === 'published' && s.status === 'submitted') {
      updateStudioSessionMutation(s.id, { status: 'published' }).catch(() => {});
    }
  });

  return sessions.map((s, i) =>
    statuses[i] === 'published' && s.status !== 'published'
      ? { ...s, status: 'published' as StudioSession['status'] }
      : s,
  );
}
