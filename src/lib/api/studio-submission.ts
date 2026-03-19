import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { remove } from 'aws-amplify/storage';
import { __updateStubSessionStatus } from './studio';
import type { StudioSessionStatus } from '@/types/studio';

const SERVICE_NAME = 'StudioSubmissionAPI';

export type SubmissionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitSessionForModeration(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 800));
    logger.info(SERVICE_NAME, 'Session submitted (stub)', { sessionId });
    return { ok: true };
  }
  try {
    const { updateStudioSessionMutation } = await import('./appsync-client');
    const result = await updateStudioSessionMutation(sessionId, { status: 'submitted' });
    if (!result.ok) return { ok: false, error: result.error };
    logger.info(SERVICE_NAME, 'Session submitted (AppSync)', { sessionId });
    return { ok: true };
  } catch (e) {
    logger.error(SERVICE_NAME, 'submitSessionForModeration failed', { error: String(e) });
    return { ok: false, error: 'Erreur lors de la soumission.' };
  }
}

export async function resubmitSession(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 500));
    logger.info(SERVICE_NAME, 'Session resubmitted (stub)', { sessionId });
    return { ok: true };
  }
  try {
    const { updateStudioSessionMutation } = await import('./appsync-client');
    const result = await updateStudioSessionMutation(sessionId, { status: 'submitted' });
    if (!result.ok) return { ok: false, error: result.error };
    logger.info(SERVICE_NAME, 'Session resubmitted (AppSync)', { sessionId });
    return { ok: true };
  } catch (e) {
    logger.error(SERVICE_NAME, 'resubmitSession failed', { error: String(e) });
    return { ok: false, error: 'Erreur lors de la re-soumission.' };
  }
}

export async function deleteSession(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 500));
    logger.info(SERVICE_NAME, 'Session deleted (stub)', { sessionId });
    return { ok: true };
  }
  // Real mode: cascade-delete S3 files, scenes, then session
  try {
    const appsync = await import('./appsync-client');
    const scenesResult = await appsync.listStudioScenesBySession(sessionId);
    if (scenesResult.ok) {
      // Collect S3 keys from all scenes for best-effort deletion
      const s3Keys: string[] = [];
      for (const scene of scenesResult.data) {
        const s = scene as Record<string, unknown>;
        if (s.originalAudioKey) s3Keys.push(s.originalAudioKey as string);
        if (s.studioAudioKey) s3Keys.push(s.studioAudioKey as string);
        if (Array.isArray(s.photosRefs)) {
          for (const photoKey of s.photosRefs as string[]) {
            if (photoKey) s3Keys.push(photoKey);
          }
        }
      }

      // Best-effort S3 cleanup
      for (const key of s3Keys) {
        try {
          await remove({ path: key });
        } catch (s3Err) {
          logger.warn(SERVICE_NAME, 'S3 file delete failed (best-effort)', { key, error: String(s3Err) });
        }
      }

      // Delete scene records
      for (const scene of scenesResult.data) {
        const delResult = await appsync.deleteStudioSceneMutation((scene as Record<string, unknown>).id as string);
        if (!delResult.ok) {
          logger.warn(SERVICE_NAME, 'Scene delete failed (continuing)', { sceneId: (scene as Record<string, unknown>).id, error: delResult.error });
        }
      }
    }
    const result = await appsync.deleteStudioSessionMutation(sessionId);
    if (!result.ok) return { ok: false, error: result.error };
    logger.info(SERVICE_NAME, 'Session deleted (AppSync)', { sessionId });
    return { ok: true };
  } catch (e) {
    logger.error(SERVICE_NAME, 'deleteSession failed', { error: String(e) });
    return { ok: false, error: 'Erreur lors de la suppression.' };
  }
}

export async function updateSessionStatus(
  sessionId: string,
  status: StudioSessionStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'Status updated (stub)', { sessionId, status });
    return { ok: true };
  }
  try {
    const { updateStudioSessionMutation } = await import('./appsync-client');
    const result = await updateStudioSessionMutation(sessionId, { status });
    if (!result.ok) return { ok: false, error: result.error };
    logger.info(SERVICE_NAME, 'Status updated (AppSync)', { sessionId, status });
    return { ok: true };
  } catch (e) {
    logger.error(SERVICE_NAME, 'updateSessionStatus failed', { error: String(e) });
    return { ok: false, error: 'Erreur lors de la mise à jour du statut.' };
  }
}

export async function submitForReview(
  sessionId: string,
  tourId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 800));
    __updateStubSessionStatus(sessionId, 'submitted');
    logger.info(SERVICE_NAME, 'Submitted for review (stub)', { sessionId, tourId });
    return { ok: true };
  }
  // Real mode: update session + tour status + create ModerationItem
  try {
    const appsync = await import('./appsync-client');
    const sessionResult = await appsync.updateStudioSessionMutation(sessionId, { status: 'submitted' });
    if (!sessionResult.ok) return { ok: false, error: sessionResult.error };

    const tourResult = await appsync.updateGuideTourMutation(tourId, { status: 'review' });
    if (!tourResult.ok) {
      logger.error(SERVICE_NAME, 'Tour update failed, rolling back session', { tourId, error: tourResult.error });
      await appsync.updateStudioSessionMutation(sessionId, { status: 'editing' });
      return { ok: false, error: tourResult.error };
    }

    // Create ModerationItem so admin sees it in the moderation queue
    const tour = await appsync.getGuideTourById(tourId);
    if (tour) {
      const profile = await appsync.getGuideProfileById(tour.guideId, 'userPool');
      const modResult = await appsync.createModerationItemMutation({
        tourId,
        guideId: tour.guideId,
        guideName: profile?.displayName ?? 'Guide',
        tourTitle: tour.title,
        city: tour.city,
        submissionDate: Date.now(),
      });
      if (!modResult.ok) {
        logger.error(SERVICE_NAME, 'ModerationItem creation failed (non-blocking)', { tourId, error: modResult.error });
      }
    } else {
      logger.warn(SERVICE_NAME, 'Tour not found for ModerationItem creation', { tourId });
    }

    logger.info(SERVICE_NAME, 'Submitted for review (AppSync)', { sessionId, tourId });
    return { ok: true };
  } catch (e) {
    logger.error(SERVICE_NAME, 'submitForReview failed', { error: String(e) });
    return { ok: false, error: 'Erreur lors de la soumission.' };
  }
}

export async function retractSubmission(
  sessionId: string,
  tourId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 500));
    __updateStubSessionStatus(sessionId, 'editing');
    logger.info(SERVICE_NAME, 'Submission retracted (stub)', { sessionId, tourId });
    return { ok: true };
  }
  // Real mode: update session then tour status via AppSync (sequential with rollback)
  try {
    const appsync = await import('./appsync-client');
    const sessionResult = await appsync.updateStudioSessionMutation(sessionId, { status: 'editing' });
    if (!sessionResult.ok) return { ok: false, error: sessionResult.error };

    const tourResult = await appsync.updateGuideTourMutation(tourId, { status: 'editing' });
    if (!tourResult.ok) {
      // Rollback session to previous status
      logger.error(SERVICE_NAME, 'Tour update failed, rolling back session', { tourId, error: tourResult.error });
      await appsync.updateStudioSessionMutation(sessionId, { status: 'submitted' });
      return { ok: false, error: tourResult.error };
    }

    logger.info(SERVICE_NAME, 'Submission retracted (AppSync)', { sessionId, tourId });
    return { ok: true };
  } catch (e) {
    logger.error(SERVICE_NAME, 'retractSubmission failed', { error: String(e) });
    return { ok: false, error: 'Erreur lors du retrait.' };
  }
}

export async function addModerationFeedback(
  sceneId: string,
  feedback: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'Feedback added (stub)', { sceneId });
    return { ok: true };
  }
  try {
    const { updateStudioSceneMutation } = await import('./appsync-client');
    const result = await updateStudioSceneMutation(sceneId, { moderationFeedback: feedback });
    if (!result.ok) return { ok: false, error: result.error };
    logger.info(SERVICE_NAME, 'Feedback added (AppSync)', { sceneId });
    return { ok: true };
  } catch (e) {
    logger.error(SERVICE_NAME, 'addModerationFeedback failed', { error: String(e) });
    return { ok: false, error: "Erreur lors de l'ajout du feedback." };
  }
}
