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
  pending: { label: 'En attente', className: 'bg-ocre-soft text-ocre' },
  resubmitted: { label: 'Resoumis', className: 'bg-ocre-soft text-ocre' },
  in_review: { label: 'En revue', className: 'bg-mer-soft text-mer' },
  approved: { label: 'Approuve', className: 'bg-olive-soft text-olive' },
  rejected: { label: 'Refuse', className: 'bg-grenadine-soft text-danger' },
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
      <h1 className="text-2xl font-bold text-ink mb-6">File d&apos;attente de moderation</h1>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-3xl font-bold text-danger">{metrics.pendingCount}</p>
            <p className="text-sm text-ink-60">En attente</p>
          </div>
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-3xl font-bold text-ink">{metrics.avgReviewTimeMinutes} min</p>
            <p className="text-sm text-ink-60">Temps moyen de revue</p>
          </div>
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-3xl font-bold text-olive">{metrics.approvalRate}%</p>
            <p className="text-sm text-ink-60">Taux d&apos;approbation</p>
          </div>
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-3xl font-bold text-ink">{metrics.reviewedThisMonth}</p>
            <p className="text-sm text-ink-60">Revues ce mois</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-sm text-ink-80"
        >
          <option value="">Toutes les villes</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <select
          value={filterLanguage}
          onChange={(e) => setFilterLanguage(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-sm text-ink-80"
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
          className="border border-line rounded-lg px-3 py-2 text-sm text-ink-80"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="resubmitted">Resoumis</option>
        </select>

        {(filterCity || filterStatus || filterLanguage) && (
          <button
            onClick={() => { setFilterCity(''); setFilterStatus(''); setFilterLanguage(''); }}
            className="text-sm text-danger hover:underline px-2"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="text-center py-12 bg-card rounded-md border border-line">
          <p className="text-ink-60">Chargement...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-md border border-line">
          <p className="text-ink-60 text-lg">Aucun parcours en attente de moderation.</p>
          <p className="text-ink-40 text-sm mt-1">Les nouvelles soumissions apparaitront ici.</p>
        </div>
      ) : (
        <div className="bg-card rounded-md border border-line overflow-hidden">
          <table className="w-full">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60">Guide</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60">Parcours</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60">Langue</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60 hidden sm:table-cell">Ville</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60 hidden md:table-cell">Soumis le</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60">Statut</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-ink-60">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredQueue.map((item) => {
                const badge = STATUS_BADGES[item.moderationStatus] || STATUS_BADGES.pending;
                return (
                  <tr key={item.id} data-testid={`moderation-item-${item.id}`} className={item.moderationStatus === 'resubmitted' ? 'bg-ocre-soft' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-grenadine-soft rounded-full flex items-center justify-center text-grenadine font-bold text-sm flex-shrink-0">
                          {item.guideName.charAt(0)}
                        </div>
                        <span className="text-sm text-ink truncate max-w-[120px]">{item.guideName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-ink">{item.tourTitle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" data-testid={`lang-badge-${item.language}`}>
                        {LANG_FLAGS[item.language] ?? ''} {item.language.toUpperCase()}
                      </span>
                      {item.isSourceLanguage && (
                        <span className="ml-1 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-mer-soft text-mer" data-testid="source-lang-badge">
                          Source
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-ink-60">{item.city}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-ink-60">
                      {new Date(item.submissionDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {!item.isSourceLanguage && (
                        <>
                          <button
                            onClick={() => handleApproveLanguage(item.sessionId, item.language)}
                            disabled={actionProcessing}
                            className="text-sm font-medium text-olive hover:text-olive"
                            data-testid={`approve-lang-${item.language}`}
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => handleRejectLanguage(item.sessionId, item.language)}
                            disabled={actionProcessing}
                            className="text-sm font-medium text-danger hover:text-danger"
                            data-testid={`reject-lang-${item.language}`}
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                      <Link
                        href={`/admin/moderation/${item.moderationItemId}${item.isSourceLanguage ? '' : `?lang=${item.language}`}`}
                        className="text-sm font-medium text-grenadine hover:text-grenadine"
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
