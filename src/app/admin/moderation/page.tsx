'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getModerationMetrics, getLanguageModerationQueue } from '@/lib/api/moderation';
import { updateModerationStatusByLang } from '@/lib/api/language-purchase';
import type { ModerationStatusUpdate } from '@/lib/api/language-purchase';
import { ModerationFeedbackForm } from '@/components/studio/language-moderation';
import { trackEvent, AdminAnalyticsEvents } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import type { LanguageModerationItem, ModerationMetrics } from '@/types/moderation';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
  resubmitted: { label: 'Resoumis', className: 'bg-orange-100 text-orange-700' },
  in_review: { label: 'En revue', className: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approuve', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refuse', className: 'bg-red-100 text-red-700' },
};

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪',
};

const SERVICE_NAME = 'ModerationQueuePage';

export default function ModerationQueuePage() {
  const [langQueue, setLangQueue] = useState<LanguageModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ModerationMetrics | null>(null);
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterLanguage, setFilterLanguage] = useState<string>('');
  const [feedbackTarget, setFeedbackTarget] = useState<{ sessionId: string; language: string } | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  const loadQueue = () => {
    setLoading(true);
    Promise.all([getLanguageModerationQueue(), getModerationMetrics()]).then(
      ([q, m]) => {
        setLangQueue(q);
        setMetrics(m);
      },
    ).catch((err) => {
      logger.error(SERVICE_NAME, 'Failed to load moderation queue', { error: String(err) });
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    const init = async () => {
      await loadQueue();
    };
    init();
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
      loadQueue(); // Refresh the full queue
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

  const cities = [...new Set(langQueue.map((item) => item.city))];
  const languages = [...new Set(langQueue.map((item) => item.language))];

  const filteredQueue = langQueue.filter((item) => {
    if (filterCity && item.city !== filterCity) return false;
    if (filterStatus && item.moderationStatus !== filterStatus) return false;
    if (filterLanguage && item.language !== filterLanguage) return false;
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
          value={filterLanguage}
          onChange={(e) => setFilterLanguage(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
          data-testid="filter-language"
        >
          <option value="">Toutes les langues</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>{LANG_FLAGS[lang] ?? ''} {lang.toUpperCase()}</option>
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

        {(filterCity || filterStatus || filterLanguage) && (
          <button
            onClick={() => { setFilterCity(''); setFilterStatus(''); setFilterLanguage(''); }}
            className="text-sm text-red-600 hover:underline px-2"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">Chargement...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
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
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Langue</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden sm:table-cell">Ville</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">Soumis le</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Statut</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredQueue.map((item) => {
                const badge = STATUS_BADGES[item.moderationStatus] || STATUS_BADGES.pending;
                return (
                  <tr key={item.id} data-testid={`moderation-item-${item.id}`} className={item.moderationStatus === 'resubmitted' ? 'bg-orange-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                          {item.guideName.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-900 truncate max-w-[120px]">{item.guideName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{item.tourTitle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" data-testid={`lang-badge-${item.language}`}>
                        {LANG_FLAGS[item.language] ?? ''} {item.language.toUpperCase()}
                      </span>
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
                      <button
                        onClick={() => handleApproveLanguage(item.sessionId, item.language)}
                        disabled={actionProcessing}
                        className="text-sm font-medium text-green-600 hover:text-green-800"
                        data-testid={`approve-lang-${item.language}`}
                      >
                        Approuver
                      </button>
                      <button
                        onClick={() => handleRejectLanguage(item.sessionId, item.language)}
                        disabled={actionProcessing}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                        data-testid={`reject-lang-${item.language}`}
                      >
                        Rejeter
                      </button>
                      <Link
                        href={`/admin/moderation/${item.moderationItemId}?lang=${item.language}`}
                        className="text-sm font-medium text-teal-600 hover:text-teal-800"
                        data-testid={`examine-btn-${item.id}`}
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
