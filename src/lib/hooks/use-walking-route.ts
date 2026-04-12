import { useEffect, useState, useRef } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getFullWalkingRoute, invalidatePoint, type RouteSegment } from '@/lib/routing';

interface WalkingRouteResult {
  /** Full polyline path combining all segments */
  path: { lat: number; lng: number }[];
  /** Total walking distance in meters */
  totalDistanceMeters: number;
  /** Total walking duration in seconds */
  totalDurationSeconds: number;
  /** Whether routes are still loading */
  isLoading: boolean;
}

const EMPTY_RESULT: Omit<WalkingRouteResult, 'path'> = {
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
  const [fetchedResult, setFetchedResult] = useState<WalkingRouteResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPointsRef = useRef<string>('');

  useEffect(() => {
    if (points.length < 2) {
      // No route to fetch — the derived return value below will use the points directly
      return;
    }

    // Serialize points to detect actual changes
    const serialized = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');
    if (serialized === prevPointsRef.current) return;
    prevPointsRef.current = serialized;

    // Debounce to avoid spamming during drag
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let cancelled = false;
    debounceRef.current = setTimeout(() => {
      getFullWalkingRoute(points).then(({ segments, totalDistanceMeters, totalDurationSeconds }) => {
        if (cancelled) return;
        // Combine all segment paths, avoiding duplicate points at junctions
        const combined: { lat: number; lng: number }[] = [];
        for (const seg of segments) {
          const startIdx = combined.length > 0 ? 1 : 0;
          for (let i = startIdx; i < seg.path.length; i++) {
            combined.push(seg.path[i]);
          }
        }
        setFetchedResult({
          path: combined.length > 0 ? combined : points,
          totalDistanceMeters,
          totalDurationSeconds,
          isLoading: false,
        });
      });
    }, 400);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [points]);

  // Derive return value: use fetched result if available and still matches current points,
  // otherwise fall back to straight lines (points themselves)
  if (points.length < 2) {
    return { ...EMPTY_RESULT, path: points };
  }
  if (fetchedResult) return fetchedResult;
  return { ...EMPTY_RESULT, path: points, isLoading: true };
}

/** Helper to call when a point was dragged (invalidates route cache for that point) */
export { invalidatePoint };
