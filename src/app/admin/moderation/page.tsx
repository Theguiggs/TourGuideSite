'use client';
import { useAdminCopy } from '@/lib/admin/use-admin-copy';


import { useState, useEffect } from 'react';
import { LoadError } from '@/components/admin/LoadError';
import Link from 'next/link';
import { getModerationMetrics, getLanguageModerationQueue } from '@/lib/api/moderation';
import { trackEvent, AdminAnalyticsEvents } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import type { LanguageModerationItem, ModerationMetrics } from '@/types/moderation';
import { PageTitle } from '@murmure/design-system/web';
import { MODERATION_STATUS_BADGES, badgeFor } from '@/lib/admin/status-badges';
import { LANG_FLAGS } from '@/lib/i18n/languages';
import { StatusBadge } from '@/components/admin/StatusBadge';

const SERVICE_NAME = 'ModerationQueuePage';

export default function ModerationQueuePage() {
  const a = useAdminCopy();
  const [langQueue, setLangQueue] = useState<LanguageModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ModerationMetrics | null>(null);
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterLanguage, setFilterLanguage] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadQueue = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([getLanguageModerationQueue(), getModerationMetrics()]).then(
      ([q, m]) => {
        setLangQueue(q);
        setMetrics(m);
      },
    ).catch((err) => {
      logger.error(SERVICE_NAME, 'Failed to load moderation queue', { error: String(err) });
      setLoadError(a("Impossible de charger la file de modération."));
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
      <PageTitle size="h4" className="mb-6">{a("File d'attente de modération")}</PageTitle>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-h4 font-bold text-danger">{metrics.pendingCount}</p>
            <p className="text-body text-ink-60">{a("En attente")}</p>
          </div>
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-h4 font-bold text-ink">{metrics.avgReviewTimeMinutes} min</p>
            <p className="text-body text-ink-60">{a("Temps moyen de revue")}</p>
          </div>
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-h4 font-bold text-olive">{metrics.approvalRate}%</p>
            <p className="text-body text-ink-60">{a("Taux d'approbation")}</p>
          </div>
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-h4 font-bold text-ink">{metrics.reviewedThisMonth}</p>
            <p className="text-body text-ink-60">{a("Revues ce mois")}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-body text-ink-80"
        >
          <option value="">{a("Toutes les villes")}</option>
          {cities.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>

        <select
          value={filterLanguage}
          onChange={(e) => setFilterLanguage(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-body text-ink-80"
          data-testid="filter-language"
        >
          <option value="">{a("Toutes les langues")}</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>{LANG_FLAGS[lang] ?? ''} {lang.toUpperCase()}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-body text-ink-80"
        >
          <option value="">{a("Tous les statuts")}</option>
          <option value="pending">{a("En attente")}</option>
          <option value="resubmitted">{a("Resoumis")}</option>
        </select>

        {(filterCity || filterStatus || filterLanguage) && (
          <button
            onClick={() => { setFilterCity(''); setFilterStatus(''); setFilterLanguage(''); }}
            className="text-body text-danger hover:underline px-2"
          > {a("Effacer les filtres")} </button>
        )}
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="text-center py-12 bg-card rounded-md border border-line">
          <p className="text-ink-60" role="status" aria-busy="true">{a("Chargement…")}</p>
        </div>
      ) : loadError ? (
        <LoadError message={a.error(loadError)} onRetry={loadQueue} />
      ) : filteredQueue.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-md border border-line">
          <p className="text-ink-60 text-h6">{a("Aucune visite en attente de modération.")}</p>
          <p className="text-ink-40 text-body mt-1">{a("Les nouvelles soumissions apparaîtront ici.")}</p>
        </div>
      ) : (
        <div className="bg-card rounded-md border border-line overflow-x-auto">
          <table className="w-full">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">{a("Guide")}</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">{a("Parcours")}</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">{a("Langue")}</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">{a("Narration")}</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60 hidden sm:table-cell">{a("Ville")}</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60 hidden md:table-cell">{a("Soumis le")}</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">{a("Statut")}</th>
                <th className="text-right px-4 py-3 text-body font-medium text-ink-60">{a("Action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredQueue.map((item) => {
                const badge = badgeFor(MODERATION_STATUS_BADGES, item.moderationStatus, 'pending');
                return (
                  <tr key={item.id} data-testid={`moderation-item-${item.id}`} className={item.moderationStatus === 'resubmitted' ? 'bg-ocre-soft' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-grenadine-soft rounded-pill flex items-center justify-center text-grenadine font-bold text-body flex-shrink-0">
                          {item.guideName.charAt(0)}
                        </div>
                        <span className="text-body text-ink truncate max-w-[120px]">{item.guideName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body font-medium text-ink">{item.tourTitle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-body" data-testid={`lang-badge-${item.language}`}>
                        {LANG_FLAGS[item.language] ?? ''} {item.language.toUpperCase()}
                      </span>
                      {item.isSourceLanguage && (
                        <span className="ml-1 inline-flex px-1.5 py-0.5 rounded text-eyebrow font-medium bg-mer-soft text-mer" data-testid="source-lang-badge"> {a("Source")} </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-pill text-meta font-medium ${
                        item.narrationMode === 'recording'
                          ? 'bg-mer-soft text-mer'
                          : item.narrationMode === 'tts_on_demand'
                            ? 'bg-olive-soft text-olive'
                            : 'bg-grenadine-soft text-danger'
                      }`} data-testid={`narration-mode-${item.id}`}>
                        {item.narrationMode === 'recording'
                          ? a("Voix humaine")
                          : item.narrationMode === 'tts_on_demand'
                            ? a("TTS à la demande")
                            : a("Mode à migrer")}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-body text-ink-60">{item.city}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-body text-ink-60">
                      {a.date(item.submissionDate)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge badge={badge} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/moderation/${item.moderationItemId}?lang=${item.language}`}
                        className="text-body font-medium text-grenadine hover:text-grenadine"
                        data-testid={`examine-btn-${item.id}`}
                      > {a("Examiner")} </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
