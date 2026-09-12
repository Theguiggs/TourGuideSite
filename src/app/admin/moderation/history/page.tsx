'use client';

import { useState, useEffect } from 'react';
import { LoadError } from '@/components/admin/LoadError';
import { MODERATION_STATUS_BADGES, badgeFor } from '@/lib/admin/status-badges';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { getModerationHistory } from '@/lib/api/moderation';
import type { ModerationHistoryItem } from '@/types/moderation';
import { PageTitle } from '@murmure/design-system/web';

export default function ModerationHistoryPage() {
  const [history, setHistory] = useState<ModerationHistoryItem[]>([]);
  const [filterDecision, setFilterDecision] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    getModerationHistory()
      .then(setHistory)
      .catch(() => setLoadError('Impossible de charger l’historique.'))
      .finally(() => setLoading(false));
  }, [attempt]);
  const load = () => { setLoading(true); setLoadError(null); setAttempt((n) => n + 1); };

  const filtered = history.filter((item) => {
    if (filterDecision && item.decision !== filterDecision) return false;
    return true;
  });

  return (
    <div>
      <PageTitle size="h4" className="mb-6">Historique de modération</PageTitle>

      <div className="flex gap-3 mb-6">
        <select
          value={filterDecision}
          onChange={(e) => setFilterDecision(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-body text-ink-80"
        >
          <option value="">Toutes les décisions</option>
          <option value="approved">Approuvé</option>
          <option value="rejected">Refusé</option>
        </select>
      </div>

      {loading ? (
        <p className="text-ink-60 text-body" role="status" aria-busy="true">Chargement…</p>
      ) : loadError ? (
        <LoadError message={loadError} onRetry={load} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-md border border-line">
          <p className="text-ink-60">Aucun historique de modération.</p>
        </div>
      ) : (
        <div className="bg-card rounded-md border border-line overflow-x-auto">
          <table className="w-full">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">Parcours</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">Guide</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60 hidden sm:table-cell">Ville</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60 hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-body font-medium text-ink-60">Décision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-body font-medium text-ink">{item.tourTitle}</td>
                  <td className="px-4 py-3 text-body text-ink-60">{item.guideName}</td>
                  <td className="px-4 py-3 text-body text-ink-60 hidden sm:table-cell">{item.city}</td>
                  <td className="px-4 py-3 text-body text-ink-60 hidden md:table-cell">
                    {new Date(item.reviewDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge badge={badgeFor(MODERATION_STATUS_BADGES, item.decision, 'rejected')} />
                    {item.feedback && (
                      <p className="text-meta text-ink-40 mt-1 max-w-xs truncate">{item.feedback}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
