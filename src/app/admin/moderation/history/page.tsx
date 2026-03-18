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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Historique de moderation</h1>

      <div className="flex gap-3 mb-6">
        <select
          value={filterDecision}
          onChange={(e) => setFilterDecision(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700"
        >
          <option value="">Toutes les decisions</option>
          <option value="approved">Approuve</option>
          <option value="rejected">Refuse</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">Aucun historique de moderation.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Parcours</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Guide</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden sm:table-cell">Ville</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500 hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.tourTitle}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.guideName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{item.city}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">
                    {new Date(item.reviewDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        item.decision === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.decision === 'approved' ? 'Approuve' : 'Refuse'}
                    </span>
                    {item.feedback && (
                      <p className="text-xs text-gray-400 mt-1 max-w-xs truncate">{item.feedback}</p>
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
