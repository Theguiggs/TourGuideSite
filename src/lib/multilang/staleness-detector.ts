/**
 * Staleness Detection — pure functions for detecting stale translations.
 *
 * A segment is "stale" when the source scene was modified after the segment
 * was last translated (i.e. sourceScene.updatedAt > segment.sourceUpdatedAt).
 *
 * All functions are pure — no side effects, no backend calls.
 */

import type { SceneSegment, StudioScene } from '@/types/studio';

// --- Types ---

export interface StaleSegmentInfo {
  segmentId: string;
  sceneId: string;
  language: string;
}

// --- Pure functions ---

/**
 * Returns true if the segment's translation is stale relative to the source scene.
 *
 * - If `segment.sourceUpdatedAt` is null, the segment was never translated → not stale.
 * - Otherwise, stale when the source scene was updated after the translation snapshot.
 */
export function isSegmentStale(segment: SceneSegment, sourceScene: StudioScene): boolean {
  if (!segment.sourceUpdatedAt) return false;
  return new Date(sourceScene.updatedAt) > new Date(segment.sourceUpdatedAt);
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
