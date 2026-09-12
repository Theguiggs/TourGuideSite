'use client';

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { trackEvent, StudioAnalyticsEvents } from '@/lib/analytics';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'SatisfactionScore';

interface SatisfactionScoreProps {
  sessionId: string;
  onComplete: () => void;
}

export function SatisfactionScore({ sessionId, onComplete }: SatisfactionScoreProps) {
  const { t } = useStudioLocale();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = useCallback(() => {
    if (score === null) return;
    logger.info(SERVICE_NAME, 'Satisfaction submitted', { sessionId, score, comment: comment.length > 0 });
    trackEvent(StudioAnalyticsEvents.STUDIO_SATISFACTION_SUBMITTED, { sessionId, score });
    setIsSubmitted(true);
    setTimeout(onComplete, 2000);
  }, [score, comment, sessionId, onComplete]);

  if (isSubmitted) {
    return (
      <div className="bg-olive-soft border border-olive-soft rounded-lg p-4 text-center" data-testid="satisfaction-thanks">
        <p className="text-success font-medium">{t('Merci pour votre retour ! 🎉', 'Thanks for your feedback! 🎉')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-line rounded-lg p-4" data-testid="satisfaction-score">
      <h3 className="font-medium text-ink mb-2">{t("Comment s'est passée la création de cette visite ?", 'How did creating this tour go?')}</h3>
      <p className="text-meta text-ink-60 mb-3">{t('Votre avis nous aide à améliorer le studio.', 'Your feedback helps us improve the studio.')}</p>

      {/* Score 1-5 */}
      <div className="flex gap-2 mb-3" role="radiogroup" aria-label={t('Score de satisfaction', 'Satisfaction score')}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => setScore(value)}
            className={`w-10 h-10 rounded-pill text-h6 transition-all ${
              score === value
                ? 'bg-grenadine text-white scale-110 shadow-md'
                : score !== null && value <= score
                  ? 'bg-grenadine-soft text-grenadine'
                  : 'bg-paper-soft text-ink-40 hover:bg-paper-deep'
            }`}
            role="radio"
            aria-checked={score === value}
            aria-label={t(`${value} sur 5`, `${value} out of 5`)}
            data-testid={`score-${value}`}
          >
            {value}
          </button>
        ))}
      </div>

      {score !== null && (
        <div className="text-meta text-ink-60 mb-3">
          {score <= 2 && t('😟 Que pourrions-nous améliorer ?', '😟 What could we improve?')}
          {score === 3 && t('🤔 Des suggestions ?', '🤔 Any suggestions?')}
          {score >= 4 && t('😊 Super ! Un commentaire ?', '😊 Great! Any comments?')}
        </div>
      )}

      {/* Optional comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('Commentaire optionnel...', 'Optional comment...')}
        rows={2}
        maxLength={500}
        className="w-full border border-line rounded px-2 py-1 text-body resize-none mb-3"
        data-testid="satisfaction-comment"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={score === null}
          className="bg-grenadine hover:opacity-90 disabled:bg-paper-deep text-white text-body font-medium px-4 py-1.5 rounded-lg transition"
          data-testid="satisfaction-submit"
        >
          {t('Envoyer', 'Send')}
        </button>
        <button
          onClick={onComplete}
          className="text-body text-ink-60 hover:text-ink-80"
        >
          {t('Passer', 'Skip')}
        </button>
      </div>
    </div>
  );
}
