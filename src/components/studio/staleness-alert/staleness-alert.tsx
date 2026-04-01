'use client';

import { useState, useCallback } from 'react';
import type { SceneSegment, StudioScene } from '@/types/studio';
import { ManuallyEditedModal } from './manually-edited-modal';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'StalenessAlert';

// --- Types ---

export interface StaleSceneInfo {
  segmentId: string;
  sceneId: string;
  segment: SceneSegment;
  scene: StudioScene;
}

export interface StalenessAlertProps {
  staleCount: number;
  staleSegmentIds: string[];
  onRetranslate: (segmentIds: string[]) => void;
  /** Segments and scenes needed for manuallyEdited filtering */
  segments?: SceneSegment[];
  scenes?: StudioScene[];
}

// --- Helpers ---

/** Build StaleSceneInfo array from segment IDs + full segments/scenes arrays */
export function buildStaleSceneInfos(
  staleSegmentIds: string[],
  segments: SceneSegment[],
  scenes: StudioScene[],
): StaleSceneInfo[] {
  const sceneMap = new Map<string, StudioScene>();
  for (const scene of scenes) {
    sceneMap.set(scene.id, scene);
  }

  const infos: StaleSceneInfo[] = [];
  for (const segId of staleSegmentIds) {
    const segment = segments.find((s) => s.id === segId);
    if (!segment) continue;
    const scene = sceneMap.get(segment.sceneId);
    if (!scene) continue;
    infos.push({ segmentId: segId, sceneId: segment.sceneId, segment, scene });
  }
  return infos;
}

// --- Component ---

/**
 * Banner alerting the guide that some translations are stale
 * because the source text was modified after the last translation.
 *
 * When segments/scenes are provided, filters manually-edited scenes
 * through a confirmation modal before re-translating.
 *
 * Renders nothing when staleCount === 0.
 */
export function StalenessAlert({
  staleCount,
  staleSegmentIds,
  onRetranslate,
  segments,
  scenes,
}: StalenessAlertProps) {
  const [manualQueue, setManualQueue] = useState<StaleSceneInfo[]>([]);
  const [manualIndex, setManualIndex] = useState(0);
  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  const [autoIds, setAutoIds] = useState<string[]>([]);

  if (staleCount === 0) return null;

  const currentManualItem = manualIndex < manualQueue.length ? manualQueue[manualIndex] : null;

  const handleRetranslateClick = () => {
    // If segments/scenes not provided, fall back to simple behavior
    if (!segments || !scenes) {
      onRetranslate(staleSegmentIds);
      return;
    }

    const infos = buildStaleSceneInfos(staleSegmentIds, segments, scenes);
    const auto: string[] = [];
    const manual: StaleSceneInfo[] = [];

    for (const info of infos) {
      if (info.segment.manuallyEdited) {
        manual.push(info);
      } else {
        auto.push(info.segmentId);
      }
    }

    logger.info(SERVICE_NAME, 'Retranslate stale clicked', {
      autoCount: auto.length,
      manualCount: manual.length,
    });

    if (manual.length === 0) {
      onRetranslate(auto);
      return;
    }

    // Start manual confirmation flow
    setAutoIds(auto);
    setApprovedIds([]);
    setManualQueue(manual);
    setManualIndex(0);
  };

  const advanceManualQueue = (approved: boolean) => {
    const current = manualQueue[manualIndex];
    const newApproved = approved && current
      ? [...approvedIds, current.segmentId]
      : [...approvedIds];

    const nextIndex = manualIndex + 1;
    if (nextIndex >= manualQueue.length) {
      // All manual scenes processed
      const finalIds = [...autoIds, ...newApproved];
      setManualQueue([]);
      setManualIndex(0);
      setApprovedIds([]);
      setAutoIds([]);

      if (finalIds.length > 0) {
        onRetranslate(finalIds);
      }
    } else {
      setApprovedIds(newApproved);
      setManualIndex(nextIndex);
    }
  };

  return (
    <>
      <div
        data-testid="staleness-alert"
        role="alert"
        className="flex items-center justify-between gap-4 rounded-lg border border-orange-300 bg-orange-50 p-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">&#9888;&#65039;</span>
          <p className="text-sm font-medium text-orange-800">
            {staleCount} {staleCount === 1 ? 'scene modifiee' : 'scenes modifiees'} depuis la derniere traduction
          </p>
        </div>
        <button
          data-testid="staleness-retranslate-button"
          type="button"
          onClick={handleRetranslateClick}
          className="inline-flex items-center whitespace-nowrap rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          Mettre a jour {staleCount} {staleCount === 1 ? 'traduction' : 'traductions'}
        </button>
      </div>

      {currentManualItem && (
        <ManuallyEditedModal
          isOpen
          sceneName={currentManualItem.scene.title ?? `Scene ${currentManualItem.sceneId}`}
          editedTextPreview={currentManualItem.segment.transcriptText ?? ''}
          language={currentManualItem.segment.language}
          onKeep={() => advanceManualQueue(false)}
          onUpdate={() => advanceManualQueue(true)}
        />
      )}
    </>
  );
}
