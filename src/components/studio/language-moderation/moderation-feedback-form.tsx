'use client';

import { useState, useCallback } from 'react';
import type { ModerationStatusUpdate } from '@/lib/api/language-purchase';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'ModerationFeedbackForm';

interface ModerationFeedbackFormProps {
  language: string;
  scenes: Array<{ id: string; title: string | null; index: number }>;
  onSubmit: (
    status: ModerationStatusUpdate,
    feedback?: Record<string, string>,
  ) => Promise<void>;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function ModerationFeedbackForm({
  language,
  scenes,
  onSubmit,
  onCancel,
  isProcessing = false,
}: ModerationFeedbackFormProps) {
  const [feedbackByScene, setFeedbackByScene] = useState<Record<string, string>>({});
  const [action, setAction] = useState<'rejected' | 'revision_requested'>('revision_requested');

  const langLabel = language.toUpperCase();

  const hasAnyFeedback = Object.values(feedbackByScene).some((v) => v.trim().length > 0);

  const handleSubmit = useCallback(async () => {
    if (!hasAnyFeedback) {
      logger.warn(SERVICE_NAME, 'No feedback provided', { language });
      return;
    }

    // Filter to only non-empty feedback
    const filteredFeedback: Record<string, string> = {};
    for (const [sceneId, text] of Object.entries(feedbackByScene)) {
      if (text.trim()) {
        filteredFeedback[sceneId] = text.trim();
      }
    }

    await onSubmit(action, filteredFeedback);
  }, [feedbackByScene, action, onSubmit, hasAnyFeedback, language]);

  return (
    <div className="bg-white border border-line rounded-xl p-4 space-y-4" data-testid="moderation-feedback-form">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink">
          Feedback pour la version {langLabel}
        </h4>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as 'rejected' | 'revision_requested')}
          className="text-xs border border-line rounded px-2 py-1"
          data-testid="moderation-action-select"
        >
          <option value="revision_requested">Revision demandee</option>
          <option value="rejected">Rejeter</option>
        </select>
      </div>

      <div className="space-y-3">
        {scenes.map((scene) => (
          <div key={scene.id} className="space-y-1">
            <label className="text-xs font-medium text-ink-80" htmlFor={`feedback-${scene.id}`}>
              Scene {scene.index + 1}: {scene.title ?? `Scene ${scene.index + 1}`}
            </label>
            <textarea
              id={`feedback-${scene.id}`}
              value={feedbackByScene[scene.id] ?? ''}
              onChange={(e) =>
                setFeedbackByScene((prev) => ({ ...prev, [scene.id]: e.target.value }))
              }
              placeholder={`Feedback pour cette scene en ${langLabel}...`}
              className="w-full text-xs border border-line rounded p-2 resize-none h-16"
              data-testid={`scene-feedback-${scene.id}`}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="text-xs text-ink-80 hover:text-ink px-3 py-1.5 rounded border border-line"
          data-testid="cancel-feedback-btn"
        >
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !hasAnyFeedback}
          className="text-xs bg-danger hover:opacity-90 disabled:bg-ink-40 text-white font-medium px-3 py-1.5 rounded transition"
          data-testid="submit-feedback-btn"
        >
          {action === 'rejected' ? 'Rejeter' : 'Demander revision'}
        </button>
      </div>
    </div>
  );
}
