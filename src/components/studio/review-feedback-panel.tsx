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
        const item = items.find((i) => (i as Record<string, unknown>).tourId === tourId);
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
  if (isLoading) return <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 animate-pulse h-24" />;
  if (!reviewData) {
    return (
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg" role="alert">
        <p className="font-medium text-amber-800">
          {sessionStatus === 'rejected' ? 'Tour rejeté' : 'Révision demandée'}
        </p>
        <p className="text-sm text-amber-700">
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
    <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl overflow-hidden" role="alert" data-testid="review-feedback-panel">
      {/* Header */}
      <div className={`px-4 py-3 ${isRejected ? 'bg-red-100' : 'bg-amber-100'}`}>
        <div className="flex items-center justify-between">
          <p className={`font-semibold ${isRejected ? 'text-red-800' : 'text-amber-800'}`}>
            {isRejected ? 'Tour rejeté par la modération' : 'Révision demandée par la modération'}
          </p>
          {reviewData.reviewDate && (
            <p className="text-xs text-amber-600">
              {new Date(reviewData.reviewDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main feedback */}
        {feedback.feedback && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Commentaire du modérateur</p>
            <p className="text-sm text-gray-800 bg-white rounded-lg p-3 border border-amber-200">
              {feedback.feedback}
            </p>
          </div>
        )}

        {/* Rejection category */}
        {feedback.category && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
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
            <p className="text-sm font-medium text-gray-700 mb-2">Grille de validation</p>
            <div className="space-y-1">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 ${item.checked ? 'text-green-600' : 'text-red-500'}`}>
                    {item.checked ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <span className={item.checked ? 'text-gray-600' : 'text-red-700 font-medium'}>
                      {item.label}
                    </span>
                    {item.note && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
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
            <p className="text-sm font-medium text-gray-700 mb-1">Notes complémentaires</p>
            <p className="text-sm text-gray-600 italic">{feedback.notes}</p>
          </div>
        )}

        {/* Admin comments */}
        {reviewData.adminComments.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Commentaires ({reviewData.adminComments.length})
            </p>
            <div className="space-y-2">
              {reviewData.adminComments.map((c) => (
                <div key={c.id} className="text-sm bg-white rounded-lg p-2.5 border border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">{c.reviewerName}</span>
                    <span className="text-xs text-gray-400">{new Date(c.date).toLocaleDateString('fr-FR')}</span>
                    {c.sceneId && <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Scène</span>}
                  </div>
                  <p className="text-gray-600">{c.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call to action */}
        <p className="text-sm text-amber-700 pt-2 border-t border-amber-200">
          Corrigez les points signalés ci-dessus, puis resoumettez votre tour.
        </p>
      </div>
    </div>
  );
}
