'use client';

import { useState, useEffect } from 'react';
import { getModerationHistory } from '@/lib/api/moderation';
import type { ModerationHistoryItem } from '@/types/moderation';

export default function ModerationHistoryPage() {
  const [history, setHistory] = useState<ModerationHistoryItem[]>([]);
  const [filterDecision, setFilterDecision] = useState<string>('');

  useEffect(() => {
    getModerationHistory().then(setHistory);
  }, []);

  const filtered = history.filter((item) => {
    if (filterDecision && item.decision !== filterDecision) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-6">Historique de moderation</h1>

      <div className="flex gap-3 mb-6">
        <select
          value={filterDecision}
          onChange={(e) => setFilterDecision(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-sm text-ink-80"
        >
          <option value="">Toutes les decisions</option>
          <option value="approved">Approuve</option>
          <option value="rejected">Refuse</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-md border border-line">
          <p className="text-ink-60">Aucun historique de moderation.</p>
        </div>
      ) : (
        <div className="bg-card rounded-md border border-line overflow-hidden">
          <table className="w-full">
            <thead className="bg-paper-soft border-b border-line">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60">Parcours</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60">Guide</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60 hidden sm:table-cell">Ville</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60 hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-ink-60">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm font-medium text-ink">{item.tourTitle}</td>
                  <td className="px-4 py-3 text-sm text-ink-60">{item.guideName}</td>
                  <td className="px-4 py-3 text-sm text-ink-60 hidden sm:table-cell">{item.city}</td>
                  <td className="px-4 py-3 text-sm text-ink-60 hidden md:table-cell">
                    {new Date(item.reviewDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        item.decision === 'approved'
                          ? 'bg-olive-soft text-olive'
                          : 'bg-grenadine-soft text-danger'
                      }`}
                    >
                      {item.decision === 'approved' ? 'Approuve' : 'Refuse'}
                    </span>
                    {item.feedback && (
                      <p className="text-xs text-ink-40 mt-1 max-w-xs truncate">{item.feedback}</p>
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
