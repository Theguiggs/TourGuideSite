'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getModerationQueue, getModerationMetrics } from '@/lib/api/moderation';
import { listLanguagePurchases, updateModerationStatusByLang, refundLanguagePurchase } from '@/lib/api/language-purchase';
import type { ModerationStatusUpdate } from '@/lib/api/language-purchase';
import { LanguageModerationBadges } from '@/components/studio/language-moderation';
import { ModerationFeedbackForm } from '@/components/studio/language-moderation';
import { trackEvent, AdminAnalyticsEvents } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import type { ModerationItem, ModerationMetrics } from '@/types/moderation';
import type { TourLanguagePurchase } from '@/types/studio';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
  resubmitted: { label: 'Resoumis', className: 'bg-orange-100 text-orange-700' },
  in_review: { label: 'En revue', className: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approuve', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refuse', className: 'bg-red-100 text-red-700' },
};

const SERVICE_NAME = 'ModerationQueuePage';

export default function ModerationQueuePage() {
  const [queue, setQueue] = useState<ModerationItem[]>([]);
  const [metrics, setMetrics] = useState<ModerationMetrics | null>(null);
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [purchasesBySession, setPurchasesBySession] = useState<Record<string, TourLanguagePurchase[]>>({});
  const [feedbackTarget, setFeedbackTarget] = useState<{ sessionId: string; language: string } | null>(null);
  const [refundTarget, setRefundTarget] = useState<{ sessionId: string; purchase: TourLanguagePurchase } | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  useEffect(() => {
    Promise.all([getModerationQueue(), getModerationMetrics()]).then(
      ([q, m]) => {
        setQueue(q);
        setMetrics(m);

        // Load language purchases for each moderation item
        const sessionIds = [...new Set(q.map((item) => item.sessionId).filter(Boolean))];
        Promise.all(
          sessionIds.map(async (sid) => {
            const result = await listLanguagePurchases(sid);
            return { sessionId: sid, purchases: result.ok ? result.value : [] };
          }),
        ).then((results) => {
          const map: Record<string, TourLanguagePurchase[]> = {};
          for (const r of results) {
            map[r.sessionId] = r.purchases;
          }
          setPurchasesBySession(map);
        });
      },
    );
    trackEvent(AdminAnalyticsEvents.ADMIN_MODERATION_QUEUE_VIEW);
  }, []);

  const handleLanguageAction = async (
    sessionId: string,
    language: string,
    status: ModerationStatusUpdate,
    feedback?: Record<string, string>,
  ) => {
    setActionProcessing(true);
    const result = await updateModerationStatusByLang(sessionId, language, status, feedback);
    if (result.ok) {
      // Refresh purchases for this session
      const refreshed = await listLanguagePurchases(sessionId);
      if (refreshed.ok) {
        setPurchasesBySession((prev) => ({ ...prev, [sessionId]: refreshed.value }));
      }
      setFeedbackTarget(null);
      logger.info(SERVICE_NAME, 'Language moderation updated', { sessionId, language, status });
    } else {
      logger.error(SERVICE_NAME, 'Language moderation update failed', { sessionId, language, error: result.error.message });
    }
    setActionProcessing(false);
  };

  const handleApproveLanguage = (sessionId: string, language: string) => {
    handleLanguageAction(sessionId, language, 'approved');
  };

  const handleRejectLanguage = (sessionId: string, language: string) => {
    setFeedbackTarget({ sessionId, language });
  };

  const handleRefundConfirm = async () => {
    if (!refundTarget) return;
    setActionProcessing(true);
    const result = await refundLanguagePurchase(refundTarget.purchase.id);
    if (result.ok) {
      const refreshed = await listLanguagePurchases(refundTarget.sessionId);
      if (refreshed.ok) {
        setPurchasesBySession((prev) => ({ ...prev, [refundTarget.sessionId]: refreshed.value }));
      }
      logger.info(SERVICE_NAME, 'Language refunded', {
        sessionId: refundTarget.sessionId,
        language: refundTarget.purchase.language,
        purchaseId: refundTarget.purchase.id,
      });
    } else {
      logger.error(SERVICE_NAME, 'Language refund failed', {
        purchaseId: refundTarget.purchase.id,
        error: result.error.message,
      });
    }
    setRefundTarget(null);
    setActionProcessing(false);
  };

  const cities = [...new Set(queue.map((item) => item.city))];

  const filteredQueue = queue.filter((item) => {
    if (filterCity && item.city !== filterCity) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">File d&apos;attente de moderation</h1>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-3xl font-bold text-red-600">{metrics.pendingCount}</p>
            <p className="text-sm text-gray-500">En attente</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-3xl font-bold text-gray-900">{metrics.avgReviewTimeMinutes} min</p>
            <p className="text-sm text-gray-500">Temps moyen de revue</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-3xl font-bold text-green-600">{metrics.approvalRate}%</p>
            <p className="text-sm text-gray-500">Taux d&apos;approbation</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-3xl font-bold text-gray-900">{metrics.reviewedThisMonth}</p>
            <p className="text-sm text-gray-500">Revues ce mois</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
        >
          <option value="">Toutes les villes</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="resubmitted">Resoumis</option>
        </select>

        {(filterCity || filterStatus) && (
          <button
            onClick={() => { setFilterCity(''); setFilterStatus(''); }}
            className="text-sm text-red-600 hover:underline px-2"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* Queue Table */}
      {filteredQueue.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 text-lg">Aucun parcours en attente de moderation.</p>
          <p className="text-gray-400 text-sm mt-1">Les nouvelles soumissions apparaitront ici.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Guide</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Parcours</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Langues</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden sm:table-cell">Ville</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">Soumis le</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Statut</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredQueue.map((item) => {
                const badge = STATUS_BADGES[item.status] || STATUS_BADGES.pending;
                return (
                  <tr key={item.id} data-testid={`moderation-item-${item.id}`} className={item.isResubmission ? 'bg-orange-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                          {item.guideName.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-900 truncate max-w-[120px]">{item.guideName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{item.tourTitle}</p>
                        {item.isResubmission && (
                          <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">Re-soumis</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{item.poiCount ?? '—'} POIs &middot; {item.duration ?? '—'} min</p>
                    </td>
                    <td className="px-4 py-3">
                      <LanguageModerationBadges
                        purchases={purchasesBySession[item.sessionId] ?? []}
                        onLanguageClick={(lang) => handleRejectLanguage(item.sessionId, lang)}
                      />
                      {/* Per-language action buttons for submitted languages */}
                      {(purchasesBySession[item.sessionId] ?? [])
                        .filter((p) => p.moderationStatus === 'submitted')
                        .map((p) => (
                          <div key={p.id} className="flex gap-1 mt-1" data-testid={`lang-actions-${p.language}`}>
                            <button
                              onClick={() => handleApproveLanguage(item.sessionId, p.language)}
                              disabled={actionProcessing}
                              className="text-[10px] bg-green-100 text-green-700 hover:bg-green-200 px-1.5 py-0.5 rounded"
                              data-testid={`approve-lang-${p.language}`}
                            >
                              Approuver {p.language.toUpperCase()}
                            </button>
                            <button
                              onClick={() => handleRejectLanguage(item.sessionId, p.language)}
                              disabled={actionProcessing}
                              className="text-[10px] bg-red-100 text-red-700 hover:bg-red-200 px-1.5 py-0.5 rounded"
                              data-testid={`reject-lang-${p.language}`}
                            >
                              Rejeter {p.language.toUpperCase()}
                            </button>
                          </div>
                        ))}
                      {/* Per-language refund buttons for active purchases */}
                      {(purchasesBySession[item.sessionId] ?? [])
                        .filter((p) => p.status === 'active')
                        .map((p) => (
                          <div key={`refund-${p.id}`} className="mt-1" data-testid={`refund-action-${p.language}`}>
                            <button
                              onClick={() => setRefundTarget({ sessionId: item.sessionId, purchase: p })}
                              disabled={actionProcessing}
                              className="text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-200 px-1.5 py-0.5 rounded"
                              data-testid={`refund-lang-${p.language}`}
                            >
                              Rembourser {p.language.toUpperCase()}
                            </button>
                          </div>
                        ))}
                      {/* Refunded label for already refunded purchases */}
                      {(purchasesBySession[item.sessionId] ?? [])
                        .filter((p) => p.status === 'refunded')
                        .map((p) => (
                          <div key={`refunded-${p.id}`} className="mt-1" data-testid={`refunded-label-${p.language}`}>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              Rembourse {p.language.toUpperCase()}
                            </span>
                          </div>
                        ))}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-gray-600">{item.city}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-500">
                      {new Date(item.submissionDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <Link
                        href={`/admin/moderation/${item.id}?tab=tourist`}
                        className="text-sm font-medium text-teal-600 hover:text-teal-800"
                        data-testid={`preview-btn-${item.id}`}
                      >
                        Voir le contenu
                      </Link>
                      <Link
                        href={`/admin/moderation/${item.id}`}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Examiner
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Refund confirmation modal */}
      {refundTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" data-testid="refund-confirm-overlay">
          <div className="max-w-sm w-full mx-4 bg-white rounded-xl shadow-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Confirmer le remboursement</h3>
            <p className="text-sm text-gray-600">
              Rembourser {(refundTarget.purchase.amountCents / 100).toFixed(2)}&euro; pour la langue{' '}
              <strong>{refundTarget.purchase.language.toUpperCase()}</strong> ?
            </p>
            <p className="text-xs text-gray-400">
              Les segments traduits seront conserves mais la langue sera marquee comme non disponible.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRefundTarget(null)}
                disabled={actionProcessing}
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded border border-gray-300"
                data-testid="refund-cancel-btn"
              >
                Annuler
              </button>
              <button
                onClick={handleRefundConfirm}
                disabled={actionProcessing}
                className="text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium px-4 py-1.5 rounded transition-colors"
                data-testid="refund-confirm-btn"
              >
                {actionProcessing ? 'Traitement...' : 'Confirmer le remboursement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback form overlay for rejection/revision */}
      {feedbackTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" data-testid="feedback-overlay">
          <div className="max-w-lg w-full mx-4">
            <ModerationFeedbackForm
              language={feedbackTarget.language}
              scenes={[
                { id: 'scene-1', title: 'Scene 1', index: 0 },
                { id: 'scene-2', title: 'Scene 2', index: 1 },
              ]}
              onSubmit={async (status, feedback) => {
                await handleLanguageAction(
                  feedbackTarget.sessionId,
                  feedbackTarget.language,
                  status,
                  feedback,
                );
              }}
              onCancel={() => setFeedbackTarget(null)}
              isProcessing={actionProcessing}
            />
          </div>
        </div>
      )}
    </div>
  );
}
