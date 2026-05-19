'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tg } from '@murmure/design-system';
import type { StudioScene } from '@/types/studio';
import { useWalkingRoute } from '@/lib/hooks/use-walking-route';
import type { LatLng } from '@/lib/path-utils';
import type { Waypoint } from '@/components/studio/editable-map';
import { TILE_URL, TILE_ATTRIBUTION } from '@/lib/maps/tile-config';
import { createNumberedIcon } from '@/lib/maps/marker-icons';
import { FitToPoints } from '@/components/map/FitToPoints';

interface PreviewMapProps {
  scenes: StudioScene[];
  /** Optional waypoints saved by the itinerary editor (localStorage on guide side). */
  waypoints?: Waypoint[];
  /** When true, route is drawn as straight lines through POIs + waypoints (no ORS). */
  manualMode?: boolean;
  /** When provided, this exact path overrides auto/manual routing (e.g. GPX import). */
  pathOverride?: LatLng[] | null;
  /** Pre-computed polyline (guide's persisted route) — takes precedence over everything. */
  customPath?: LatLng[] | null;
}

export function PreviewMap({
  scenes,
  waypoints = [],
  manualMode = false,
  pathOverride = null,
  customPath = null,
}: PreviewMapProps) {
  const geoScenes = useMemo(
    () => scenes.filter((s) => s.latitude !== null && s.longitude !== null),
    [scenes],
  );

  const hasCustomPath = !!(customPath && customPath.length > 1);
  const hasOverride = !!(pathOverride && pathOverride.length > 1);

  // Build ordered anchors (POIs + waypoints) — same logic as EditableMap.
  const anchors = useMemo(() => {
    const out: LatLng[] = [];
    for (let i = 0; i < geoScenes.length; i++) {
      out.push({ lat: geoScenes[i].latitude!, lng: geoScenes[i].longitude! });
      const wps = waypoints
        .filter((w) => w.afterPoiIndex === i)
        .sort((a, b) => a.order - b.order);
      for (const wp of wps) {
        out.push({ lat: wp.lat, lng: wp.lng });
      }
    }
    return out;
  }, [geoScenes, waypoints]);

  // Only call useWalkingRoute when needed (skip for custom/manual/override modes).
  const autoRoute = useWalkingRoute(hasCustomPath || manualMode || hasOverride ? [] : anchors);

  const walkingPath = hasCustomPath
    ? customPath!
    : hasOverride
      ? pathOverride!
      : manualMode
        ? anchors
        : autoRoute.path;
  const isLoading = hasCustomPath || hasOverride ? false : manualMode ? false : autoRoute.isLoading;

  const walkingPositions = useMemo<L.LatLngTuple[]>(
    () => walkingPath.map((p) => [p.lat, p.lng]),
    [walkingPath],
  );

  const points = useMemo<L.LatLngTuple[]>(
    () => geoScenes.map((s) => [s.latitude!, s.longitude!]),
    [geoScenes],
  );

  if (geoScenes.length === 0) return null;

  const center: L.LatLngTuple = [geoScenes[0].latitude!, geoScenes[0].longitude!];
  const routeColor = hasCustomPath || hasOverride || manualMode ? tg.colors.grenadine : tg.colors.mer;

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ height: '280px', width: '100%', borderRadius: `${tg.radius.sm}px` }}
      scrollWheelZoom={false}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitToPoints points={points} />
      {walkingPositions.length > 1 && (
        <Polyline
          positions={walkingPositions}
          pathOptions={{
            color: routeColor,
            weight: 4,
            opacity: isLoading ? 0.4 : 0.7,
          }}
        />
      )}
      {geoScenes.map((scene, index) => (
        <Marker
          key={scene.id}
          position={[scene.latitude!, scene.longitude!]}
          icon={createNumberedIcon({ number: index + 1, fillColor: tg.colors.mer })}
          title={scene.title ?? `Scene ${index + 1}`}
        />
      ))}
    </MapContainer>
  );
}
