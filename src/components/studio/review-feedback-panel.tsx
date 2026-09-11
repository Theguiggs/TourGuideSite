'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { useStudioLocale } from '@/lib/i18n/studio-locale';
import { sessionStatusLabel } from '@/lib/studio/status-labels';

const SERVICE_NAME = 'ReviewFeedbackPanel';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  note: string;
}

interface AdminComment {
  id: string;
  comment: string;
  date: string;
  reviewerName: string;
  sceneId?: string;
}

interface ReviewData {
  status: string;
  feedbackJson: string | null;
  checklistJson: string | null;
  reviewDate: number | null;
  adminComments: AdminComment[];
}

export interface ReviewFeedbackPanelProps {
  tourId: string;
  sessionId: string;
  sessionStatus: string;
  /** Scènes actives, pour nommer « Corriger la scène N ». */
  scenes?: ReadonlyArray<{ id: string; title: string | null; order?: number }>;
  /** Branché : affiche « Resoumettre » ; absent : le texte renvoie aux actions. */
  onResubmit?: () => void;
  resubmitDisabled?: boolean;
}

const CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
  audio_quality: { fr: 'Qualité audio', en: 'Audio quality' },
  content_accuracy: { fr: 'Contenu inexact', en: 'Inaccurate content' },
  inappropriate: { fr: 'Contenu inapproprié', en: 'Inappropriate content' },
  gps_issues: { fr: 'Problèmes GPS', en: 'GPS issues' },
  translation: { fr: 'Traduction', en: 'Translation' },
};

/**
 * Le retour de modération, côté guide (lot 6.1).
 *
 * Avant : lu par `listModerationItems()` intégral filtré côté client, rendu
 * SOUS les actions, avec deux libellés différents pour le même état et un
 * appel à corriger qui n'était qu'une phrase. Ici : requête par visite, un
 * seul libellé (celui de la session), un bouton par scène signalée, et
 * « Resoumettre » sous la main.
 */
export function ReviewFeedbackPanel({ tourId, sessionId, sessionStatus, scenes = [], onResubmit, resubmitDisabled = false }: ReviewFeedbackPanelProps) {
  const { t, locale } = useStudioLocale();
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const showPanel = ['revision_requested', 'rejected'].includes(sessionStatus);

  useEffect(() => {
    if (!showPanel || shouldUseStubs()) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const appsync = await import('@/lib/api/appsync-client');
        const items = await appsync.listModerationItemsByTour(tourId);
        const item = [...items].sort((a, b) => (b.reviewDate ?? b.submissionDate ?? 0) - (a.reviewDate ?? a.submissionDate ?? 0))[0];
        if (!item || cancelled) {
          setIsLoading(false);
          return;
        }

        const tour = await appsync.getGuideTourById(tourId);
        let adminComments: AdminComment[] = [];
        if (tour) {
          try { adminComments = JSON.parse((tour as { adminComments?: string | null }).adminComments ?? '[]'); } catch { /* empty */ }
        }

        if (!cancelled) {
          setReviewData({
            status: item.status ?? '',
            feedbackJson: item.feedbackJson ?? null,
            checklistJson: item.checklistJson ?? null,
            reviewDate: item.reviewDate ?? null,
            adminComments,
          });
        }
      } catch (e) {
        logger.error(SERVICE_NAME, 'Failed to load review data', { tourId, error: String(e) });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tourId, showPanel]);

  if (!showPanel) return null;
  if (isLoading) return <div className="bg-ocre-soft border border-ocre-soft rounded-lg p-4 animate-pulse h-24" role="status" aria-busy="true" />;

  const isRejected = sessionStatus === 'rejected';
  const headline = sessionStatusLabel(sessionStatus, locale);
  const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';

  let feedback: { feedback?: string; action?: string; category?: string; poiIds?: string[]; notes?: string } = {};
  try { feedback = JSON.parse(reviewData?.feedbackJson ?? '{}'); } catch { /* empty */ }
  let checklist: Record<string, ChecklistItem> = {};
  try { checklist = JSON.parse(reviewData?.checklistJson ?? '{}'); } catch { /* empty */ }
  const checklistItems = Object.values(checklist);

  // Scènes signalées : par identifiant (poiIds, commentaires) — nommées par leur numéro.
  const byId = new Map(scenes.map((s, i) => [s.id, { title: s.title, number: (s.order ?? i) + 1 }]));
  const flaggedIds = Array.from(new Set([
    ...(feedback.poiIds ?? []),
    ...(reviewData?.adminComments ?? []).map((c) => c.sceneId).filter((id): id is string => Boolean(id)),
  ])).filter((id) => byId.has(id));

  return (
    <section
      className="mb-3 bg-card border border-ocre rounded-lg overflow-hidden"
      role="region"
      aria-labelledby="review-feedback-title"
      data-testid="review-feedback-panel"
    >
      <div className={`px-4 py-3 flex items-center justify-between gap-3 ${isRejected ? 'bg-grenadine-soft' : 'bg-ocre-soft'}`}>
        <h2 id="review-feedback-title" className={`text-body font-semibold ${isRejected ? 'text-danger' : 'text-ocre-ink'}`}>
          {headline} · {t('retour de la modération', 'review feedback')}
        </h2>
        {reviewData?.reviewDate && (
          <p className="text-meta text-ink-60">
            {new Date(reviewData.reviewDate).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {!reviewData && (
          <p className="text-body text-ink-80">
            {t('Le détail du retour n’est pas disponible. Consultez le journal d’échanges ci-dessous, corrigez, puis resoumettez.',
               'The review details are not available. Check the review history below, fix, then resubmit.')}
          </p>
        )}

        {feedback.feedback && (
          <div>
            <p className="text-body font-medium text-ink-80 mb-1">{t('Commentaire du modérateur', 'Reviewer’s comment')}</p>
            <p className="text-body text-ink bg-paper-soft rounded-lg p-3 border border-line">{feedback.feedback}</p>
          </div>
        )}

        {feedback.category && (
          <span className="inline-block text-meta font-medium text-danger bg-grenadine-soft px-2.5 py-1 rounded-pill">
            {CATEGORY_LABELS[feedback.category] ? (locale === 'en' ? CATEGORY_LABELS[feedback.category].en : CATEGORY_LABELS[feedback.category].fr) : t('Autre', 'Other')}
          </span>
        )}

        {flaggedIds.length > 0 && (
          <div>
            <p className="text-body font-medium text-ink-80 mb-2">{t('Scènes signalées', 'Flagged scenes')}</p>
            <ul className="flex flex-wrap gap-2">
              {flaggedIds.map((id) => {
                const scene = byId.get(id)!;
                return (
                  <li key={id}>
                    <Link
                      href={`/guide/studio/${sessionId}/scenes`}
                      data-testid={`fix-scene-${id}`}
                      className="inline-block rounded-pill border border-ocre bg-card px-3 py-1 text-meta font-medium text-ocre-ink hover:bg-paper"
                    >
                      {t(`Corriger la scène ${scene.number}`, `Fix scene ${scene.number}`)}{scene.title ? ` · ${scene.title}` : ''}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {checklistItems.length > 0 && (
          <div>
            <p className="text-body font-medium text-ink-80 mb-2">{t('Grille de validation', 'Validation grid')}</p>
            <div className="space-y-1">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-body">
                  <span className={`mt-0.5 ${item.checked ? 'text-success' : 'text-danger'}`} aria-hidden="true">{item.checked ? '✓' : '✗'}</span>
                  <div className="flex-1">
                    <span className={item.checked ? 'text-ink-80' : 'text-danger font-medium'}>{item.label}</span>
                    {item.note && <p className="text-meta text-ink-60 mt-0.5">{item.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {feedback.notes && (
          <div>
            <p className="text-body font-medium text-ink-80 mb-1">{t('Notes complémentaires', 'Additional notes')}</p>
            <p className="text-body text-ink-80 italic">{feedback.notes}</p>
          </div>
        )}

        {(reviewData?.adminComments.length ?? 0) > 0 && (
          <div>
            <p className="text-body font-medium text-ink-80 mb-2">{t('Commentaires', 'Comments')} ({reviewData!.adminComments.length})</p>
            <div className="space-y-2">
              {[...reviewData!.adminComments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((c) => (
                <div key={c.id} className="text-body bg-paper-soft rounded-lg p-2.5 border border-line">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-ink">{c.reviewerName}</span>
                    <span className="text-meta text-ink-40">{new Date(c.date).toLocaleDateString(dateLocale)}</span>
                    {c.sceneId && byId.get(c.sceneId) && (
                      <span className="text-meta text-mer bg-mer-soft px-1.5 py-0.5 rounded">{t(`Scène ${byId.get(c.sceneId)!.number}`, `Scene ${byId.get(c.sceneId)!.number}`)}</span>
                    )}
                  </div>
                  <p className="text-ink-80">{c.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-line flex items-center justify-between gap-3 flex-wrap">
          <p className="text-body text-ink-80">
            {t('Corrigez les points signalés, puis resoumettez la visite à la modération.', 'Fix the flagged items, then resubmit the tour for review.')}
          </p>
          {onResubmit && (
            <button
              type="button"
              onClick={onResubmit}
              disabled={resubmitDisabled}
              data-testid="resubmit-btn"
              className="rounded-pill bg-grenadine px-4 py-2 text-body font-semibold text-paper hover:opacity-90 disabled:opacity-50"
            >
              {t('Resoumettre à la modération', 'Resubmit for review')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
