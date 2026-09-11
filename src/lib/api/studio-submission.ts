import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { evaluateStudioVisit } from '@/lib/studio/visit-completeness';
import { remove } from 'aws-amplify/storage';
import { __updateStubSessionStatus, getStudioSession, listStudioScenes } from './studio';
import type { StudioSessionStatus } from '@/types/studio';

const SERVICE_NAME = 'StudioSubmissionAPI';

export type SubmissionResult =
  | { ok: true }
  | { ok: false; error: string };

async function validateVisitBeforeSubmission(sessionId: string): Promise<SubmissionResult> {
  const [session, scenes] = await Promise.all([
    getStudioSession(sessionId),
    listStudioScenes(sessionId),
  ]);
  if (!session) {
    return { ok: false, error: 'Version de visite introuvable.' };
  }
  const report = evaluateStudioVisit(session, scenes);
  if (!report.ready) {
    const evidence = report.checks
      .filter((check) => !check.passed)
      .map((check) => check.evidence)
      .join(' ');
    return { ok: false, error: `Soumission bloquée : ${evidence}` };
  }
  return { ok: true };
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

/**
 * Statuts pour lesquels la suppression est refusée : la version est visible des
 * touristes, ou attendue par un modérateur. Le guide doit passer par
 * « Archiver » d'abord, ce qui la retire du catalogue sans rien détruire.
 */
const PROTECTED_FROM_DELETE = new Set(['published', 'submitted', 'paused']);

/**
 * Supprime une version de travail et ses scènes.
 *
 * ─── Ordre des suppressions ──────────────────────────────────────────────────
 * Les fichiers S3 étaient effacés EN PREMIER, avant les enregistrements. Un
 * échec à mi-parcours laissait donc une visite dont l'audio avait disparu :
 * publiée, elle restait au catalogue avec des scènes muettes. L'ordre est
 * désormais l'inverse — enregistrements d'abord, objets S3 en dernier, et
 * seulement si la session a bien été supprimée. Un objet orphelin ne coûte que
 * du stockage.
 */
export async function deleteSession(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 500));
    logger.info(SERVICE_NAME, 'Session deleted (stub)', { sessionId });
    return { ok: true };
  }
  // Real mode: enregistrements D'ABORD, S3 en DERNIER — voir l'en-tête ci-dessus.
  try {
    const appsync = await import('./appsync-client');

    // ── Garde : on ne supprime pas une version en ligne ou sous modération ──
    // Le bouton était offert quel que soit le statut. Supprimer une visite
    // publiée retirait son audio de S3 sous les pieds des touristes en cours
    // d'écoute, et une visite soumise disparaissait de la file du modérateur.
    const existing = await appsync.getStudioSessionById(sessionId);
    const status = (existing as { status?: string } | null)?.status;
    if (status && PROTECTED_FROM_DELETE.has(status)) {
      logger.warn(SERVICE_NAME, 'Delete refused for protected status', { sessionId, status });
      return {
        ok: false,
        error:
          'Cette version est en ligne ou en cours de modération. Archivez-la d’abord, puis supprimez-la.',
      };
    }

    const scenesResult = await appsync.listStudioScenesBySession(sessionId);

    // Les clés sont RELEVÉES maintenant mais supprimées à la toute fin : une
    // fois les enregistrements partis, plus rien ne les référence.
    const s3Keys: string[] = [];
    if (scenesResult.ok) {
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

      // Delete scene records
      for (const scene of scenesResult.data) {
        const delResult = await appsync.deleteStudioSceneMutation((scene as Record<string, unknown>).id as string);
        if (!delResult.ok) {
          logger.warn(SERVICE_NAME, 'Scene delete failed (continuing)', { sceneId: (scene as Record<string, unknown>).id, error: delResult.error });
        }
      }
    }

    const result = await appsync.deleteStudioSessionMutation(sessionId);
    if (!result.ok) {
      // La session existe toujours : ses fichiers doivent rester en place.
      logger.error(SERVICE_NAME, 'Session delete failed — S3 files left untouched', { sessionId, error: result.error });
      return { ok: false, error: result.error };
    }

    // ── S3 en dernier, au mieux ──
    for (const key of s3Keys) {
      try {
        await remove({ path: key });
      } catch (s3Err) {
        logger.warn(SERVICE_NAME, 'S3 file delete failed (best-effort)', { key, error: String(s3Err) });
      }
    }

    // ── Les achats de langue NE SONT PAS supprimés ──
    // Ce sont des paiements Stripe réellement encaissés, et leur seule trace
    // côté client. `TourLanguagePurchase.status` est en écriture admin-only :
    // le guide ne peut pas les marquer remboursés, il peut seulement les
    // détruire — ce que faisait ce code. On les laisse, et on le journalise.
    const { listLanguagePurchases } = await import('./language-purchase');
    const purchases = await listLanguagePurchases(sessionId);
    if (purchases.ok && purchases.value.length > 0) {
      logger.info(SERVICE_NAME, 'Language purchases preserved as payment record', {
        sessionId,
        count: purchases.value.length,
      });
    }

    logger.info(SERVICE_NAME, 'Session deleted (AppSync)', { sessionId, s3Keys: s3Keys.length });
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
  const validation = await validateVisitBeforeSubmission(sessionId);
  if (!validation.ok) return validation;
  const submittedSession = await getStudioSession(sessionId);
  const narrationMode = submittedSession?.narrationMode ?? undefined;
  const sourceLanguage = submittedSession?.language ?? 'fr';

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

    // Mirror the tour cover (StudioSession.coverPhotoKey — owner/admin-only) onto
    // GuideTour so the consumer app can display it. Non-fatal if it fails.
    let coverPhotoKey: string | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = appsync.getClient() as any;
      const sess = await client.models.StudioSession.get({ id: sessionId }, { authMode: 'userPool' });
      coverPhotoKey = (sess?.data?.coverPhotoKey as string | undefined) ?? undefined;
    } catch (e) {
      logger.warn(SERVICE_NAME, 'Could not read coverPhotoKey for tour mirror', { error: String(e) });
    }

    // C2 — the status transition goes through the guarded Lambda mutation (the
    // guide can no longer write GuideTour.status directly). The cover mirror is a
    // non-status field and stays a normal owner update below.
    const tourResult = await appsync.setTourWorkflowStatusMutation(tourId, 'review', sessionId);
    if (!tourResult.ok) {
      logger.error(SERVICE_NAME, 'Tour status transition failed, rolling back session', { tourId, error: tourResult.error });
      await appsync.updateStudioSessionMutation(sessionId, { status: 'editing' });
      return { ok: false, error: tourResult.error };
    }
    if (coverPhotoKey) {
      const coverResult = await appsync.updateGuideTourMutation(tourId, { coverPhotoKey });
      if (!coverResult.ok) {
        logger.warn(SERVICE_NAME, 'Cover mirror failed (non-fatal)', { tourId, error: coverResult.error });
      }
    }

    // Create or update ModerationItem so admin sees it in the moderation queue
    try {
      const tour = await appsync.getGuideTourById(tourId);
      if (tour) {
        const profile = await appsync.getGuideProfileById(tour.guideId, 'userPool');
        // Check if a ModerationItem already exists for this tour (avoid duplicates)
        const existingItems = await appsync.listModerationItems?.() ?? [];
        const existing = (existingItems as unknown as { id: string; tourId: string; status: string }[])
          .find((item) => item.tourId === tourId);

        if (existing) {
          // Update existing item (resubmission)
          const moderationResult = await appsync.updateModerationItemMutation(existing.id, {
            status: 'resubmitted',
            submissionDate: Date.now(),
            isResubmission: true,
            sessionId,
            poiCount: tour.poiCount ?? 0,
            duration: tour.duration ?? 0,
            distance: tour.distance ?? 0,
            narrationMode,
            sourceLanguage,
          });
          if (!moderationResult.ok) throw new Error(moderationResult.error);
          logger.info(SERVICE_NAME, 'ModerationItem updated (resubmission)', { id: existing.id });
        } else {
          // Create new item
          const moderationResult = await appsync.createModerationItemMutation({
            tourId,
            guideId: tour.guideId,
            guideName: profile?.displayName ?? 'Guide',
            tourTitle: tour.title,
            city: tour.city,
            submissionDate: Date.now(),
            sessionId,
            poiCount: tour.poiCount ?? 0,
            duration: tour.duration ?? 0,
            distance: tour.distance ?? 0,
            narrationMode,
            sourceLanguage,
          });
          if (!moderationResult.ok) throw new Error(moderationResult.error);
          logger.info(SERVICE_NAME, 'ModerationItem created', { tourId });
        }
      } else throw new Error('Visite introuvable pour la modération.');
    } catch (modErr) {
      logger.error(SERVICE_NAME, 'ModerationItem creation/update failed', { tourId, error: String(modErr) });
      await Promise.all([
        appsync.updateStudioSessionMutation(sessionId, {status: 'editing'}),
        appsync.setTourWorkflowStatusMutation(tourId, 'editing'),
      ]);
      return {ok: false, error: 'Création de la demande de modération impossible.'};
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

    // C2 — status transition via the guarded Lambda mutation (see submitForReview).
    const tourResult = await appsync.setTourWorkflowStatusMutation(tourId, 'editing');
    if (!tourResult.ok) {
      // Rollback session to previous status
      logger.error(SERVICE_NAME, 'Tour status transition failed, rolling back session', { tourId, error: tourResult.error });
      await appsync.updateStudioSessionMutation(sessionId, { status: 'submitted' });
      return { ok: false, error: tourResult.error };
    }

    // Remove or mark ModerationItem as retracted
    try {
      const appsyncMod = await import('./appsync-client');
      const existingItems = await appsyncMod.listModerationItems?.() ?? [];
      const existing = (existingItems as unknown as { id: string; tourId: string }[])
        .find((item) => item.tourId === tourId);
      if (existing) {
        // Delete the moderation item from the queue
        await appsyncMod.deleteModerationItemMutation?.(existing.id);
        logger.info(SERVICE_NAME, 'ModerationItem deleted on retraction', { id: existing.id });
      }
    } catch (modErr) {
      logger.warn(SERVICE_NAME, 'Failed to remove ModerationItem on retraction', { error: String(modErr) });
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
