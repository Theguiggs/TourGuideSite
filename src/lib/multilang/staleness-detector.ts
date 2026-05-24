/**
 * Staleness Detection — pure functions for detecting stale translations.
 *
 * A segment is "stale" when the source scene's TEXT changed after the segment
 * was last translated, detected by comparing source-text hashes. A scene's
 * updatedAt also bumps on non-text edits (GPS, photos, audio), so the old
 * date comparison produced false positives and has been removed.
 *
 * All functions are pure — no side effects, no backend calls.
 */

import type { SceneSegment, StudioScene } from '@/types/studio';
import { hashSourceText } from '@/types/studio';

// --- Types ---

export interface StaleSegmentInfo {
  segmentId: string;
  sceneId: string;
  language: string;
}

export interface SourceHashUpdate {
  segmentId: string;
  sourceTextHash: string;
}

// --- Pure functions ---

/**
 * Returns true if the segment's translation is stale relative to the source scene.
 *
 * Content-based: stale only when the source TEXT hash differs from the one
 * captured at translation time. When `sourceTextHash` is absent (legacy segment
 * or field not loaded by an out-of-date client), the segment is treated as NOT
 * stale rather than guessed from dates.
 */
export function isSegmentStale(segment: SceneSegment, sourceScene: StudioScene): boolean {
  if (segment.sourceTextHash == null) return false;
  return segment.sourceTextHash !== hashSourceText(sourceScene.transcriptText, sourceScene.title);
}

/**
 * Returns all stale segments with their identifiers.
 * For each segment, finds the matching source scene by `sceneId`.
 * Segments whose source scene is not found are skipped (not considered stale).
 */
export function getStaleSegments(
  segments: SceneSegment[],
  scenes: StudioScene[],
): StaleSegmentInfo[] {
  const sceneMap = new Map<string, StudioScene>();
  for (const scene of scenes) {
    sceneMap.set(scene.id, scene);
  }

  const stale: StaleSegmentInfo[] = [];
  for (const segment of segments) {
    const sourceScene = sceneMap.get(segment.sceneId);
    if (!sourceScene) continue;
    if (isSegmentStale(segment, sourceScene)) {
      stale.push({
        segmentId: segment.id,
        sceneId: segment.sceneId,
        language: segment.language,
      });
    }
  }
  return stale;
}

/**
 * Computes the source-text-hash updates needed to "dismiss" staleness without
 * re-translating — i.e. mark each segment as up-to-date relative to its CURRENT
 * source scene. Because staleness is detected by hash comparison, clearing the
 * flag means rewriting `sourceTextHash` to the present source hash. (Bumping
 * `sourceUpdatedAt` alone is a no-op under hash-based detection.)
 *
 * Segments whose source scene is not found are skipped.
 */
export function getSourceHashUpdates(
  staleSegmentIds: string[],
  segments: SceneSegment[],
  scenes: StudioScene[],
): SourceHashUpdate[] {
  const sceneMap = new Map<string, StudioScene>();
  for (const scene of scenes) {
    sceneMap.set(scene.id, scene);
  }

  const updates: SourceHashUpdate[] = [];
  for (const id of staleSegmentIds) {
    const segment = segments.find((s) => s.id === id);
    if (!segment) continue;
    const scene = sceneMap.get(segment.sceneId);
    if (!scene) continue;
    updates.push({
      segmentId: id,
      sourceTextHash: hashSourceText(scene.transcriptText, scene.title),
    });
  }
  return updates;
}

/**
 * Returns the count of stale segments grouped by language.
 * Example: `{ en: 3, es: 1 }`
 */
export function getStaleCountByLanguage(
  segments: SceneSegment[],
  scenes: StudioScene[],
): Record<string, number> {
  const staleSegments = getStaleSegments(segments, scenes);
  const counts: Record<string, number> = {};
  for (const info of staleSegments) {
    counts[info.language] = (counts[info.language] ?? 0) + 1;
  }
  return counts;
}
