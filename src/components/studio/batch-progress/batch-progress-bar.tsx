'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  useLanguageBatchStore,
  selectOverallPercentage,
  selectOverallCompleted,
  selectOverallTotal,
  selectIsBatchRunning,
  selectBatchCurrentScene,
  selectBatchLangCount,
  selectBatchCompletedLangs,
  selectAllBatchCompleted,
} from '@/lib/stores/language-batch-store';

const STICKY_DELAY_MS = 30_000;

export interface BatchProgressBarProps {
  /** Override for testing — total langs being translated */
  totalLangs?: number;
}

export function BatchProgressBar({ totalLangs }: BatchProgressBarProps) {
  // All selectors return primitives — safe for Zustand v5 (no infinite loop)
  const percentage = useLanguageBatchStore(selectOverallPercentage);
  const completedScenes = useLanguageBatchStore(selectOverallCompleted);
  const totalScenes = useLanguageBatchStore(selectOverallTotal);
  const isRunning = useLanguageBatchStore(selectIsBatchRunning);
  const currentScene = useLanguageBatchStore(selectBatchCurrentScene);
  const langCount = useLanguageBatchStore(selectBatchLangCount);
  const completedLangs = useLanguageBatchStore(selectBatchCompletedLangs);
  const allCompleted = useLanguageBatchStore(selectAllBatchCompleted);

  const [isSticky, setIsSticky] = useState(false);
  const stickyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasRunningRef = useRef(false);

  const totalLangCount = totalLangs ?? langCount;

  // Sticky mode: activate after 30s of running
  useEffect(() => {
    if (isRunning && !wasRunningRef.current) {
      stickyTimerRef.current = setTimeout(() => {
        setIsSticky(true);
      }, STICKY_DELAY_MS);
      wasRunningRef.current = true;
    }

    if (!isRunning && wasRunningRef.current) {
      if (stickyTimerRef.current) {
        clearTimeout(stickyTimerRef.current);
        stickyTimerRef.current = null;
      }
      setIsSticky(false); // eslint-disable-line react-hooks/set-state-in-effect -- cleanup on stop
      wasRunningRef.current = false;
    }

    return () => {
      if (stickyTimerRef.current) {
        clearTimeout(stickyTimerRef.current);
      }
    };
  }, [isRunning]);

  // Hide when batch is done (all completed, none running)
  if (!isRunning && allCompleted) {
    return null;
  }

  // Hide if no batch has been initiated
  if (langCount === 0) {
    return null;
  }

  const stickyClasses = isSticky
    ? 'sticky top-0 z-50 shadow-md bg-white'
    : 'bg-white';

  return (
    <div
      className={`p-4 rounded-lg border border-line ${stickyClasses}`}
      role="status"
      aria-label="Progression de la traduction"
      data-testid="batch-progress-bar"
    >
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-3 bg-paper-deep rounded-full overflow-hidden">
          <div
            className="h-full bg-grenadine rounded-full batch-progress-transition"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Traduction ${percentage}% complete — ${completedScenes} sur ${totalScenes} scenes`}
            data-testid="batch-progress-fill"
          />
        </div>
        <span className="text-sm font-medium text-ink-80 min-w-[3rem] text-right" data-testid="batch-progress-percentage">
          {percentage}%
        </span>
      </div>

      {/* Scene counter + lang counter */}
      <div className="flex justify-between items-center text-xs text-ink-60" aria-live="polite">
        <span>
          {completedScenes}/{totalScenes} scenes
          {totalLangCount > 1 && ` — en (${completedLangs}/${totalLangCount} langues)`}
        </span>
        {currentScene && (
          <span className="truncate ml-2 text-ink-80" data-testid="batch-current-scene">
            {currentScene}
          </span>
        )}
      </div>
    </div>
  );
}
