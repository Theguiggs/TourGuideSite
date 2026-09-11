'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getModerationMetrics, getLanguageModerationQueue } from '@/lib/api/moderation';
import { trackEvent, AdminAnalyticsEvents } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import type { LanguageModerationItem, ModerationMetrics } from '@/types/moderation';
import { PageTitle } from '@murmure/design-system/web';

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-ocre-soft text-ocre-ink' },
  resubmitted: { label: 'Resoumis', className: 'bg-ocre-soft text-ocre-ink' },
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
      <PageTitle size="h4" className="mb-6">File d&apos;attente de modération</PageTitle>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-3xl font-bold text-danger">{metrics.pendingCount}</p>
            <p className="text-body text-ink-60">En attente</p>
          </div>
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-3xl font-bold text-ink">{metrics.avgReviewTimeMinutes} min</p>
            <p className="text-body text-ink-60">Temps moyen de revue</p>
          </div>
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-3xl font-bold text-olive">{metrics.approvalRate}%</p>
            <p className="text-body text-ink-60">Taux d&apos;approbation</p>
          </div>
          <div className="bg-card rounded-md p-4 border border-line">
            <p className="text-3xl font-bold text-ink">{metrics.reviewedThisMonth}</p>
            <p className="text-body text-ink-60">Revues ce mois</p>
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
          <option value="">Toutes les villes</option>
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
          <option value="">Toutes les langues</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>{LANG_FLAGS[lang] ?? ''} {lang.toUpperCase()}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-body text-ink-80"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="resubmitted">Resoumis</option>
        </select>

        {(filterCity || filterStatus || filterLanguage) && (
          <button
            onClick={() => { setFilterCity(''); setFilterStatus(''); setFilterLanguage(''); }}
            className="text-body text-danger hover:underline px-2"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* Queue Table */}
      {loading ? (
        <div className="text-center py-12 bg-card rounded-md border border-line">
          <p className="text-ink-60" role="status" aria-busy="true">Chargement…</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-md border border-line">
          <p className="text-ink-60 text-lg">Aucune visite en attente de modération.</p>
          <p className="text-ink-40 text-body mt-1">Les nouvelles soumissions apparaîtront ici.</p>
        </div>
      ) : (
        <div className="bg-card rounded-md border border-line overflow-x-auto">
          <table className="w-full">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">Guide</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">Parcours</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">Langue</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">Narration</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60 hidden sm:table-cell">Ville</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60 hidden md:table-cell">Soumis le</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">Statut</th>
                <th className="text-right px-4 py-3 text-body font-medium text-ink-60">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredQueue.map((item) => {
                const badge = STATUS_BADGES[item.moderationStatus] || STATUS_BADGES.pending;
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
                        <span className="ml-1 inline-flex px-1.5 py-0.5 rounded text-eyebrow font-medium bg-mer-soft text-mer" data-testid="source-lang-badge">
                          Source
                        </span>
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
                          ? 'Voix humaine'
                          : item.narrationMode === 'tts_on_demand'
                            ? 'TTS à la demande'
                            : 'Mode à migrer'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-body text-ink-60">{item.city}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-body text-ink-60">
                      {new Date(item.submissionDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-meta font-medium px-2 py-1 rounded-pill ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/moderation/${item.moderationItemId}?lang=${item.language}`}
                        className="text-body font-medium text-grenadine hover:text-grenadine"
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

    </div>
  );
}
