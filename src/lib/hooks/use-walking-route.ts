import { useEffect, useState } from 'react';
import { getFullWalkingRoute, invalidatePoint } from '@/lib/routing';

interface WalkingRouteResult {
  /** Full polyline path combining all segments */
  path: { lat: number; lng: number }[];
  /** Per-anchor-pair polylines. segments[i] is the ORS path between
   *  input point i and i+1. Useful to find the on-route midpoint for
   *  inserting a waypoint visually on the actual walking path. */
  segments: { lat: number; lng: number }[][];
  /** Total walking distance in meters */
  totalDistanceMeters: number;
  /** Total walking duration in seconds */
  totalDurationSeconds: number;
  /** Whether routes are still loading */
  isLoading: boolean;
}

const EMPTY_RESULT: Omit<WalkingRouteResult, 'path' | 'segments'> = {
  totalDistanceMeters: 0,
  totalDurationSeconds: 0,
  isLoading: false,
};

/**
 * Hook that fetches walking routes between ordered points via OSRM.
 * Returns a combined path for rendering on a map.
 * Debounces requests to avoid hammering the API during drag operations.
 */
export function useWalkingRoute(
  points: { lat: number; lng: number }[],
): WalkingRouteResult {
  const [fetchedResult, setFetchedResult] = useState<{ key: string; value: WalkingRouteResult } | null>(null);

  // Serialized form is value-stable across renders → React's Object.is dep check
  // skips the effect when content is unchanged, even if `points` is a new array ref.
  const serialized = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');

  useEffect(() => {
    if (points.length < 2) return;

    let cancelled = false;
    const handle = setTimeout(() => {
      getFullWalkingRoute(points).then(({ segments, totalDistanceMeters, totalDurationSeconds }) => {
        if (cancelled) return;
        const combined: { lat: number; lng: number }[] = [];
        for (const seg of segments) {
          const startIdx = combined.length > 0 ? 1 : 0;
          for (let i = startIdx; i < seg.path.length; i++) combined.push(seg.path[i]);
        }
        setFetchedResult({
          key: serialized,
          value: {
            path: combined.length > 0 ? combined : points,
            segments: segments.map((s) => s.path),
            totalDistanceMeters,
            totalDurationSeconds,
            isLoading: false,
          },
        });
      });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  if (points.length < 2) return { ...EMPTY_RESULT, path: points, segments: [] };
  // Only return the cached fetch result if it matches the current points; otherwise show
  // straight-line fallback while the new fetch is pending.
  if (fetchedResult && fetchedResult.key === serialized) return fetchedResult.value;
  return { ...EMPTY_RESULT, path: points, segments: [], isLoading: true };
}

export { invalidatePoint };
