'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface FitToPointsProps {
  points: L.LatLngTuple[];
  padding?: number;
  singleZoom?: number;
  fallback?: { center: L.LatLngTuple; zoom: number };
  /**
   * When true, only fit once after points become non-empty. Subsequent
   * point changes won't move the map (useful for edit modes where the
   * user is dragging markers and expects the view to stay put).
   */
  oneShot?: boolean;
}

export function FitToPoints({
  points,
  padding = 40,
  singleZoom = 16,
  fallback,
  oneShot = false,
}: FitToPointsProps) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (oneShot && fittedRef.current) return;
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [padding, padding] });
      fittedRef.current = true;
    } else if (points.length === 1) {
      map.setView(points[0], singleZoom);
      fittedRef.current = true;
    } else if (fallback) {
      map.setView(fallback.center, fallback.zoom);
    }
  }, [map, points, padding, singleZoom, fallback, oneShot]);

  return null;
}
