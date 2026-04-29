'use client';

import { useState, useEffect } from 'react';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

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

interface ReviewFeedbackPanelProps {
  tourId: string;
  sessionStatus: string;
}

export function ReviewFeedbackPanel({ tourId, sessionStatus }: ReviewFeedbackPanelProps) {
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
        // Find ModerationItem for this tour
        const items = await appsync.listModerationItems();
        // Find the most recent ModerationItem for this tour (by reviewDate or createdAt)
        const matching = items
          .filter((i) => (i as Record<string, unknown>).tourId === tourId)
          .sort((a, b) => {
            const aDate = (a as Record<string, unknown>).reviewDate as number ?? (a as Record<string, unknown>).submissionDate as number ?? 0;
            const bDate = (b as Record<string, unknown>).reviewDate as number ?? (b as Record<string, unknown>).submissionDate as number ?? 0;
            return bDate - aDate;
          });
        const item = matching[0];
        if (!item || cancelled) {
          setIsLoading(false);
          return;
        }
        const raw = item as Record<string, unknown>;

        // Load admin comments from GuideTour
        const tour = await appsync.getGuideTourById(tourId);
        let adminComments: AdminComment[] = [];
        if (tour) {
          const t = tour as Record<string, unknown>;
          try { adminComments = JSON.parse((t.adminComments as string) ?? '[]'); } catch { /* empty */ }
        }

        if (!cancelled) {
          setReviewData({
            status: (raw.status as string) ?? '',
            feedbackJson: (raw.feedbackJson as string) ?? null,
            checklistJson: (raw.checklistJson as string) ?? null,
            reviewDate: (raw.reviewDate as number) ?? null,
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
  if (isLoading) return <div className="bg-ocre-soft border border-ocre-soft rounded-lg p-4 animate-pulse h-24" />;
  if (!reviewData) {
    return (
      <div className="mb-6 p-4 bg-ocre-soft border border-ocre-soft rounded-lg" role="alert">
        <p className="font-medium text-ocre">
          {sessionStatus === 'rejected' ? 'Tour rejeté' : 'Révision demandée'}
        </p>
        <p className="text-sm text-ocre">
          Consultez le feedback par scène ci-dessous, corrigez les problèmes, puis resoumettez.
        </p>
      </div>
    );
  }

  // Parse feedback
  let feedback: { feedback?: string; action?: string; category?: string; poiIds?: string[]; notes?: string } = {};
  try { feedback = JSON.parse(reviewData.feedbackJson ?? '{}'); } catch { /* empty */ }

  // Parse checklist
  let checklist: Record<string, ChecklistItem> = {};
  try { checklist = JSON.parse(reviewData.checklistJson ?? '{}'); } catch { /* empty */ }
  const checklistItems = Object.values(checklist);
  const hasChecklist = checklistItems.length > 0;

  const isRejected = sessionStatus === 'rejected';

  return (
    <div className="mb-6 bg-ocre-soft border border-ocre-soft rounded-xl overflow-hidden" role="alert" data-testid="review-feedback-panel">
      {/* Header */}
      <div className={`px-4 py-3 ${isRejected ? 'bg-grenadine-soft' : 'bg-ocre-soft'}`}>
        <div className="flex items-center justify-between">
          <p className={`font-semibold ${isRejected ? 'text-danger' : 'text-ocre'}`}>
            {isRejected ? 'Tour rejeté par la modération' : 'Révision demandée par la modération'}
          </p>
          {reviewData.reviewDate && (
            <p className="text-xs text-ocre">
              {new Date(reviewData.reviewDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main feedback */}
        {feedback.feedback && (
          <div>
            <p className="text-sm font-medium text-ink-80 mb-1">Commentaire du modérateur</p>
            <p className="text-sm text-ink bg-white rounded-lg p-3 border border-ocre-soft">
              {feedback.feedback}
            </p>
          </div>
        )}

        {/* Rejection category */}
        {feedback.category && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-danger bg-grenadine-soft px-2.5 py-1 rounded-full">
              {feedback.category === 'audio_quality' ? 'Qualité audio' :
               feedback.category === 'content_accuracy' ? 'Contenu inexact' :
               feedback.category === 'inappropriate' ? 'Contenu inapproprié' :
               feedback.category === 'gps_issues' ? 'Problèmes GPS' :
               feedback.category === 'translation' ? 'Traduction' : 'Autre'}
            </span>
          </div>
        )}

        {/* Checklist results */}
        {hasChecklist && (
          <div>
            <p className="text-sm font-medium text-ink-80 mb-2">Grille de validation</p>
            <div className="space-y-1">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 ${item.checked ? 'text-success' : 'text-danger'}`}>
                    {item.checked ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <span className={item.checked ? 'text-ink-80' : 'text-danger font-medium'}>
                      {item.label}
                    </span>
                    {item.note && (
                      <p className="text-xs text-ink-60 mt-0.5">{item.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall notes */}
        {feedback.notes && (
          <div>
            <p className="text-sm font-medium text-ink-80 mb-1">Notes complémentaires</p>
            <p className="text-sm text-ink-80 italic">{feedback.notes}</p>
          </div>
        )}

        {/* Admin comments */}
        {reviewData.adminComments.length > 0 && (
          <div>
            <p className="text-sm font-medium text-ink-80 mb-2">
              Commentaires ({reviewData.adminComments.length})
            </p>
            <div className="space-y-2">
              {[...reviewData.adminComments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((c) => (
                <div key={c.id} className="text-sm bg-white rounded-lg p-2.5 border border-line">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-ink">{c.reviewerName}</span>
                    <span className="text-xs text-ink-40">{new Date(c.date).toLocaleDateString('fr-FR')}</span>
                    {c.sceneId && <span className="text-xs text-mer bg-mer-soft px-1.5 py-0.5 rounded">Scène</span>}
                  </div>
                  <p className="text-ink-80">{c.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call to action */}
        <p className="text-sm text-ocre pt-2 border-t border-ocre-soft">
          Corrigez les points signalés ci-dessus, puis resoumettez votre tour.
        </p>
      </div>
    </div>
  );
}
