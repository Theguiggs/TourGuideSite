'use client';

import { useState, useEffect, useRef } from 'react';
import { listTourComments, addTourComment } from '@/lib/api/tour-comments';
import type { TourComment } from '@/lib/api/tour-comments';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'TourCommentThread';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approuvé', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700' },
  revision: { label: 'Révision demandée', color: 'bg-amber-100 text-amber-700' },
  submitted: { label: 'Soumis', color: 'bg-blue-100 text-blue-700' },
  resubmitted: { label: 'Resoumis', color: 'bg-indigo-100 text-indigo-700' },
  comment: { label: 'Commentaire', color: 'bg-gray-100 text-gray-600' },
};

interface TourCommentThreadProps {
  tourId: string;
  role: 'admin' | 'guide';
  authorName: string;
  sessionId?: string;
}

export function TourCommentThread({ tourId, role, authorName, sessionId }: TourCommentThreadProps) {
  const [comments, setComments] = useState<TourComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listTourComments(tourId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tourId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    const result = await addTourComment(tourId, {
      message: message.trim(),
      author: role,
      authorName,
      action: 'comment',
      sessionId,
    });
    if (result.ok) {
      setComments((prev) => [...prev, result.comment]);
      setMessage('');
    } else {
      logger.error(SERVICE_NAME, 'Failed to send comment', { error: result.error });
    }
    setSending(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="tour-comment-thread">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800">Journal d&apos;échanges</h3>
        <p className="text-xs text-gray-500">{comments.length} message{comments.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Comments list */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-400 animate-pulse">Chargement...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucun échange pour le moment.</p>
        ) : (
          comments.map((c) => {
            const isAdmin = c.author === 'admin';
            const actionInfo = c.action ? ACTION_LABELS[c.action] : null;
            return (
              <div
                key={c.id}
                className={`rounded-lg p-3 ${isAdmin ? 'bg-red-50 border border-red-100' : 'bg-teal-50 border border-teal-100'}`}
                data-testid={`comment-${c.id}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold ${isAdmin ? 'text-red-700' : 'text-teal-700'}`}>
                    {isAdmin ? '🔴' : '🟢'} {c.authorName}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {actionInfo && c.action !== 'comment' && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${actionInfo.color}`}>
                      {actionInfo.label}
                    </span>
                  )}
                  {c.language && (
                    <span className="text-[10px] text-gray-400">({c.language.toUpperCase()})</span>
                  )}
                </div>
                <p className="text-sm text-gray-800">{c.message}</p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Écrire un message..."
          rows={2}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
          data-testid="comment-input"
        />
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="self-end bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          data-testid="comment-send"
        >
          {sending ? '...' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}
