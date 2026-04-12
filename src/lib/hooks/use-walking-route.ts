import { useEffect, useState, useRef } from 'react';
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

/**
 * Hook that fetches walking routes between ordered points via OSRM.
 * Returns a combined path for rendering on a map.
 * Debounces requests to avoid hammering the API during drag operations.
 */
export function useWalkingRoute(
  points: { lat: number; lng: number }[],
): WalkingRouteResult {
  const [result, setResult] = useState<WalkingRouteResult>({
    path: points,
    totalDistanceMeters: 0,
    totalDurationSeconds: 0,
    isLoading: false,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPointsRef = useRef<string>('');

  useEffect(() => {
    if (points.length < 2) {
      setResult({ path: points, totalDistanceMeters: 0, totalDurationSeconds: 0, isLoading: false });
      return;
    }

    // Serialize points to detect actual changes
    const serialized = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';');
    if (serialized === prevPointsRef.current) return;
    prevPointsRef.current = serialized;

    // Show straight lines immediately while loading
    setResult((prev) => ({ ...prev, path: points, isLoading: true }));

    // Debounce to avoid spamming during drag
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      let cancelled = false;

      getFullWalkingRoute(points).then(({ segments, totalDistanceMeters, totalDurationSeconds }) => {
        if (cancelled) return;
        // Combine all segment paths, avoiding duplicate points at junctions
        const combined: { lat: number; lng: number }[] = [];
        for (const seg of segments) {
          const startIdx = combined.length > 0 ? 1 : 0; // skip first point (duplicate of prev segment end)
          for (let i = startIdx; i < seg.path.length; i++) {
            combined.push(seg.path[i]);
          }
        }
        setResult({
          path: combined.length > 0 ? combined : points,
          totalDistanceMeters,
          totalDurationSeconds,
          isLoading: false,
        });
      });

      return () => { cancelled = true; };
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [points]);

  return result;
}

/** Helper to call when a point was dragged (invalidates route cache for that point) */
export { invalidatePoint };
