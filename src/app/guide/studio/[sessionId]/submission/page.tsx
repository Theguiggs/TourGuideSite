'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StepNav } from '@/components/studio/wizard';
import { getStudioSession, getSessionStatusConfig, listStudioScenes, listSegmentsByScene, cloneSessionAsV2, listStudioSessions } from '@/lib/api/studio';
import { submitForReview, retractSubmission, updateSessionStatus } from '@/lib/api/studio-submission';
import { listLanguagePurchases, checkLanguageReadiness, submitLanguageForModeration, retractLanguageSubmission } from '@/lib/api/language-purchase';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { ReviewFeedbackPanel } from '@/components/studio/review-feedback-panel';
import { TourCommentThread } from '@/components/studio/tour-comment-thread';
import { Collapsible } from '@/components/ui/collapsible';
import { shouldUseStubs } from '@/config/api-mode';
import { useAuth } from '@/lib/auth/auth-context';
import type { StudioSession, StudioSessionStatus, TourLanguagePurchase, StudioScene, SceneSegment } from '@/types/studio';

const LANG_FLAGS: Record<string, string> = {
  fr: '\u{1F1EB}\u{1F1F7}', en: '\u{1F1EC}\u{1F1E7}', es: '\u{1F1EA}\u{1F1F8}', it: '\u{1F1EE}\u{1F1F9}', de: '\u{1F1E9}\u{1F1EA}', ja: '\u{1F1EF}\u{1F1F5}', zh: '\u{1F1E8}\u{1F1F3}', pt: '\u{1F1F5}\u{1F1F9}',
};

export default function PublicationPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.sessionId;
  const guideId = shouldUseStubs() ? 'guide-1' : user?.guideId ?? null;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [siblingVersions, setSiblingVersions] = useState<StudioSession[]>([]);
  const [purchases, setPurchases] = useState<TourLanguagePurchase[]>([]);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [segments, setSegments] = useState<SceneSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [langActioning, setLangActioning] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ label: string; warning: string; fn: () => Promise<{ ok: boolean; error?: string }> } | null>(null);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  const reload = useCallback(async () => {
    const sess = await getStudioSession(sessionId);
    if (sess) { setSession(sess); setActiveSession(sess); }
    const purchaseResult = await listLanguagePurchases(sessionId);
    if (purchaseResult.ok) setPurchases(purchaseResult.value.filter((p) => p.status === 'active'));
    // Reload siblings
    if (guideId) {
      const all = await listStudioSessions(guideId);
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
        const [sess, scns] = await Promise.all([getStudioSession(sessionId), listStudioScenes(sessionId)]);
        if (cancelled) return;
        setSession(sess);
        if (sess) setActiveSession(sess);
        const activeScenes = scns.filter((s) => !s.archived);
        setScenes(activeScenes);
        const purchaseResult = await listLanguagePurchases(sessionId);
        if (!cancelled && purchaseResult.ok) setPurchases(purchaseResult.value.filter((p) => p.status === 'active'));
        try {
          const segResults = await Promise.all(activeScenes.map((s) => listSegmentsByScene(s.id)));
          if (!cancelled) setSegments(segResults.flat());
        } catch { /* non-blocking */ }
        // Load sibling versions
        if (guideId && sess?.tourId) {
          const all = await listStudioSessions(guideId);
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

  if (isLoading) return <div className="p-6"><div className="bg-paper-soft rounded-lg h-64 animate-pulse" /></div>;
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
  const updateStatus = async (newStatus: StudioSessionStatus) => {
    const result = await updateSessionStatus(sessionId, newStatus);
    if (result.ok && session.tourId) {
      const { updateGuideTourMutation } = await import('@/lib/api/appsync-client');
      await updateGuideTourMutation(session.tourId, { status: newStatus });
    }
    return result;
  };

  // --- Status explanation ---
  const statusMessages: Record<string, string> = {
    draft: 'Votre parcours est en brouillon. Completez les informations puis soumettez-le pour validation.',
    editing: 'Parcours en cours de travail. Finalisez les scenes puis soumettez-le.',
    recording: 'Parcours en cours d\'enregistrement.',
    ready: 'Parcours pret. Soumettez-le pour moderation.',
    submitted: 'Parcours en attente de moderation. Vous pouvez retirer la publication pour modifier.',
    published: `Parcours publie et visible par les touristes (V${version}).`,
    paused: 'Parcours masque temporairement. Les touristes ne le voient plus. Vous pouvez le reprendre a tout moment sans remoderation.',
    revision_requested: 'La moderation a demande des modifications. Consultez le feedback ci-dessous, corrigez puis resoumettez.',
    rejected: 'Parcours refuse. Consultez le feedback ci-dessous.',
    archived: 'Parcours archive. Il n\'est plus visible et ne peut pas etre republier directement.',
  };

  return (
    <div className="p-4 max-w-4xl">

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-sm text-ink-80 mb-4">{confirmAction.warning}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 bg-paper-soft text-ink-80 font-medium py-2 rounded-lg hover:bg-paper-deep">Annuler</button>
              <button onClick={executeConfirm} className="flex-1 bg-danger text-white font-medium py-2 rounded-lg hover:opacity-90">{confirmAction.label}</button>
            </div>
          </div>
        </div>
      )}

      {/* === STATUS BAR (compact) === */}
      <div className="bg-white rounded-lg border border-line p-3 mb-3 flex items-center gap-3 flex-wrap">
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
        <span className="text-xs text-ink-40">V{version}</span>
        <span className="text-xs text-ink-80 flex-1 min-w-0">{statusMessages[session.status] ?? ''}</span>
      </div>

      {/* Inline alerts (only when relevant) */}
      {publishedSibling && !isPublished && (
        <div className="mb-3 p-2 bg-olive-soft border border-olive-soft rounded-lg text-xs text-success">
          V{publishedSibling.version ?? 1} est actuellement publiee.
          {(session.status === 'draft' || session.status === 'editing') && ' Quand cette version sera approuvee, elle remplacera V' + (publishedSibling.version ?? 1) + '.'}
        </div>
      )}
      {!hasAnyPublished && !['draft', 'editing', 'recording', 'ready', 'submitted'].includes(session.status) && (
        <div className="mb-3 p-2 bg-ocre-soft border border-ocre-soft rounded-lg text-xs text-ocre">
          Aucune version de ce parcours n&apos;est visible par les touristes.
        </div>
      )}

      {/* === ACTIONS CARD === */}
      <div className="bg-white rounded-lg border border-line p-3 mb-3">
        <h2 className="text-sm font-semibold text-ink mb-2">Actions</h2>

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
                <p className="text-sm font-medium text-mer">{hasRevisionFeedback ? 'Republier' : 'Publier'}</p>
                <p className="text-xs text-mer">Envoyer a la moderation pour publication</p>
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
                <p className="text-sm font-medium text-ocre">Retirer la publication</p>
                <p className="text-xs text-ocre">Revenir en brouillon pour modifier</p>
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
                <p className="text-sm font-medium text-ocre">Mettre en pause</p>
                <p className="text-xs text-ocre">Masquer temporairement du catalogue. Reprise sans remoderation.</p>
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
                <p className="text-sm font-medium text-success">Republier le parcours</p>
                <p className="text-xs text-success">Remettre le parcours visible dans le catalogue, sans remoderation</p>
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
              <span className="text-base shrink-0">&#x2728;</span>
              <div>
                <p className="text-sm font-medium text-grenadine">Creer V{version + 1}</p>
                <p className="text-xs text-grenadine">Nouvelle version a partir du contenu actuel. {isPublished ? 'V' + version + ' reste publiee pendant le travail.' : 'Rien ne sera visible tant que V' + (version + 1) + ' n\'est pas publiee.'}</p>
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
                <p className="text-sm font-medium text-ink-80">Archiver</p>
                <p className="text-xs text-ink-60">Retirer definitivement du catalogue</p>
              </div>
            </button>
          )}

          {/* --- DELETE DRAFT --- */}
          {session.status === 'draft' && (
            <button
              onClick={() => doWithConfirm(
                'Supprimer',
                'Supprimer definitivement ce brouillon et toutes ses scenes ? Cette action est irreversible.',
                async () => {
                  const appsync = await import('@/lib/api/appsync-client');
                  // Delete scenes first, then session, then tour if no other sessions reference it
                  for (const sc of scenes) {
                    await appsync.deleteItem('StudioScene', sc.id);
                  }
                  for (const p of purchases) {
                    await appsync.deleteItem('TourLanguagePurchase', p.id);
                  }
                  await appsync.deleteStudioSessionMutation(sessionId);
                  // Delete tour only if no sibling sessions remain
                  if (session.tourId && siblingVersions.length === 0) {
                    await appsync.deleteItem('GuideTour', session.tourId);
                  }
                  // Redirect to studio
                  router.push('/guide/studio');
                  return { ok: true };
                },
              )}
              disabled={isActioning}
              className="w-full flex items-center gap-2 p-2 rounded-lg border border-grenadine-soft hover:bg-grenadine-soft transition text-left disabled:opacity-50"
            >
              <span className="text-base shrink-0">&#x1F5D1;&#xFE0F;</span>
              <div>
                <p className="text-sm font-medium text-danger">Supprimer ce brouillon</p>
                <p className="text-xs text-danger">Supprime definitivement cette session et tout son contenu</p>
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
                <p className="text-sm font-medium text-ink-80">Revenir en brouillon</p>
                <p className="text-xs text-ink-60">Reprendre l&apos;edition depuis le debut</p>
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
                  <p className="text-sm font-medium text-grenadine">Remettre en brouillon</p>
                  <p className="text-xs text-grenadine">Reprendre le travail sur ce parcours. Il faudra le republier.</p>
                </div>
              </button>
              <button
                onClick={() => doAction('Parcours remis en pause.', () => updateStatus('paused'))}
                disabled={isActioning}
                className="w-full flex items-center gap-2 p-2 rounded-lg border border-ocre-soft bg-ocre-soft hover:opacity-90 transition text-left disabled:opacity-50"
              >
                <span className="text-base shrink-0">&#x23F8;&#xFE0F;</span>
                <div>
                  <p className="text-sm font-medium text-ocre">Desarchiver (en pause)</p>
                  <p className="text-xs text-ocre">Sortir des archives sans publier. Vous pourrez ensuite republier.</p>
                </div>
              </button>
            </>
          )}

        </div>

        {message && (
          <p className={`mt-3 text-sm ${message.success ? 'text-success' : 'text-danger'}`} role="status">{message.text}</p>
        )}
      </div>

      {/* === SIBLING VERSIONS (collapsible) === */}
      {siblingVersions.length > 0 && (
        <Collapsible
          storageKey={`submission-siblings-${sessionId}`}
          defaultOpen={false}
          icon={<span>📚</span>}
          title="Autres versions"
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
                  <span className="text-xs font-semibold text-ink-60 w-6">V{s.version ?? 1}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.color}`}>{sc.label}</span>
                  <span className="flex-1 text-sm text-ink-80 truncate">{s.title}</span>
                  <span className="text-xs text-ink-40">&rsaquo;</span>
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
            title="Journal d'échanges"
            subtitle="Messages avec la moderation"
            compact
          >
            <TourCommentThread tourId={session.tourId} role="guide" authorName="Guide" sessionId={sessionId} />
          </Collapsible>
        </div>
      )}

      {/* === LANGUAGE TABLE (collapsible — open by default if has purchases) === */}
      <Collapsible
        storageKey={`submission-langtable-${sessionId}`}
        defaultOpen={purchases.length > 0}
        icon={<span>🌍</span>}
        title="Langues"
        subtitle={purchases.length > 0 ? `${purchases.length + 1} langue${purchases.length > 0 ? 's' : ''} (FR + ${purchases.length})` : 'FR uniquement'}
        compact
        className="mb-3"
        testId="language-submissions-section"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-ink-60">Langue</th>
                <th className="text-left px-3 py-2 font-medium text-ink-60">Statut</th>
                <th className="text-center px-3 py-2 font-medium text-ink-60">Scenes</th>
                <th className="text-center px-3 py-2 font-medium text-ink-60">Audio</th>
                <th className="text-right px-3 py-2 font-medium text-ink-60">Mots</th>
                <th className="text-right px-3 py-2 font-medium text-ink-60"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {/* Base language */}
              {(() => {
                const baseLang = session.language || 'fr';
                const baseFlag = LANG_FLAGS[baseLang] ?? '';
                const ct = scenes.length;
                const audio = scenes.filter((s) => s.studioAudioKey).length;
                const words = scenes.reduce((sum, s) => sum + (s.transcriptText ?? '').split(/\s+/).filter(Boolean).length, 0);
                return (
                  <tr className="bg-paper-soft">
                    <td className="px-3 py-2 font-medium text-ink">{baseFlag} {baseLang.toUpperCase()} <span className="text-xs text-ink-40">(source)</span></td>
                    <td className="px-3 py-2"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span></td>
                    <td className="px-3 py-2 text-center text-ink-80">{ct}/{ct}</td>
                    <td className="px-3 py-2 text-center text-ink-80">{audio}/{ct}</td>
                    <td className="px-3 py-2 text-right text-ink-80">{words.toLocaleString()}</td>
                    <td className="px-3 py-2"></td>
                  </tr>
                );
              })()}

              {/* Purchased languages */}
              {purchases.map((purchase) => {
                const langFlag = LANG_FLAGS[purchase.language] ?? '';
                const langLabel = purchase.language.toUpperCase();
                const readiness = checkLanguageReadiness(scenes, segments, purchase.language);
                const langSegments = segments.filter((s) => s.language === purchase.language);
                const audioCount = langSegments.filter((s) => s.audioKey && !s.audioKey.startsWith('tts-')).length;
                const wordCount = langSegments.reduce((sum, s) => sum + (s.transcriptText ?? '').split(/\s+/).filter(Boolean).length, 0);
                const moderationBadge: Record<string, { label: string; className: string }> = {
                  draft: { label: 'Brouillon', className: 'bg-paper-soft text-ink-80' },
                  submitted: { label: 'Soumis', className: 'bg-ocre-soft text-ocre' },
                  approved: { label: 'Approuve', className: 'bg-olive-soft text-success' },
                  rejected: { label: 'Refuse', className: 'bg-grenadine-soft text-danger' },
                  revision_requested: { label: 'Revision', className: 'bg-ocre-soft text-ocre' },
                };
                const badge = moderationBadge[purchase.moderationStatus] ?? moderationBadge.draft;
                const canSubmitLang = purchase.moderationStatus === 'draft' || purchase.moderationStatus === 'revision_requested' || purchase.moderationStatus === 'rejected';

                return (
                  <tr key={purchase.id} data-testid={`lang-submission-${purchase.language}`}>
                    <td className="px-3 py-2 font-medium text-ink">{langFlag} {langLabel}</td>
                    <td className="px-3 py-2"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span></td>
                    <td className="px-3 py-2 text-center"><span className={readiness.ready ? 'text-success' : 'text-ocre'}>{readiness.complete}/{readiness.total}</span></td>
                    <td className="px-3 py-2 text-center"><span className={audioCount >= scenes.length ? 'text-success' : 'text-ocre'}>{audioCount}/{scenes.length}</span></td>
                    <td className="px-3 py-2 text-right text-ink-80">{wordCount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right space-x-1">
                      {canSubmitLang && readiness.ready && (
                        <button
                          data-testid={`submit-lang-${purchase.language}`}
                          onClick={() => doAction(`${langLabel} soumis !`, async () => {
                            setLangActioning(purchase.language);
                            const result = await submitLanguageForModeration(sessionId, purchase.language, scenes, segments);
                            setLangActioning(null);
                            return result.ok ? { ok: true } : { ok: false, error: result.error.message };
                          })}
                          disabled={isActioning || langActioning === purchase.language}
                          className="bg-mer hover:opacity-90 disabled:bg-ink-40 text-white text-xs font-medium py-1 px-2.5 rounded transition"
                        >
                          {langActioning === purchase.language ? '...' : 'Publier'}
                        </button>
                      )}
                      {canSubmitLang && !readiness.ready && <span className="text-xs text-ocre">Incomplet</span>}
                      {purchase.moderationStatus === 'submitted' && (
                        <button
                          data-testid={`retract-lang-${purchase.language}`}
                          onClick={() => doAction(`${langLabel} retire`, async () => {
                            setLangActioning(purchase.language);
                            const result = await retractLanguageSubmission(sessionId, purchase.language);
                            setLangActioning(null);
                            return result.ok ? { ok: true } : { ok: false, error: result.error.message };
                          })}
                          disabled={isActioning || langActioning === purchase.language}
                          className="bg-ocre hover:opacity-90 disabled:bg-ink-40 text-white text-xs font-medium py-1 px-2.5 rounded transition"
                        >
                          {langActioning === purchase.language ? '...' : 'Retirer'}
                        </button>
                      )}
                      {purchase.moderationStatus === 'approved' && (
                        <button
                          data-testid={`unpublish-lang-${purchase.language}`}
                          onClick={() => doAction(`${langLabel} depublie`, async () => {
                            setLangActioning(purchase.language);
                            const result = await retractLanguageSubmission(sessionId, purchase.language);
                            setLangActioning(null);
                            return result.ok ? { ok: true } : { ok: false, error: result.error.message };
                          })}
                          disabled={isActioning || langActioning === purchase.language}
                          className="bg-danger hover:opacity-90 disabled:bg-ink-40 text-white text-xs font-medium py-1 px-2.5 rounded transition"
                        >
                          {langActioning === purchase.language ? '...' : 'Depublier'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Collapsible>

      <StepNav
        prevHref={`/guide/studio/${sessionId}/preview`}
        prevLabel="Preview"
      />
    </div>
  );
}
