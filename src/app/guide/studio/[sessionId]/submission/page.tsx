'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StepNav } from '@/components/studio/wizard';
import { getStudioSession, getSessionStatusConfig, listStudioScenes, cloneSessionAsV2, listStudioSessions } from '@/lib/api/studio';
import { withPublishedStatus } from '@/lib/studio/published-status';
import { submitForReview, retractSubmission, updateSessionStatus, deleteSession } from '@/lib/api/studio-submission';
import { logger } from '@/lib/logger';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { ReviewFeedbackPanel } from '@/components/studio/review-feedback-panel';
import { TourCommentThread } from '@/components/studio/tour-comment-thread';
import { Collapsible } from '@/components/ui/collapsible';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { shouldUseStubs } from '@/config/api-mode';
import { useAuth } from '@/lib/auth/auth-context';
import type { StudioSession, StudioSessionStatus, StudioScene } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'SubmissionPage';

export default function PublicationPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useStudioLocale();
  const sessionId = params.sessionId;
  const guideId = shouldUseStubs() ? 'guide-1' : user?.guideId ?? null;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [siblingVersions, setSiblingVersions] = useState<StudioSession[]>([]);
  // `scenes` n'est plus lu depuis que la suppression passe par `deleteSession`,
  // mais il reste CHARGÉ : le setter alimente le compteur de scènes actives que
  // la page affiche, et le retirer casserait ce chargement.
  const [, setScenes] = useState<StudioScene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ label: string; warning: string; fn: () => Promise<{ ok: boolean; error?: string }> } | null>(null);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  const reload = useCallback(async () => {
    const raw = await getStudioSession(sessionId);
    // Reconcile with GuideTour (source of truth for publication) — a session can
    // lag at 'submitted' after an admin approval. See withPublishedStatus.
    const sess = raw ? (await withPublishedStatus([raw]))[0] : raw;
    if (sess) { setSession(sess); setActiveSession(sess); }
    // Reload siblings
    if (guideId) {
      const all = await withPublishedStatus(await listStudioSessions(guideId));
      if (sess?.tourId) {
        setSiblingVersions(all.filter((s) => s.tourId === sess.tourId && s.id !== sess.id));
      }
    }
  }, [sessionId, setActiveSession, guideId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    async function load() {
      try {
        const [rawSess, scns] = await Promise.all([getStudioSession(sessionId), listStudioScenes(sessionId)]);
        if (cancelled) return;
        // Reconcile with GuideTour (source of truth for publication) — a session
        // can lag at 'submitted' after an admin approval. See withPublishedStatus.
        const sess = rawSess ? (await withPublishedStatus([rawSess]))[0] : rawSess;
        setSession(sess);
        if (sess) setActiveSession(sess);
        const activeScenes = scns.filter((s) => !s.archived);
        setScenes(activeScenes);
        // Load sibling versions
        if (guideId && sess?.tourId) {
          const all = await withPublishedStatus(await listStudioSessions(guideId));
          if (!cancelled) setSiblingVersions(all.filter((s) => s.tourId === sess.tourId && s.id !== sess.id));
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setIsLoading(false); }
    }
    load();
    return () => { cancelled = true; clearSession(); };
  }, [sessionId, setActiveSession, clearSession, guideId]);

  const doAction = useCallback(async (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setIsActioning(true);
    setMessage(null);
    try {
      const result = await fn();
      if (result.ok) { setMessage({ text: label, success: true }); await reload(); }
      else { setMessage({ text: result.error ?? 'Erreur', success: false }); }
    } catch { setMessage({ text: 'Erreur inattendue.', success: false }); }
    finally { setIsActioning(false); }
  }, [reload]);

  const doWithConfirm = useCallback((label: string, warning: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setConfirmAction({ label, warning, fn });
  }, []);

  const executeConfirm = useCallback(async () => {
    if (!confirmAction) return;
    setConfirmAction(null);
    await doAction(confirmAction.label, confirmAction.fn);
  }, [confirmAction, doAction]);

  if (isLoading) return <div className="p-6" role="status" aria-busy="true" aria-label={t('Chargement', 'Loading')}><div className="bg-paper-soft rounded-lg h-64 animate-pulse" /></div>;
  if (!session) return <div className="p-6"><div className="bg-grenadine-soft border border-grenadine-soft rounded-lg p-4 text-danger">Session introuvable.</div></div>;

  const statusConfig = getSessionStatusConfig(session.status);
  const version = session.version ?? 1;
  const hasRevisionFeedback = session.status === 'revision_requested' || session.status === 'rejected';

  // Derived state
  const canSubmit = ['draft', 'editing', 'recording', 'ready', 'revision_requested', 'rejected'].includes(session.status);
  const canRetract = session.status === 'submitted';
  const isPublished = session.status === 'published';
  const isPaused = session.status === 'paused';
  const isArchived = session.status === 'archived';

  // Sibling checks
  const publishedSibling = siblingVersions.find((s) => s.status === 'published');
  const hasAnyPublished = isPublished || !!publishedSibling;

  // Transition helpers
  /**
   * Aligne la StudioSession ET la GuideTour sur le même statut.
   *
   * Le résultat de l'écriture sur la Visite n'était PAS vérifié. Quand le
   * backend la refusait, la session passait malgré tout — « Suspendu » côté
   * Studio, visite toujours au catalogue : le guide croyait l'avoir retirée.
   * Un échec ramène désormais la session à son statut d'origine, pour que les
   * deux faces disent la même chose.
   */
  const updateStatus = async (newStatus: StudioSessionStatus) => {
    const previousStatus = session.status;
    const result = await updateSessionStatus(sessionId, newStatus);
    if (!result.ok || !session.tourId) return result;

    const { updateGuideTourMutation } = await import('@/lib/api/appsync-client');
    const tourResult = await updateGuideTourMutation(session.tourId, { status: newStatus });
    if (!tourResult.ok) {
      logger.error(SERVICE_NAME, 'Tour status write refused — rolling back session', {
        tourId: session.tourId,
        newStatus,
        error: tourResult.error,
      });
      // Retour en arrière, au mieux : si même ce retour échoue, l'écart
      // subsiste mais il est au moins journalisé et annoncé au guide.
      const rollback = await updateSessionStatus(sessionId, previousStatus);
      if (!rollback.ok) {
        logger.error(SERVICE_NAME, 'Session rollback failed — statuses now diverge', {
          sessionId,
          previousStatus,
          newStatus,
        });
      }
      return {
        ok: false as const,
        error: `La visite n’a pas changé d’état : ${tourResult.error}`,
      };
    }
    return result;
  };

  // --- Status explanation ---
  const statusMessages: Record<string, string> = {
    draft: t('Votre visite est en brouillon. Complétez les informations puis soumettez-la pour validation.', 'Your tour is a draft. Complete the information, then submit it for review.'),
    editing: t('Parcours en cours de travail. Finalisez les scènes puis soumettez-le.', 'Tour in progress. Complete the scenes, then submit it.'),
    recording: t("Parcours en cours d'enregistrement.", 'Tour recording in progress.'),
    ready: t('Parcours prêt. Soumettez-le pour modération.', 'Tour ready. Submit it for review.'),
    submitted: t('Parcours en attente de modération. Vous pouvez retirer la publication pour modifier.', 'Tour waiting for review. You can withdraw it to make changes.'),
    published: t(`Parcours publié et visible par les touristes (V${version}).`, `Tour published and visible to visitors (V${version}).`),
    paused: t('Parcours masqué temporairement. Vous pouvez le reprendre sans nouvelle modération.', 'Tour temporarily hidden. You can resume it without another review.'),
    revision_requested: t('La modération demande des modifications. Consultez le retour, corrigez puis soumettez à nouveau.', 'Changes were requested. Review the feedback, make corrections and resubmit.'),
    rejected: t('Parcours refusé. Consultez le retour ci-dessous.', 'Tour rejected. Review the feedback below.'),
    archived: t("Parcours archivé. Il n'est plus visible et ne peut pas être republié directement.", 'Tour archived. It is no longer visible and cannot be republished directly.'),
  };
  const translatedStatusLabel = ({
    Brouillon: t('Brouillon', 'Draft'),
    'En édition': t('En édition', 'Editing'),
    Enregistrement: t('Enregistrement', 'Recording'),
    Prêt: t('Prêt', 'Ready'),
    Soumis: t('Soumis', 'Submitted'),
    Publié: t('Publié', 'Published'),
    Suspendu: t('Suspendu', 'Paused'),
    'Révision demandée': t('Révision demandée', 'Changes requested'),
    Refusé: t('Refusé', 'Rejected'),
    Archivé: t('Archivé', 'Archived'),
  } as Record<string, string>)[statusConfig.label] ?? statusConfig.label;

  return (
    <div className="p-4 max-w-4xl">

      {/* Confirm dialog */}
      {confirmAction && (
        <ConfirmDialog
          open
          danger
          title={confirmAction.label}
          description={confirmAction.warning}
          confirmLabel={confirmAction.label}
          cancelLabel={t('Annuler', 'Cancel')}
          onConfirm={executeConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* === STATUS BAR (compact) === */}
      <div className="bg-card rounded-lg border border-line p-3 mb-3 flex items-center gap-3 flex-wrap">
        <span className={`inline-flex px-2.5 py-0.5 rounded-pill text-meta font-medium ${statusConfig.color}`}>{translatedStatusLabel}</span>
        <span className="text-meta text-ink-40">V{version}</span>
        <span className={`inline-flex px-2 py-0.5 rounded-pill text-meta font-medium ${
          session.narrationMode === 'recording'
            ? 'bg-mer-soft text-mer'
            : session.narrationMode === 'tts_on_demand'
              ? 'bg-olive-soft text-olive'
              : 'bg-grenadine-soft text-danger'
        }`} data-testid="submission-narration-mode">
          {session.narrationMode === 'recording'
            ? 'Voix humaine'
            : session.narrationMode === 'tts_on_demand'
              ? 'TTS à la demande'
              : 'Mode à choisir'}
        </span>
        <span className="text-meta text-ink-80 flex-1 min-w-0">{statusMessages[session.status] ?? ''}</span>
      </div>

      {/* Inline alerts (only when relevant) */}
      {publishedSibling && !isPublished && (
        <div className="mb-3 p-2 bg-olive-soft border border-olive-soft rounded-lg text-meta text-success">
          V{publishedSibling.version ?? 1} est actuellement publiee.
          {(session.status === 'draft' || session.status === 'editing') && ' Quand cette version sera approuvee, elle remplacera V' + (publishedSibling.version ?? 1) + '.'}
        </div>
      )}
      {!hasAnyPublished && !['draft', 'editing', 'recording', 'ready', 'submitted'].includes(session.status) && (
        <div className="mb-3 p-2 bg-ocre-soft border border-ocre-soft rounded-lg text-meta text-ocre-ink">
          Aucune version de ce parcours n&apos;est visible par les touristes.
        </div>
      )}

      {/* === ACTIONS CARD === */}
      <div className="bg-card rounded-lg border border-line p-3 mb-3">
        <h2 className="text-body font-semibold text-ink mb-2">{t('Actions', 'Actions')}</h2>

        <div className="grid gap-1.5">

          {/* --- SUBMIT / RESUBMIT --- */}
          {canSubmit && session.tourId && (
            <button
              onClick={() => doAction(
                hasRevisionFeedback ? 'Parcours resoumis !' : 'Parcours soumis en revue !',
                () => submitForReview(sessionId, session.tourId!),
              )}
              disabled={isActioning}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-mer-soft bg-mer-soft hover:opacity-90 transition text-left disabled:opacity-50"
            >
              <span className="text-base shrink-0">&#x1F4E4;</span>
              <div>
                <p className="text-body font-medium text-mer">{hasRevisionFeedback ? t('Republier', 'Republish') : t('Publier', 'Publish')}</p>
                <p className="text-meta text-mer">{t('Envoyer à la modération pour publication', 'Send for review and publication')}</p>
              </div>
            </button>
          )}

          {/* --- RETRACT --- */}
          {canRetract && session.tourId && (
            <button
              onClick={() => doAction('Publication retiree.', () => retractSubmission(sessionId, session.tourId!))}
              disabled={isActioning}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-ocre-soft bg-ocre-soft hover:bg-ocre-soft transition text-left disabled:opacity-50"
            >
              <span className="text-base shrink-0">&#x21A9;</span>
              <div>
                <p className="text-body font-medium text-ocre-ink">Retirer la publication</p>
                <p className="text-meta text-ocre-ink">Revenir en brouillon pour modifier</p>
              </div>
            </button>
          )}

          {/* --- PAUSE (from published only) --- */}
          {isPublished && (
            <button
              onClick={() => doAction('Parcours mis en pause.', () => updateStatus('paused'))}
              disabled={isActioning}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-ocre-soft bg-ocre-soft hover:opacity-90 transition text-left disabled:opacity-50"
            >
              <span className="text-base shrink-0">&#x23F8;&#xFE0F;</span>
              <div>
                <p className="text-body font-medium text-ocre-ink">Mettre en pause</p>
                <p className="text-meta text-ocre-ink">Masquer temporairement du catalogue. Reprise sans nouvelle modération.</p>
              </div>
            </button>
          )}

          {/* --- RESUME (from paused only) --- */}
          {isPaused && (
            <button
              onClick={() => doAction('Parcours republier !', () => updateStatus('published'))}
              disabled={isActioning}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-olive-soft bg-olive-soft hover:opacity-90 transition text-left disabled:opacity-50"
            >
              <span className="text-base shrink-0">&#x25B6;&#xFE0F;</span>
              <div>
                <p className="text-body font-medium text-success">Republier le parcours</p>
                <p className="text-meta text-success">Remettre la visite visible dans le catalogue, sans nouvelle modération</p>
              </div>
            </button>
          )}

          {/* --- CREATE V2 (from published or paused) --- */}
          {(isPublished || isPaused) && (
            <button
              onClick={async () => {
                setIsActioning(true);
                setMessage(null);
                const result = await cloneSessionAsV2(sessionId);
                if (result.ok) {
                  setMessage({ text: `V${result.version} creee ! Redirection...`, success: true });
                  setTimeout(() => router.push(`/guide/studio/${result.sessionId}/scenes`), 1500);
                } else {
                  setMessage({ text: result.error, success: false });
                }
                setIsActioning(false);
              }}
              disabled={isActioning}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-grenadine-soft bg-grenadine-soft hover:opacity-90 transition text-left disabled:opacity-50"
            >
              <span className="text-base shrink-0">&#x270F;&#xFE0F;</span>
              <div>
                <p className="text-body font-medium text-grenadine">
                  {t('Mettre à jour la visite', 'Update the tour')} ({t('nouvelle version', 'new version')} V{version + 1})
                </p>
                <p className="text-meta text-grenadine">
                  Crée un brouillon V{version + 1} à partir du contenu source actuel. Éditez puis re-soumettez. {isPublished ? 'V' + version + ' reste publiée pendant le travail.' : 'Rien n\'est visible tant que V' + (version + 1) + ' n\'est pas publiée.'}
                </p>
              </div>
            </button>
          )}

          {/* --- ARCHIVE (from published, paused, or working states) --- */}
          {(isPublished || isPaused) && (
            <button
              onClick={() => {
                const warning = hasAnyPublished && !publishedSibling
                  ? 'Ce parcours est actuellement visible. L\'archiver le rendra invisible pour les touristes. Confirmer ?'
                  : 'Archiver ce parcours ? Il ne sera plus visible.';
                doWithConfirm('Archiver', warning, () => updateStatus('archived'));
              }}
              disabled={isActioning}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-line hover:bg-paper-soft transition text-left disabled:opacity-50"
            >
              <span className="text-base shrink-0">&#x1F4E6;</span>
              <div>
                <p className="text-body font-medium text-ink-80">Archiver</p>
                <p className="text-meta text-ink-60">Retirer du catalogue — réversible</p>
              </div>
            </button>
          )}

          {/* --- DELETE DRAFT --- */}
          {session.status === 'draft' && (
            <button
              onClick={() => doWithConfirm(
                'Supprimer',
                'Supprimer définitivement ce brouillon et toutes ses scènes ? Cette action est irréversible.',
                async () => {
                  // Chemin unique de suppression : `deleteSession` porte la
                  // garde de statut, le bon ordre (enregistrements puis S3) et
                  // la préservation des achats de langue. Cette page refaisait
                  // le travail à la main, sans vérifier le moindre résultat :
                  // des scènes orphelines et une session à moitié supprimée
                  // passaient pour un succès.
                  const result = await deleteSession(sessionId);
                  if (!result.ok) return result;

                  // La Visite n'est supprimée que si AUCUNE autre version ne s'y
                  // rattache — et la liste est RELUE à l'instant, car une V2
                  // créée dans un autre onglet rendrait périmée celle du rendu.
                  if (session.tourId) {
                    const appsync = await import('@/lib/api/appsync-client');
                    const all = await listStudioSessions(session.guideId);
                    const remaining = all.filter((s) => s.tourId === session.tourId && s.id !== sessionId);
                    if (remaining.length === 0) {
                      // `deleteItem` lève au lieu de rendre un résultat. L'échec
                      // n'est pas fatal : la session est déjà supprimée, seule
                      // une Visite vide subsiste.
                      try {
                        await appsync.deleteItem('GuideTour', session.tourId);
                      } catch (e) {
                        logger.warn(SERVICE_NAME, 'Tour delete failed after session delete', {
                          tourId: session.tourId,
                          error: String(e),
                        });
                      }
                    } else {
                      logger.info(SERVICE_NAME, 'Tour kept — other versions still reference it', {
                        tourId: session.tourId,
                        remaining: remaining.length,
                      });
                    }
                  }

                  // Redirection SEULEMENT après un succès complet.
                  router.push('/guide/studio');
                  return { ok: true };
                },
              )}
              disabled={isActioning}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-grenadine-soft hover:bg-grenadine-soft transition text-left disabled:opacity-50"
            >
              <span className="text-base shrink-0">&#x1F5D1;&#xFE0F;</span>
              <div>
                <p className="text-body font-medium text-danger">{t('Supprimer ce brouillon', 'Delete this draft')}</p>
                <p className="text-meta text-danger">Supprime définitivement cette session et tout son contenu</p>
              </div>
            </button>
          )}

          {/* --- BACK TO DRAFT (from working states, not submitted) --- */}
          {['editing', 'recording', 'ready'].includes(session.status) && (
            <button
              onClick={() => doAction('Revenu en brouillon.', () => updateStatus('draft'))}
              disabled={isActioning}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-line hover:bg-paper-soft transition text-left disabled:opacity-50"
            >
              <span className="text-base shrink-0">&#x1F4DD;</span>
              <div>
                <p className="text-body font-medium text-ink-80">Revenir en brouillon</p>
                <p className="text-meta text-ink-60">Reprendre l&apos;edition depuis le debut</p>
              </div>
            </button>
          )}

          {/* --- ARCHIVED STATE: reactivate --- */}
          {isArchived && (
            <>
              <button
                onClick={() => doAction('Parcours remis en brouillon.', () => updateStatus('draft'))}
                disabled={isActioning}
                className="w-full flex items-center gap-2 p-2 rounded-lg border border-grenadine-soft bg-grenadine-soft hover:opacity-90 transition text-left disabled:opacity-50"
              >
                <span className="text-base shrink-0">&#x1F4DD;</span>
                <div>
                  <p className="text-body font-medium text-grenadine">Remettre en brouillon</p>
                  <p className="text-meta text-grenadine">Reprendre le travail sur ce parcours. Il faudra le republier.</p>
                </div>
              </button>
              <button
                onClick={() => doAction('Parcours remis en pause.', () => updateStatus('paused'))}
                disabled={isActioning}
                className="w-full flex items-center gap-2 p-2 rounded-lg border border-ocre-soft bg-ocre-soft hover:opacity-90 transition text-left disabled:opacity-50"
              >
                <span className="text-base shrink-0">&#x23F8;&#xFE0F;</span>
                <div>
                  <p className="text-body font-medium text-ocre-ink">Désarchiver (en pause)</p>
                  <p className="text-meta text-ocre-ink">Sortir des archives sans publier. Vous pourrez ensuite republier.</p>
                </div>
              </button>
            </>
          )}

        </div>

        {message && (
          <p className={`mt-3 text-body ${message.success ? 'text-success' : 'text-danger'}`} role="status">{message.text}</p>
        )}
      </div>

      {/* === SIBLING VERSIONS (collapsible) === */}
      {siblingVersions.length > 0 && (
        <Collapsible
          storageKey={`submission-siblings-${sessionId}`}
          defaultOpen={false}
          icon={<span>📚</span>}
          title={t('Autres versions', 'Other versions')}
          subtitle={`${siblingVersions.length} version${siblingVersions.length > 1 ? 's' : ''}`}
          compact
          className="mb-3"
        >
          <div className="space-y-1">
            {siblingVersions.map((s) => {
              const sc = getSessionStatusConfig(s.status);
              return (
                <button
                  key={s.id}
                  onClick={() => router.push(`/guide/studio/${s.id}/submission`)}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-paper-soft transition text-left"
                >
                  <span className="text-meta font-semibold text-ink-60 w-6">V{s.version ?? 1}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-pill text-eyebrow font-medium ${sc.color}`}>{sc.label}</span>
                  <span className="flex-1 text-body text-ink-80 truncate">{s.title}</span>
                  <span className="text-meta text-ink-40">&rsaquo;</span>
                </button>
              );
            })}
          </div>
        </Collapsible>
      )}

      {/* === FEEDBACK (kept inline, shows only when relevant) === */}
      {session.tourId && (
        <ReviewFeedbackPanel tourId={session.tourId} sessionStatus={session.status} />
      )}

      {/* === COMMENT THREAD (collapsible) === */}
      {session.tourId && (
        <div className="mb-3">
          <Collapsible
            storageKey={`submission-comments-${sessionId}`}
            defaultOpen={false}
            icon={<span>💬</span>}
            title={t("Journal d'échanges", 'Review history')}
            subtitle="Messages avec la moderation"
            compact
          >
            <TourCommentThread tourId={session.tourId} role="guide" authorName="Guide" sessionId={sessionId} />
          </Collapsible>
        </div>
      )}

      <StepNav
        prevHref={`/guide/studio/${sessionId}/preview`}
        prevLabel="Preview"
      />
    </div>
  );
}
