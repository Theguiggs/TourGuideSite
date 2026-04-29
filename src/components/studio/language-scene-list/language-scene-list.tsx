'use client';

import { useMemo, useState, useCallback } from 'react';
import type { StudioScene, SceneSegment } from '@/types/studio';
import { useLanguageBatchStore } from '@/lib/stores/language-batch-store';
import type { FailedSceneEntry, BatchProgress } from '@/lib/stores/language-batch-store';
import { SceneRetryCard } from './scene-retry-card';
import { LanguageStatusBadge, type SceneLanguageStatus } from './language-status-badge';
import { ManuallyEditedModal } from '../staleness-alert/manually-edited-modal';
import { SubmissionChecklist } from './submission-checklist';
import { LANGUAGE_CONFIG } from '@/components/studio/language-checkout/language-checkbox-card';
import { checkLanguageReadiness } from '@/lib/api/language-purchase';
import { logger } from '@/lib/logger';

// --- Types ---

export type SceneSortStatus = 'failed' | 'stale' | 'pending' | 'completed';

export interface SortedScene {
  scene: StudioScene;
  status: SceneSortStatus;
  languageStatus: SceneLanguageStatus;
  failedEntry: FailedSceneEntry | null;
}

export interface LanguageSceneListProps {
  scenes: StudioScene[];
  lang: string;
  completedSceneIds: string[];
  segments: SceneSegment[];
  sessionId?: string;
  onRetryScene?: (sceneId: string) => void;
  onResumeBatch?: () => void;
  hasMissingScenes: boolean;
  onSceneClick: (sceneId: string) => void;
  onRetranslateStale?: (sceneIds: string[]) => void;
  onGenerateMissingAudio?: () => void;
  onListenPreview?: () => void;
  onFullPreview?: () => void;
  onSubmitLanguage?: () => void;
  onRequestAutoTranslation?: (lang: string) => void;
  isAutoTranslated?: boolean;
}

// --- Staleness detection ---

export function isSegmentStale(segment: SceneSegment, sourceScene: StudioScene): boolean {
  if (!segment.sourceUpdatedAt) return false;
  return new Date(sourceScene.updatedAt) > new Date(segment.sourceUpdatedAt);
}

// --- Compute scene language status ---

export function computeSceneLanguageStatus(
  scene: StudioScene,
  segment: SceneSegment | null,
  batchProgress: BatchProgress | null,
): SceneLanguageStatus {
  // If the batch is running and this is the current scene -> processing
  if (batchProgress && (batchProgress.status === 'running' || batchProgress.status === 'idle')) {
    if (batchProgress.currentScene === scene.id) {
      return 'processing';
    }
  }

  // If this scene is in the batch failed list -> failed
  if (batchProgress && batchProgress.failedScenes.includes(scene.id)) {
    return 'failed';
  }

  // If no segment or no translated text -> pending
  if (!segment || !segment.transcriptText) {
    return 'pending';
  }

  // If source was updated after the segment -> stale
  if (isSegmentStale(segment, scene)) {
    return 'stale';
  }

  // Check if audioKey is a real file (S3 key or data URL), not just a marker
  const hasRealAudio = segment.audioKey
    && !segment.audioKey.startsWith('tts-')
    && (segment.audioKey.startsWith('guide-studio/') || segment.audioKey.startsWith('data:') || segment.audioKey.startsWith('http'));

  // If segment has translated text AND real audio -> ok (fully complete)
  if (segment.transcriptText && hasRealAudio) {
    return 'ok';
  }

  // If segment has translated text but no real audio -> text_only
  if (segment.transcriptText) {
    return 'text_only';
  }

  // Segment exists but no text -> pending
  return 'pending';
}

// --- Sort helper (exported for testing) ---

export function sortScenesByStatus(
  scenes: StudioScene[],
  failedSceneIds: string[],
  completedSceneIds: string[],
  failedDetails: FailedSceneEntry[],
  segments: SceneSegment[],
  lang: string,
  batchProgress: BatchProgress | null,
): SortedScene[] {
  const statusOrder: Record<SceneSortStatus, number> = {
    failed: 0,
    stale: 1,
    pending: 2,
    completed: 3,
  };

  return scenes
    .map((scene): SortedScene => {
      const segment = segments.find((s) => s.sceneId === scene.id && s.language === lang) ?? null;
      const langStatus = computeSceneLanguageStatus(scene, segment, batchProgress);

      const isFailed = failedSceneIds.includes(scene.id) || langStatus === 'failed';
      const isCompleted = completedSceneIds.includes(scene.id) || langStatus === 'ok';
      const isStale = langStatus === 'stale';

      const sortStatus: SceneSortStatus = isFailed
        ? 'failed'
        : isStale
          ? 'stale'
          : isCompleted
            ? 'completed'
            : 'pending';

      const failedEntry = isFailed
        ? failedDetails.find((e) => e.sceneId === scene.id) ?? null
        : null;

      return { scene, status: sortStatus, languageStatus: langStatus, failedEntry };
    })
    .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}

// --- Component ---

export function LanguageSceneList({
  scenes,
  lang,
  completedSceneIds,
  segments,
  sessionId,
  onRetryScene,
  onResumeBatch,
  hasMissingScenes,
  onSceneClick,
  onRetranslateStale,
  onGenerateMissingAudio,
  onListenPreview,
  onFullPreview,
  onSubmitLanguage,
  onRequestAutoTranslation,
  isAutoTranslated = false,
}: LanguageSceneListProps) {
  // Use primitive state + useMemo to avoid infinite loop (array selectors)
  const batchState = useLanguageBatchStore((s) => s.progress);
  const failedDetailsState = useLanguageBatchStore((s) => s.failedSceneDetails);
  const retryingScenesState = useLanguageBatchStore((s) => s.retryingScenes);

  const failedSceneIds = useMemo(() => batchState[lang]?.failedScenes ?? [], [batchState, lang]);
  const failedDetails = useMemo(() => failedDetailsState[lang] ?? [], [failedDetailsState, lang]);
  const retryingScenes = useMemo(() => retryingScenesState[lang] ?? [], [retryingScenesState, lang]);
  const batchProgress = useMemo(() => batchState[lang] ?? null, [batchState, lang]);

  const sortedScenes = sortScenesByStatus(
    scenes, failedSceneIds, completedSceneIds, failedDetails,
    segments, lang, batchProgress,
  );

  // Compute batch action counts
  const staleCount = sortedScenes.filter((s) => s.languageStatus === 'stale').length;
  const missingAudioCount = sortedScenes.filter((s) => {
    const segment = segments.find((seg) => seg.sceneId === s.scene.id && seg.language === lang);
    return segment && segment.transcriptText && !segment.audioKey;
  }).length;

  const hasFailedOrProcessing = sortedScenes.some(
    (s) => s.languageStatus === 'failed' || s.languageStatus === 'processing',
  );

  // --- ManuallyEdited filtering state ---
  const [manualQueue, setManualQueue] = useState<Array<{ scene: StudioScene; segment: SceneSegment }>>([]);
  const [manualIndex, setManualIndex] = useState(0);
  const [approvedSceneIds, setApprovedSceneIds] = useState<string[]>([]);
  const [autoSceneIds, setAutoSceneIds] = useState<string[]>([]);

  const currentManualItem = manualIndex < manualQueue.length ? manualQueue[manualIndex] : null;

  // --- Submission checklist state ---
  const [showChecklist, setShowChecklist] = useState(false);

  const handleSubmitClick = useCallback(() => {
    if (sessionId) {
      setShowChecklist(true);
    } else {
      // Fallback to legacy callback if no sessionId
      onSubmitLanguage?.();
    }
  }, [sessionId, onSubmitLanguage]);

  const handleRetranslateStaleClick = useCallback(() => {
    const staleScenes = sortedScenes.filter((s) => s.languageStatus === 'stale');
    const autoIds: string[] = [];
    const manualItems: Array<{ scene: StudioScene; segment: SceneSegment }> = [];

    for (const { scene } of staleScenes) {
      const segment = segments.find((s) => s.sceneId === scene.id && s.language === lang);
      if (!segment) continue;

      if (segment.manuallyEdited) {
        manualItems.push({ scene, segment });
      } else {
        autoIds.push(scene.id);
      }
    }

    logger.info('LanguageSceneList', 'Retranslate stale clicked', {
      lang,
      autoCount: autoIds.length,
      manualCount: manualItems.length,
    });

    if (manualItems.length === 0) {
      // No manual edits — retranslate all directly
      onRetranslateStale?.(autoIds);
      return;
    }

    // Start the manual confirmation flow
    setAutoSceneIds(autoIds);
    setApprovedSceneIds([]);
    setManualQueue(manualItems);
    setManualIndex(0);
  }, [sortedScenes, segments, lang, onRetranslateStale]);

  const advanceManualQueue = useCallback((approved: boolean) => {
    if (currentManualItem && approved) {
      setApprovedSceneIds((prev) => [...prev, currentManualItem.scene.id]);
    }

    const nextIndex = manualIndex + 1;
    if (nextIndex >= manualQueue.length) {
      // All manual scenes processed — fire callback with final list
      const finalIds = approved && currentManualItem
        ? [...autoSceneIds, ...approvedSceneIds, currentManualItem.scene.id]
        : [...autoSceneIds, ...approvedSceneIds];

      setManualQueue([]);
      setManualIndex(0);

      if (finalIds.length > 0) {
        onRetranslateStale?.(finalIds);
      }
    } else {
      setManualIndex(nextIndex);
    }
  }, [manualIndex, manualQueue, currentManualItem, autoSceneIds, approvedSceneIds, onRetranslateStale]);

  return (
    <div data-testid="language-scene-list" className="space-y-3">
      {/* Auto-translation CTA — only for manually added languages */}
      {!isAutoTranslated && onRequestAutoTranslation && (
        <div className="rounded-lg border border-mer-soft bg-mer-soft p-4 space-y-2" data-testid="auto-translate-cta">
          <button
            data-testid="auto-translate-button"
            type="button"
            onClick={() => onRequestAutoTranslation(lang)}
            className="inline-flex items-center gap-2 rounded-md bg-mer px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616L18 9.381a1 1 0 01-1.447 1.382L15 9.654V14a1 1 0 01-1 1h-1v2a1 1 0 11-2 0v-2H9v2a1 1 0 11-2 0v-2H6a1 1 0 01-1-1V9.654L3.447 10.763A1 1 0 012 9.381l1.786-1.87-1.233-.616a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z" />
            </svg>
            Traduire automatiquement cette langue
          </button>
          <p className="text-xs text-mer">
            Traduction Standard (1,99&euro;) ou Pro (2,99&euro;) &mdash; tous les textes et audios sont g&eacute;n&eacute;r&eacute;s automatiquement
          </p>
        </div>
      )}

      {/* Resume button */}
      {hasMissingScenes && (
        <div className="rounded-lg border border-ocre-soft bg-ocre-soft p-4">
          <p className="text-sm text-ocre">
            Certaines scenes n&apos;ont pas encore ete traduites.
          </p>
          {onResumeBatch && (
          <button
            data-testid="resume-batch-button"
            type="button"
            onClick={onResumeBatch}
            className="mt-2 inline-flex items-center rounded-md bg-ocre px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Reprendre la traduction
          </button>
          )}
        </div>
      )}

      {/* Scene list */}
      {sortedScenes.map(({ scene, status, languageStatus, failedEntry }) => {
        if (status === 'failed' && failedEntry) {
          return (
            <div
              key={scene.id}
              data-testid={`scene-row-${scene.id}`}
              onClick={() => onSceneClick(scene.id)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSceneClick(scene.id); }}
            >
              <SceneRetryCard
                sceneId={scene.id}
                sceneTitle={scene.title}
                errorCode={failedEntry.errorCode}
                errorMessage={failedEntry.message}
                isRetrying={retryingScenes.includes(scene.id)}
                onRetry={onRetryScene ?? (() => {})}
              />
            </div>
          );
        }

        return (
          <div
            key={scene.id}
            data-testid={`scene-row-${scene.id}`}
            onClick={() => onSceneClick(scene.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSceneClick(scene.id); }}
            role="button"
            tabIndex={0}
            className={`flex items-center justify-between gap-3 rounded-lg border p-4 cursor-pointer transition hover:bg-paper-soft ${
              status === 'completed'
                ? 'border-olive-soft bg-olive-soft hover:opacity-90'
                : status === 'stale'
                  ? 'border-ocre-soft bg-ocre-soft hover:bg-ocre-soft'
                  : 'border-line bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              {status === 'completed' && (
                <svg className="h-5 w-5 text-success flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {status !== 'completed' && (
                <div className="h-5 w-5 rounded-full border-2 border-line flex-shrink-0" />
              )}
              <span className={`text-sm font-medium ${
                status === 'completed' ? 'text-ink' : 'text-ink-80'
              }`}>
                {(() => {
                  const seg = segments.find((s) => s.sceneId === scene.id && s.language === lang);
                  if (seg?.translatedTitle) {
                    return seg.translatedTitle;
                  }
                  const fallbackTitle = scene.title ?? `Scene ${scene.id}`;
                  return (
                    <span>
                      <span className="italic">{fallbackTitle}</span>
                      <span className="text-xs text-ink-40 ml-1">(non traduit)</span>
                    </span>
                  );
                })()}
              </span>
            </div>
            <LanguageStatusBadge status={languageStatus} />
          </div>
        );
      })}

      {/* Batch actions */}
      {(staleCount > 0 || missingAudioCount > 0) && (
        <>
          <hr className="border-line" />
          <div className="space-y-2" data-testid="batch-actions-section">
            <p className="text-sm font-medium text-ink-80">Actions rapides</p>
            <div className="flex flex-wrap gap-2">
              {staleCount > 0 && onRetranslateStale && (
                <button
                  data-testid="batch-retranslate-stale-button"
                  type="button"
                  onClick={handleRetranslateStaleClick}
                  className="inline-flex items-center rounded-md border border-ocre px-4 py-2 text-sm font-medium text-ocre hover:bg-ocre-soft"
                >
                  Re-traduire les scenes modifiees ({staleCount})
                </button>
              )}
              {missingAudioCount > 0 && onGenerateMissingAudio && (
                <button
                  data-testid="batch-generate-audio-button"
                  type="button"
                  onClick={onGenerateMissingAudio}
                  className="inline-flex items-center rounded-md border border-mer px-4 py-2 text-sm font-medium text-mer hover:bg-mer-soft"
                >
                  Generer les audio manquants ({missingAudioCount})
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main actions */}
      <hr className="border-line" />
      <div className="space-y-2" data-testid="main-actions-section">
        <p className="text-sm font-medium text-ink-80">Actions</p>
        <div className="flex flex-wrap gap-2">
          {onListenPreview && (
            <button
              data-testid="listen-preview-button"
              type="button"
              onClick={onListenPreview}
              className="inline-flex items-center rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-80 hover:bg-paper-soft"
            >
              Ecouter un extrait
            </button>
          )}
          {onFullPreview && (
            <button
              data-testid="full-preview-button"
              type="button"
              onClick={onFullPreview}
              className="inline-flex items-center rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-80 hover:bg-paper-soft"
            >
              Preview complete
            </button>
          )}
          {(onSubmitLanguage || sessionId) && (() => {
            const langConfig = LANGUAGE_CONFIG.find((c) => c.code === lang);
            const langLabel = langConfig?.label ?? lang.toUpperCase();
            const readiness = checkLanguageReadiness(scenes, segments, lang);
            const isDisabled = hasFailedOrProcessing || !readiness.ready;
            const disabledReason = hasFailedOrProcessing
              ? 'Corrigez les scenes en echec avant de soumettre'
              : !readiness.ready
                ? `${readiness.total - readiness.complete} scene(s) incomplete(s)`
                : '';

            return (
              <div className="relative group">
                <div className="flex flex-col items-start gap-1">
                  <button
                    data-testid="submit-language-button"
                    type="button"
                    onClick={handleSubmitClick}
                    disabled={isDisabled}
                    className="inline-flex items-center rounded-md bg-mer px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Soumettre la version {langLabel}
                  </button>
                  <span data-testid="submit-readiness-info" className={`text-xs ${readiness.ready ? 'text-success' : 'text-ocre'}`}>
                    {readiness.ready
                      ? `${readiness.complete}/${readiness.total} scenes — Texte \u2705 Audio \u2705`
                      : (() => {
                          const withText = readiness.scenes.filter(s => s.hasText).length;
                          const withAudio = readiness.scenes.filter(s => s.hasAudio).length;
                          const parts: string[] = [];
                          if (withText < readiness.total) parts.push(`Texte: ${withText}/${readiness.total}`);
                          else parts.push('Texte \u2705');
                          if (withAudio < readiness.total) parts.push(`Audio: ${withAudio}/${readiness.total}`);
                          else parts.push('Audio \u2705');
                          return `${readiness.complete}/${readiness.total} completes — ${parts.join(' | ')}`;
                        })()}
                  </span>
                </div>
                {isDisabled && disabledReason && (
                  <span
                    data-testid="submit-disabled-tooltip"
                    className="absolute bottom-full left-0 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white"
                  >
                    {disabledReason}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Submission checklist */}
      {showChecklist && sessionId && (
        <div data-testid="submission-checklist-section" className="mt-4">
          <SubmissionChecklist
            sessionId={sessionId}
            language={lang}
            scenes={scenes}
            segments={segments}
            onSubmitted={() => {
              setShowChecklist(false);
              onSubmitLanguage?.();
            }}
          />
        </div>
      )}

      {/* ManuallyEdited confirmation modal */}
      {currentManualItem && (
        <ManuallyEditedModal
          isOpen
          sceneName={currentManualItem.scene.title ?? `Scene ${currentManualItem.scene.id}`}
          editedTextPreview={currentManualItem.segment.transcriptText ?? ''}
          language={lang}
          onKeep={() => advanceManualQueue(false)}
          onUpdate={() => advanceManualQueue(true)}
        />
      )}
    </div>
  );
}
