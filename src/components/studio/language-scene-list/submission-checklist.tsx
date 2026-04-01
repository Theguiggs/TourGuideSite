'use client';

import { useMemo, useState, useCallback } from 'react';
import type { StudioScene, SceneSegment } from '@/types/studio';
import {
  checkLanguageReadiness,
  submitLanguageForModeration,
  type LanguageReadiness,
  type SubmissionApiError,
} from '@/lib/api/language-purchase';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'SubmissionChecklist';

// --- Types ---

export interface SubmissionChecklistProps {
  sessionId: string;
  language: string;
  scenes: StudioScene[];
  segments: SceneSegment[];
  onSubmitted: () => void;
}

// --- Component ---

export function SubmissionChecklist({
  sessionId,
  language,
  scenes,
  segments,
  onSubmitted,
}: SubmissionChecklistProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readiness: LanguageReadiness = useMemo(
    () => checkLanguageReadiness(scenes, segments, language),
    [scenes, segments, language],
  );

  const handleSubmit = useCallback(async () => {
    if (!readiness.ready || submitting) return;
    setSubmitting(true);
    setError(null);

    logger.info(SERVICE_NAME, 'Submitting language for moderation', {
      sessionId,
      language,
      sceneCount: scenes.length,
    });

    const result = await submitLanguageForModeration(sessionId, language, scenes, segments);

    setSubmitting(false);

    if (result.ok) {
      logger.info(SERVICE_NAME, 'Language submitted successfully', { sessionId, language });
      onSubmitted();
    } else {
      const err = result.error as SubmissionApiError;
      logger.error(SERVICE_NAME, 'Submission failed', {
        sessionId,
        language,
        code: err.code,
        message: err.message,
      });
      setError(err.message);
    }
  }, [readiness.ready, submitting, sessionId, language, scenes, segments, onSubmitted]);

  const incompleteCount = readiness.total - readiness.complete;

  return (
    <div data-testid="submission-checklist" className="space-y-3">
      {/* Summary */}
      <div
        data-testid="submission-summary"
        className={`rounded-lg border p-3 text-sm font-medium ${
          readiness.ready
            ? 'border-green-300 bg-green-50 text-green-800'
            : 'border-amber-300 bg-amber-50 text-amber-800'
        }`}
      >
        {readiness.ready
          ? `${readiness.complete}/${readiness.total} scenes — Pret pour soumission`
          : `${readiness.complete}/${readiness.total} scenes — ${incompleteCount} scene(s) incomplete(s)`}
      </div>

      {/* Per-scene status */}
      <ul data-testid="submission-scene-list" className="space-y-1">
        {readiness.scenes.map((scene) => (
          <li
            key={scene.sceneId}
            data-testid={`checklist-scene-${scene.sceneId}`}
            className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm"
          >
            <span className="text-gray-700">{scene.sceneTitle}</span>
            <span className="flex gap-2 text-xs">
              <span data-testid={`text-status-${scene.sceneId}`}>
                Texte {scene.hasText ? '\u2705' : '\u274C'}
              </span>
              <span data-testid={`audio-status-${scene.sceneId}`}>
                Audio {scene.hasAudio ? '\u2705' : '\u274C'}
              </span>
            </span>
          </li>
        ))}
      </ul>

      {/* Error message */}
      {error && (
        <div data-testid="submission-error" className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        data-testid="checklist-submit-button"
        type="button"
        disabled={!readiness.ready || submitting}
        onClick={handleSubmit}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Soumission en cours...' : `Soumettre la version ${language}`}
      </button>
    </div>
  );
}
