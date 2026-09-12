'use client';

import { useState, useEffect, useRef } from 'react';
import { listTourComments, addTourComment } from '@/lib/api/tour-comments';
import type { TourComment } from '@/lib/api/tour-comments';
import { logger } from '@/lib/logger';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'TourCommentThread';

const ACTION_LABELS: Record<string, { label: string; labelEn: string; color: string }> = {
  approved: { label: 'Approuvé', labelEn: 'Approved', color: 'bg-olive-soft text-success' },
  rejected: { label: 'Rejeté', labelEn: 'Rejected', color: 'bg-grenadine-soft text-danger' },
  revision: { label: 'Révision demandée', labelEn: 'Revision requested', color: 'bg-ocre-soft text-ocre-ink' },
  submitted: { label: 'Soumis', labelEn: 'Submitted', color: 'bg-mer-soft text-mer' },
  resubmitted: { label: 'Resoumis', labelEn: 'Resubmitted', color: 'bg-mer-soft text-mer' },
  comment: { label: 'Commentaire', labelEn: 'Comment', color: 'bg-paper-soft text-ink-80' },
};

interface TourCommentThreadProps {
  tourId: string;
  role: 'admin' | 'guide';
  authorName: string;
  sessionId?: string;
}

export function TourCommentThread({ tourId, role, authorName, sessionId }: TourCommentThreadProps) {
  const { locale, t } = useStudioLocale();
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
    <div className="bg-card rounded-xl border border-line overflow-hidden" data-testid="tour-comment-thread">
      <div className="px-4 py-3 bg-paper-soft border-b border-line">
        <h3 className="text-body font-semibold text-ink">{t("Journal d'échanges", 'Conversation log')}</h3>
        <p className="text-meta text-ink-60">{comments.length} message{comments.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Comments list */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-body text-ink-40 animate-pulse">{t('Chargement...', 'Loading...')}</p>
        ) : comments.length === 0 ? (
          <p className="text-body text-ink-40 text-center py-4">{t('Aucun échange pour le moment.', 'No messages yet.')}</p>
        ) : (
          comments.map((c) => {
            const isAdmin = c.author === 'admin';
            const actionInfo = c.action ? ACTION_LABELS[c.action] : null;
            return (
              <div
                key={c.id}
                className={`rounded-lg p-3 ${isAdmin ? 'bg-grenadine-soft border border-grenadine-soft' : 'bg-grenadine-soft border border-grenadine-soft'}`}
                data-testid={`comment-${c.id}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-meta font-bold ${isAdmin ? 'text-danger' : 'text-grenadine'}`}>
                    {isAdmin ? '🔴' : '🟢'} {c.authorName}
                  </span>
                  <span className="text-eyebrow text-ink-40">
                    {new Date(c.createdAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {actionInfo && c.action !== 'comment' && (
                    <span className={`text-eyebrow px-1.5 py-0.5 rounded-pill font-medium ${actionInfo.color}`}>
                      {t(actionInfo.label, actionInfo.labelEn)}
                    </span>
                  )}
                  {c.language && (
                    <span className="text-eyebrow text-ink-40">({c.language.toUpperCase()})</span>
                  )}
                </div>
                <p className="text-body text-ink">{c.message}</p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-line p-3 flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={t('Écrire un message...', 'Write a message...')}
          rows={2}
          className="flex-1 border border-line rounded-lg px-3 py-2 text-body resize-none focus:outline-none focus:ring-2 focus:ring-grenadine"
          data-testid="comment-input"
        />
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="self-end bg-grenadine hover:opacity-90 disabled:bg-paper-deep text-white text-body font-medium px-4 py-2 rounded-lg transition"
          data-testid="comment-send"
        >
          {sending ? '...' : t('Envoyer', 'Send')}
        </button>
      </div>
    </div>
  );
}
