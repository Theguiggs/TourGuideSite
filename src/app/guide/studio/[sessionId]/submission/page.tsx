'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getStudioSession, getSessionStatusConfig, listStudioScenes, listSegmentsByScene, cloneSessionAsV2 } from '@/lib/api/studio';
import { submitForReview, retractSubmission, updateSessionStatus } from '@/lib/api/studio-submission';
import { listLanguagePurchases, checkLanguageReadiness, submitLanguageForModeration, retractLanguageSubmission } from '@/lib/api/language-purchase';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { ReviewFeedbackPanel } from '@/components/studio/review-feedback-panel';
import { TourCommentThread } from '@/components/studio/tour-comment-thread';
import { LANGUAGE_CONFIG } from '@/components/studio/language-checkout/language-checkbox-card';
import type { StudioSession, TourLanguagePurchase, StudioScene, SceneSegment } from '@/types/studio';

const SERVICE_NAME = 'SubmissionPage';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪', ja: '🇯🇵', zh: '🇨🇳', pt: '🇵🇹',
};

export default function SubmissionPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [purchases, setPurchases] = useState<TourLanguagePurchase[]>([]);
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [segments, setSegments] = useState<SceneSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [langActioning, setLangActioning] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  const reload = useCallback(async () => {
    const sess = await getStudioSession(sessionId);
    if (sess) { setSession(sess); setActiveSession(sess); }
    // Reload language purchases
    const purchaseResult = await listLanguagePurchases(sessionId);
    if (purchaseResult.ok) setPurchases(purchaseResult.value.filter((p) => p.status === 'active'));
  }, [sessionId, setActiveSession]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    async function load() {
      try {
        const [sess, scns] = await Promise.all([
          getStudioSession(sessionId),
          listStudioScenes(sessionId),
        ]);
        if (!cancelled) {
          setSession(sess);
          if (sess) setActiveSession(sess);
          const activeScenes = scns.filter((s) => !s.archived);
          setScenes(activeScenes);
          // Load purchases
          const purchaseResult = await listLanguagePurchases(sessionId);
          if (!cancelled && purchaseResult.ok) {
            setPurchases(purchaseResult.value.filter((p) => p.status === 'active'));
          }
          // Load segments for readiness checks
          try {
            const segResults = await Promise.all(activeScenes.map((s) => listSegmentsByScene(s.id)));
            if (!cancelled) setSegments(segResults.flat());
          } catch {
            // Non-blocking
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; clearSession(); };
  }, [sessionId, setActiveSession, clearSession]);

  const doAction = useCallback(async (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setIsActioning(true);
    setMessage(null);
    try {
      const result = await fn();
      if (result.ok) {
        setMessage({ text: label, success: true });
        await reload();
      } else {
        setMessage({ text: result.error ?? 'Erreur', success: false });
      }
    } catch (e) {
      setMessage({ text: 'Erreur inattendue.', success: false });
    } finally {
      setIsActioning(false);
    }
  }, [reload]);

  if (isLoading) {
    return <div className="p-6"><div className="bg-gray-100 rounded-lg h-64 animate-pulse" /></div>;
  }

  if (!session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 text-sm mb-4 inline-block">&larr; Retour</Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Session introuvable.</div>
      </div>
    );
  }

  const statusConfig = getSessionStatusConfig(session.status);
  const hasRevisionFeedback = session.status === 'revision_requested' || session.status === 'rejected';
  const canSubmit = ['draft', 'editing', 'recording', 'ready', 'revision_requested', 'rejected'].includes(session.status);
  const canRetract = session.status === 'submitted';
  const isPublished = session.status === 'published';
  const isArchived = session.status === 'archived';
  const canSuspend = ['draft', 'editing', 'recording', 'ready', 'revision_requested', 'rejected'].includes(session.status);
  const canArchive = isPublished;

  return (
    <div className="p-6 max-w-3xl">
      <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 text-sm mb-4 inline-block">&larr; Retour au tour</Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Soumission</h1>
      <p className="text-sm text-gray-500 mb-6">Gérez la soumission et le statut de votre parcours.</p>

      {/* Current status */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-medium text-gray-700">Statut actuel :</span>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Status-specific messages */}
        {session.status === 'draft' && (
          <p className="text-sm text-gray-500">Votre parcours est en brouillon. Complétez les informations puis soumettez-le pour validation.</p>
        )}
        {(session.status === 'editing' || session.status === 'recording') && (
          <p className="text-sm text-gray-500">Votre parcours est en cours de travail. Finalisez les scènes puis soumettez-le.</p>
        )}
        {session.status === 'submitted' && (
          <p className="text-sm text-blue-600">Votre parcours a été soumis et est en attente de modération. Vous pouvez retirer la soumission si vous souhaitez effectuer des modifications.</p>
        )}
        {session.status === 'revision_requested' && (
          <p className="text-sm text-amber-700">La modération a demandé des modifications. Consultez le feedback ci-dessous, effectuez les corrections, puis resoumettez.</p>
        )}
        {session.status === 'rejected' && (
          <p className="text-sm text-red-600">Votre parcours a été refusé. Consultez le feedback ci-dessous pour comprendre les raisons.</p>
        )}
        {isPublished && (
          <p className="text-sm text-green-600">Votre parcours est publié et visible par les touristes. Vous pouvez l&apos;archiver si nécessaire.</p>
        )}
        {isArchived && (
          <p className="text-sm text-gray-500">Votre parcours est archivé et n&apos;est plus visible par les touristes.</p>
        )}
      </div>

      {/* Review feedback panel — legacy (shown when rejected/revision) */}
      {session.tourId && (
        <ReviewFeedbackPanel tourId={session.tourId} sessionStatus={session.status} />
      )}

      {/* Comment thread — always visible */}
      {session.tourId && (
        <div className="mb-6">
          <TourCommentThread tourId={session.tourId} role="guide" authorName="Guide" sessionId={sessionId} />
        </div>
      )}

      {/* Language summary table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6" data-testid="language-submissions-section">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Langues</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Langue</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Version</th>
                <th className="text-left px-3 py-2 font-medium text-gray-500">Statut</th>
                <th className="text-center px-3 py-2 font-medium text-gray-500">Scenes</th>
                <th className="text-center px-3 py-2 font-medium text-gray-500">Audio</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Mots</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Cout</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Soumis le</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Base language row */}
              {(() => {
                const baseLang = session.language || 'fr';
                const baseFlag = LANG_FLAGS[baseLang] ?? '';
                const baseSceneCount = scenes.length;
                const baseAudioCount = scenes.filter((s) => s.studioAudioKey).length;
                const baseWordCount = scenes.reduce((sum, s) => sum + (s.transcriptText ?? '').split(/\s+/).filter(Boolean).length, 0);
                const version = (session as unknown as Record<string, unknown>).version as number ?? 1;
                return (
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-900">
                      {baseFlag} {baseLang.toUpperCase()} <span className="text-xs text-gray-400">(source)</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">V{version}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{baseSceneCount}/{baseSceneCount}</td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{baseAudioCount}/{baseSceneCount}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{baseWordCount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400">—</td>
                    <td className="px-3 py-2.5 text-right text-gray-400">—</td>
                    <td className="px-3 py-2.5"></td>
                  </tr>
                );
              })()}

              {/* Purchased language rows */}
              {purchases.map((purchase) => {
                const langConfig = LANGUAGE_CONFIG.find((c) => c.code === purchase.language);
                const langFlag = LANG_FLAGS[purchase.language] ?? '';
                const langLabel = purchase.language.toUpperCase();
                const readiness = checkLanguageReadiness(scenes, segments, purchase.language);
                const langSegments = segments.filter((s) => s.language === purchase.language);
                const audioCount = langSegments.filter((s) => s.audioKey && !s.audioKey.startsWith('tts-')).length;
                const wordCount = langSegments.reduce((sum, s) => sum + (s.transcriptText ?? '').split(/\s+/).filter(Boolean).length, 0);
                const cost = purchase.amountCents > 0 ? `${(purchase.amountCents / 100).toFixed(2)}€` : 'Gratuit';
                const submittedDate = purchase.moderationStatus === 'submitted' || purchase.moderationStatus === 'approved'
                  ? new Date(purchase.updatedAt).toLocaleDateString('fr-FR')
                  : '—';
                const version = (session as unknown as Record<string, unknown>).version as number ?? 1;

                const moderationBadge: Record<string, { label: string; className: string }> = {
                  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
                  submitted: { label: 'Soumis', className: 'bg-yellow-100 text-yellow-700' },
                  approved: { label: 'Approuve', className: 'bg-green-100 text-green-700' },
                  rejected: { label: 'Refuse', className: 'bg-red-100 text-red-700' },
                  revision_requested: { label: 'Revision', className: 'bg-orange-100 text-orange-700' },
                };
                const badge = moderationBadge[purchase.moderationStatus] ?? moderationBadge.draft;
                const canSubmitLang = purchase.moderationStatus === 'draft' || purchase.moderationStatus === 'revision_requested' || purchase.moderationStatus === 'rejected';

                return (
                  <tr key={purchase.id} data-testid={`lang-submission-${purchase.language}`}>
                    <td className="px-3 py-2.5 font-medium text-gray-900">{langFlag} {langLabel}</td>
                    <td className="px-3 py-2.5 text-gray-700">V{version}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={readiness.ready ? 'text-green-700' : 'text-amber-600'}>
                        {readiness.complete}/{readiness.total}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={audioCount >= scenes.length ? 'text-green-700' : 'text-amber-600'}>
                        {audioCount}/{scenes.length}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{wordCount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{cost}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{submittedDate}</td>
                    <td className="px-3 py-2.5 text-right space-x-1">
                      {/* Soumettre — when draft/revision/rejected + ready */}
                      {canSubmitLang && readiness.ready && (
                        <button
                          onClick={() => doAction(
                            `${langLabel} soumis !`,
                            async () => {
                              setLangActioning(purchase.language);
                              const result = await submitLanguageForModeration(sessionId, purchase.language, scenes, segments);
                              setLangActioning(null);
                              if (result.ok) return { ok: true };
                              return { ok: false, error: result.error.message };
                            },
                          )}
                          disabled={isActioning || langActioning === purchase.language}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-xs font-medium py-1 px-2.5 rounded transition-colors"
                          data-testid={`submit-lang-${purchase.language}`}
                        >
                          {langActioning === purchase.language ? '...' : 'Soumettre'}
                        </button>
                      )}
                      {canSubmitLang && !readiness.ready && (
                        <span className="text-xs text-amber-600">Incomplet</span>
                      )}
                      {/* Retirer — when submitted (retract from moderation queue) */}
                      {purchase.moderationStatus === 'submitted' && (
                        <button
                          onClick={() => doAction(
                            `Soumission ${langLabel} retirée`,
                            async () => {
                              setLangActioning(purchase.language);
                              const result = await retractLanguageSubmission(sessionId, purchase.language);
                              setLangActioning(null);
                              return result.ok ? { ok: true } : { ok: false, error: result.error.message };
                            },
                          )}
                          disabled={isActioning || langActioning === purchase.language}
                          className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-400 text-white text-xs font-medium py-1 px-2.5 rounded transition-colors"
                          data-testid={`retract-lang-${purchase.language}`}
                        >
                          {langActioning === purchase.language ? '...' : 'Retirer'}
                        </button>
                      )}
                      {/* Dépublier — when approved (unpublish this language) */}
                      {purchase.moderationStatus === 'approved' && (
                        <button
                          onClick={() => doAction(
                            `${langLabel} dépublié`,
                            async () => {
                              setLangActioning(purchase.language);
                              const result = await retractLanguageSubmission(sessionId, purchase.language);
                              setLangActioning(null);
                              return result.ok ? { ok: true } : { ok: false, error: result.error.message };
                            },
                          )}
                          disabled={isActioning || langActioning === purchase.language}
                          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white text-xs font-medium py-1 px-2.5 rounded transition-colors"
                          data-testid={`unpublish-lang-${purchase.language}`}
                        >
                          {langActioning === purchase.language ? '...' : 'Dépublier'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">

          {/* Submit / Resubmit */}
          {canSubmit && session.tourId && (
            <button
              onClick={() => doAction(
                hasRevisionFeedback ? 'Parcours resoumis !' : 'Parcours soumis en revue !',
                () => submitForReview(sessionId, session.tourId!),
              )}
              disabled={isActioning}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
            >
              {isActioning ? 'En cours...' : hasRevisionFeedback ? '📤 Resoumettre en revue' : '📋 Soumettre en revue'}
            </button>
          )}

          {/* Retract */}
          {canRetract && session.tourId && (
            <button
              onClick={() => doAction('Soumission retirée.', () => retractSubmission(sessionId, session.tourId!))}
              disabled={isActioning}
              className="border border-orange-500 text-orange-700 hover:bg-orange-50 disabled:opacity-50 font-medium py-2.5 px-6 rounded-lg transition-colors"
            >
              {isActioning ? 'En cours...' : '↩ Retirer la soumission'}
            </button>
          )}

          {/* Suspend */}
          {canSuspend && (
            <button
              onClick={() => doAction('Parcours suspendu.', async () => {
                const result = await updateSessionStatus(sessionId, 'draft');
                if (result.ok && session.tourId) {
                  const { updateGuideTourMutation } = await import('@/lib/api/appsync-client');
                  await updateGuideTourMutation(session.tourId, { status: 'draft' });
                }
                return result;
              })}
              disabled={isActioning}
              className="border border-gray-400 text-gray-600 hover:bg-gray-50 disabled:opacity-50 font-medium py-2.5 px-5 rounded-lg transition-colors text-sm"
            >
              ⏸ Suspendre (brouillon)
            </button>
          )}

          {/* Archive */}
          {canArchive && (
            <button
              onClick={() => doAction('Parcours archivé.', async () => {
                const result = await updateSessionStatus(sessionId, 'archived');
                if (result.ok && session.tourId) {
                  const { updateGuideTourMutation } = await import('@/lib/api/appsync-client');
                  await updateGuideTourMutation(session.tourId, { status: 'archived' });
                }
                return result;
              })}
              disabled={isActioning}
              className="border border-amber-500 text-amber-700 hover:bg-amber-50 disabled:opacity-50 font-medium py-2.5 px-5 rounded-lg transition-colors text-sm"
            >
              📦 Archiver
            </button>
          )}

          {/* Published — create V2 */}
          {isPublished && (
            <>
              <span className="text-sm text-green-600 font-medium self-center">✅ Parcours publié (V{(session as unknown as Record<string, unknown>).version as number ?? 1})</span>
              <button
                onClick={async () => {
                  setIsActioning(true);
                  setMessage(null);
                  const result = await cloneSessionAsV2(sessionId);
                  if (result.ok) {
                    setMessage({ text: `V${result.version} créée ! Redirection...`, success: true });
                    setTimeout(() => router.push(`/guide/studio/${result.sessionId}/scenes`), 1500);
                  } else {
                    setMessage({ text: result.error, success: false });
                  }
                  setIsActioning(false);
                }}
                disabled={isActioning}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
              >
                ✨ Créer V{((session as unknown as Record<string, unknown>).version as number ?? 1) + 1}
              </button>
            </>
          )}

          {/* Archived — no actions */}
          {isArchived && (
            <span className="text-sm text-gray-500 self-center">📦 Parcours archivé</span>
          )}
        </div>

        {message && (
          <p className={`mt-3 text-sm ${message.success ? 'text-green-600' : 'text-red-600'}`} role="status">
            {message.text}
          </p>
        )}
      </div>

      {/* Quick links to edit */}
      {(hasRevisionFeedback || canSubmit) && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Modifier votre parcours</h2>
          <div className="flex flex-wrap gap-2">
            <Link href={`/guide/studio/${sessionId}/general`} className="text-sm text-teal-600 hover:text-teal-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg">📋 Général</Link>
            <Link href={`/guide/studio/${sessionId}/itinerary`} className="text-sm text-teal-600 hover:text-teal-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg">🗺️ Itinéraire</Link>
            <Link href={`/guide/studio/${sessionId}/scenes`} className="text-sm text-teal-600 hover:text-teal-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg">🎬 Scènes</Link>
            <Link href={`/guide/studio/${sessionId}/preview`} className="text-sm text-teal-600 hover:text-teal-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg">👁 Preview</Link>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
        <Link href={`/guide/studio/${sessionId}/preview`} className="text-sm text-gray-500 hover:text-teal-600">
          ← Preview
        </Link>
      </div>
    </div>
  );
}
