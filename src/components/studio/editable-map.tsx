'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tg } from '@murmure/design-system';
import type { StudioScene } from '@/types/studio';
import { useWalkingRoute, invalidatePoint } from '@/lib/hooks/use-walking-route';
import { simplifyPath, pathDistanceMeters, type LatLng } from '@/lib/path-utils';
import { TILE_URL, TILE_ATTRIBUTION } from '@/lib/maps/tile-config';
import { createNumberedIcon, createDotIcon } from '@/lib/maps/marker-icons';
import { FitToPoints } from '@/components/map/FitToPoints';

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  afterPoiIndex: number;
  order: number;
}

interface EditableMapProps {
  scenes: StudioScene[];
  waypoints: Waypoint[];
  onPoiDrag: (sceneId: string, lat: number, lng: number) => void;
  onWaypointDrag: (waypointId: string, lat: number, lng: number) => void;
  onWaypointAdd: (afterPoiIndex: number, lat: number, lng: number) => void;
  onWaypointInsert?: (afterPoiIndex: number, beforeOrder: number | null, afterOrder: number | null, lat: number, lng: number) => void;
  onWaypointDelete: (waypointId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onRouteInfo?: (distanceMeters: number, durationSeconds: number, path: LatLng[]) => void;
  height?: string;
  manualMode?: boolean;
  freehandMode?: boolean;
  onFreehandFinish?: (path: LatLng[]) => void;
  pathOverride?: LatLng[] | null;
  flyToCoords?: { lat: number; lng: number } | null;
}

const DEFAULT_FALLBACK = { center: [48.8566, 2.3522] as L.LatLngTuple, zoom: 12 };

// ─────────────────────────────────────────────────────────────────────────
// Sub-components

function MapClickHandler({
  onClick,
  onDblClick,
}: {
  onClick?: (lat: number, lng: number) => void;
  onDblClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => onClick?.(e.latlng.lat, e.latlng.lng),
    dblclick: (e) => onDblClick?.(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function FreehandHandler({
  enabled,
  onFinish,
}: {
  enabled: boolean;
  onFinish: (path: LatLng[]) => void;
}) {
  const map = useMap();
  const [draftPath, setDraftPath] = useState<L.LatLngTuple[]>([]);
  const isDrawingRef = useRef(false);
  const draftRef = useRef<L.LatLngTuple[]>([]);
  const lastPushRef = useRef(0);
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  // Disable pan while drawing.
  useEffect(() => {
    if (!enabled) return;
    map.dragging.disable();
    return () => { map.dragging.enable(); };
  }, [enabled, map]);

  useMapEvents({
    mousedown: (e) => {
      if (!enabled) return;
      isDrawingRef.current = true;
      const pt: L.LatLngTuple = [e.latlng.lat, e.latlng.lng];
      draftRef.current = [pt];
      lastPushRef.current = performance.now();
      setDraftPath([pt]);
    },
    mousemove: (e) => {
      if (!enabled || !isDrawingRef.current) return;
      const now = performance.now();
      if (now - lastPushRef.current < 30) return;
      lastPushRef.current = now;
      const pt: L.LatLngTuple = [e.latlng.lat, e.latlng.lng];
      draftRef.current.push(pt);
      setDraftPath(draftRef.current.slice());
    },
  });

  // mouseup may land outside the map container — listen on window.
  useEffect(() => {
    if (!enabled) return;
    const finish = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const raw = draftRef.current;
      draftRef.current = [];
      setDraftPath([]);
      if (raw.length < 2) return;
      const simplified = simplifyPath(raw.map(([lat, lng]) => ({ lat, lng })));
      onFinishRef.current(simplified);
    };
    window.addEventListener('mouseup', finish);
    window.addEventListener('touchend', finish);
    return () => {
      window.removeEventListener('mouseup', finish);
      window.removeEventListener('touchend', finish);
    };
  }, [enabled]);

  if (draftPath.length < 2) return null;
  return (
    <Polyline
      positions={draftPath}
      pathOptions={{
        color: tg.colors.grenadine,
        weight: 4,
        opacity: 0.7,
        interactive: false,
      }}
    />
  );
}

function CursorClass({ cursor }: { cursor: 'grab' | 'crosshair' }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = cursor;
    return () => { container.style.cursor = ''; };
  }, [map, cursor]);
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, lat, lng]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// Main component

export function EditableMap({
  scenes,
  waypoints,
  onPoiDrag,
  onWaypointDrag,
  onWaypointAdd,
  onWaypointInsert,
  onWaypointDelete,
  onMapClick,
  onRouteInfo,
  height = '350px',
  manualMode = false,
  freehandMode = false,
  onFreehandFinish,
  pathOverride = null,
  flyToCoords = null,
}: EditableMapProps) {
  const geoScenes = useMemo(
    () => scenes.filter((s) => s.latitude !== null && s.longitude !== null),
    [scenes],
  );
  const [selectedWp, setSelectedWp] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<string | null>(null);
  const hasOverride = !!(pathOverride && pathOverride.length > 1);
  // Belt-and-suspenders guard: Leaflet popups sometimes leak click events to the
  // map when a button inside is clicked, which in manual mode would re-add a
  // waypoint at the deleted point's location. We mark the last popup-action
  // timestamp and ignore map clicks within 250ms.
  const lastPopupActionRef = useRef(0);

  // ── Anchors & routing ──────────────────────────────────────────────────
  const anchors = useMemo(() => {
    const out: Array<
      | { kind: 'poi'; poiIndex: number; lat: number; lng: number }
      | { kind: 'waypoint'; poiIndex: number; waypoint: Waypoint; lat: number; lng: number }
    > = [];
    for (let i = 0; i < geoScenes.length; i++) {
      out.push({ kind: 'poi', poiIndex: i, lat: geoScenes[i].latitude!, lng: geoScenes[i].longitude! });
      const wps = waypoints
        .filter((w) => w.afterPoiIndex === i)
        .sort((a, b) => a.order - b.order);
      for (const wp of wps) {
        out.push({ kind: 'waypoint', poiIndex: i, waypoint: wp, lat: wp.lat, lng: wp.lng });
      }
    }
    return out;
  }, [geoScenes, waypoints]);

  const routePoints = useMemo(
    () => anchors.map((a) => ({ lat: a.lat, lng: a.lng })),
    [anchors],
  );

  const autoRoute = useWalkingRoute(manualMode || hasOverride ? [] : routePoints);

  const manualDistance = useMemo(() => {
    if (!manualMode || hasOverride) return 0;
    let d = 0;
    for (let i = 0; i < routePoints.length - 1; i++) {
      const a = routePoints[i];
      const b = routePoints[i + 1];
      const R = 6371000;
      const toRad = (x: number) => (x * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      d += R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }
    return d;
  }, [manualMode, hasOverride, routePoints]);

  const overrideDistance = useMemo(
    () => (hasOverride ? pathDistanceMeters(pathOverride!) : 0),
    [hasOverride, pathOverride],
  );

  const walkingPath = hasOverride ? pathOverride! : (manualMode ? routePoints : autoRoute.path);
  const routeLoading = hasOverride ? false : (manualMode ? false : autoRoute.isLoading);
  const totalDistanceMeters = hasOverride
    ? overrideDistance
    : (manualMode ? manualDistance : autoRoute.totalDistanceMeters);
  // Walking speed ~5 km/h (1.4 m/s) for manual & override.
  const totalDurationSeconds = hasOverride
    ? Math.round(overrideDistance / 1.4)
    : (manualMode ? Math.round(manualDistance / 1.4) : autoRoute.totalDurationSeconds);

  const walkingPositions = useMemo<L.LatLngTuple[]>(
    () => walkingPath.map((p) => [p.lat, p.lng]),
    [walkingPath],
  );

  const initialFitPoints = useMemo<L.LatLngTuple[]>(
    () => geoScenes.map((s) => [s.latitude!, s.longitude!]),
    [geoScenes],
  );

  // ── Midpoints (used for "drag dot to insert waypoint" UX) ──────────────
  const midpoints = useMemo(() => {
    if (hasOverride) return [];
    const out: Array<{
      key: string;
      afterPoiIndex: number;
      beforeOrder: number | null;
      afterOrder: number | null;
      position: L.LatLngTuple;
    }> = [];
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      const afterPoiIndex = a.poiIndex;
      const beforeOrder = a.kind === 'waypoint' ? a.waypoint.order : null;
      const afterOrder =
        b.kind === 'waypoint' && b.poiIndex === a.poiIndex ? b.waypoint.order : null;
      const seg = !manualMode ? autoRoute.segments[i] : undefined;
      let position: L.LatLngTuple;
      if (seg && seg.length >= 2) {
        const mid = seg[Math.floor(seg.length / 2)];
        position = [mid.lat, mid.lng];
      } else {
        position = [(a.lat + b.lat) / 2, (a.lng + b.lng) / 2];
      }
      out.push({
        key: `mid-${i}-${afterPoiIndex}-${beforeOrder ?? 'x'}-${afterOrder ?? 'x'}`,
        afterPoiIndex,
        beforeOrder,
        afterOrder,
        position,
      });
    }
    return out;
  }, [anchors, hasOverride, manualMode, autoRoute.segments]);

  // ── Route info callback ────────────────────────────────────────────────
  const onRouteInfoRef = useRef(onRouteInfo);
  useEffect(() => { onRouteInfoRef.current = onRouteInfo; }, [onRouteInfo]);
  useEffect(() => {
    if (!routeLoading && totalDistanceMeters > 0 && onRouteInfoRef.current) {
      onRouteInfoRef.current(totalDistanceMeters, totalDurationSeconds, walkingPath);
    }
  }, [routeLoading, totalDistanceMeters, totalDurationSeconds, walkingPath]);

  // ── Click / dblclick handlers (added as waypoint or POI placement) ────
  const handleMapClick = useCallback((lat: number, lng: number) => {
    // Ignore clicks that immediately follow a popup button press (waypoint delete,
    // POI link, etc.) — Leaflet popups occasionally let the click bubble through.
    if (Date.now() - lastPopupActionRef.current < 250) return;
    setSelectedWp(null);
    setSelectedPoi(null);
    if (freehandMode || hasOverride) return;
    if (onMapClick) {
      onMapClick(lat, lng);
      return;
    }
    if (manualMode && geoScenes.length >= 2) {
      let bestIndex = 0;
      let bestDist = Infinity;
      for (let i = 0; i < geoScenes.length - 1; i++) {
        const dist = distToSegment(
          lat, lng,
          geoScenes[i].latitude!, geoScenes[i].longitude!,
          geoScenes[i + 1].latitude!, geoScenes[i + 1].longitude!,
        );
        if (dist < bestDist) { bestDist = dist; bestIndex = i; }
      }
      onWaypointAdd(bestIndex, lat, lng);
    }
  }, [onMapClick, manualMode, geoScenes, onWaypointAdd, freehandMode, hasOverride]);

  const handleMapDblClick = useCallback((lat: number, lng: number) => {
    if (geoScenes.length < 2 || hasOverride || freehandMode) return;
    let bestIndex = 0;
    let bestDist = Infinity;
    for (let i = 0; i < geoScenes.length - 1; i++) {
      const dist = distToSegment(
        lat, lng,
        geoScenes[i].latitude!, geoScenes[i].longitude!,
        geoScenes[i + 1].latitude!, geoScenes[i + 1].longitude!,
      );
      if (dist < bestDist) { bestDist = dist; bestIndex = i; }
    }
    onWaypointAdd(bestIndex, lat, lng);
  }, [geoScenes, onWaypointAdd, hasOverride, freehandMode]);

  const handlePolylineClick = useCallback((e: L.LeafletMouseEvent) => {
    if (Date.now() - lastPopupActionRef.current < 250) return;
    if (geoScenes.length < 2 || hasOverride || freehandMode) return;
    const { lat, lng } = e.latlng;
    let bestIndex = 0;
    let bestDist = Infinity;
    for (let i = 0; i < geoScenes.length - 1; i++) {
      const dist = distToSegment(
        lat, lng,
        geoScenes[i].latitude!, geoScenes[i].longitude!,
        geoScenes[i + 1].latitude!, geoScenes[i + 1].longitude!,
      );
      if (dist < bestDist) { bestDist = dist; bestIndex = i; }
    }
    onWaypointAdd(bestIndex, lat, lng);
  }, [geoScenes, onWaypointAdd, hasOverride, freehandMode]);

  const handlePoiDrag = useCallback((sceneId: string, lat: number, lng: number) => {
    const scene = geoScenes.find((s) => s.id === sceneId);
    if (scene?.latitude && scene?.longitude) {
      invalidatePoint(scene.latitude, scene.longitude);
    }
    onPoiDrag(sceneId, lat, lng);
  }, [geoScenes, onPoiDrag]);

  const handleWaypointDragEnd = useCallback((wpId: string, lat: number, lng: number) => {
    const wp = waypoints.find((w) => w.id === wpId);
    if (wp) invalidatePoint(wp.lat, wp.lng);
    onWaypointDrag(wpId, lat, lng);
    setSelectedWp(null);
  }, [waypoints, onWaypointDrag]);

  const handleDeleteWaypoint = useCallback((wpId: string) => {
    lastPopupActionRef.current = Date.now();
    setSelectedWp(null);
    onWaypointDelete(wpId);
  }, [onWaypointDelete]);

  const cursor: 'grab' | 'crosshair' = (freehandMode || onMapClick) ? 'crosshair' : 'grab';
  const isFullscreen = height === '100%';

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={DEFAULT_FALLBACK.center}
        zoom={DEFAULT_FALLBACK.zoom}
        style={{ height: '100%', width: '100%', borderRadius: isFullscreen ? '0' : '8px' }}
        scrollWheelZoom={isFullscreen}
        doubleClickZoom={false}
        zoomControl
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FitToPoints
          points={initialFitPoints}
          padding={40}
          singleZoom={16}
          fallback={DEFAULT_FALLBACK}
          oneShot
        />
        <CursorClass cursor={cursor} />
        {flyToCoords && <FlyTo lat={flyToCoords.lat} lng={flyToCoords.lng} />}

        {!freehandMode && (
          <MapClickHandler onClick={handleMapClick} onDblClick={handleMapDblClick} />
        )}
        <FreehandHandler enabled={freehandMode} onFinish={onFreehandFinish ?? (() => {})} />

        {/* Walking route polyline — clickable to add waypoints (auto mode only).
            Override + manual modes use grenadine to signal "your own line". */}
        {walkingPositions.length > 1 && (
          <Polyline
            positions={walkingPositions}
            pathOptions={{
              color: hasOverride || manualMode ? tg.colors.grenadine : tg.colors.mer,
              weight: hasOverride ? 5 : (manualMode ? 4 : 5),
              opacity: routeLoading ? 0.4 : 0.9,
              dashArray: manualMode && !hasOverride ? '6 6' : undefined,
              interactive: !hasOverride && !freehandMode,
              bubblingMouseEvents: false,
            }}
            eventHandlers={!hasOverride && !freehandMode ? { click: handlePolylineClick } : undefined}
          />
        )}

        {/* Invisible wider polyline for easier click target in auto/manual modes.
            Kept narrow (10px) so it doesn't eclipse 14–18px waypoint markers. */}
        {walkingPositions.length > 1 && !hasOverride && !freehandMode && (
          <Polyline
            positions={walkingPositions}
            pathOptions={{
              color: tg.colors.mer,
              weight: 10,
              opacity: 0,
              interactive: true,
              bubblingMouseEvents: false,
            }}
            eventHandlers={{ click: handlePolylineClick }}
          />
        )}

        {/* POI markers — draggable, clickable */}
        {geoScenes.map((scene, index) => {
          const isSelected = selectedPoi === scene.id;
          const markerNumber = typeof scene.sceneIndex === 'number' ? scene.sceneIndex + 1 : index + 1;
          const icon = createNumberedIcon({
            number: markerNumber,
            fillColor: isSelected ? tg.colors.ardoise : tg.colors.mer,
            textColor: '#ffffff',
            borderColor: '#ffffff',
            borderWidth: isSelected ? 3 : 2,
            size: 28,
            fontSize: 12,
          });
          return (
            <Marker
              key={scene.id}
              position={[scene.latitude!, scene.longitude!]}
              icon={icon}
              draggable
              title={`${markerNumber}. ${scene.title ?? 'Scene'}`}
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  handlePoiDrag(scene.id, lat, lng);
                },
                click: () => {
                  setSelectedPoi(isSelected ? null : scene.id);
                  setSelectedWp(null);
                },
              }}
            />
          );
        })}

        {/* POI info popup — standalone, auto-opens when selectedPoi is set. */}
        {selectedPoi && (() => {
          const scene = geoScenes.find((s) => s.id === selectedPoi);
          if (!scene?.latitude || !scene?.longitude) return null;
          const lat = scene.latitude;
          const lng = scene.longitude;
          const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
          const gmapsUrl = `https://www.google.com/maps/@${lat},${lng},18z`;
          const streetViewUrl = `https://www.google.com/maps?layer=c&cbll=${lat},${lng}`;
          return (
            <Popup
              position={[lat, lng]}
              autoPan={false}
              eventHandlers={{ remove: () => setSelectedPoi((cur) => (cur === scene.id ? null : cur)) }}
            >
              <div style={{ minWidth: '160px', padding: '2px 0' }}>
                <p style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: tg.colors.ink }}>
                  {scene.title ?? 'POI'}
                </p>
                <p style={{ fontSize: '11px', color: tg.colors.ink60, marginBottom: '8px' }}>
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <a href={osmUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: tg.colors.mer, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '14px' }}>&#x1F5FA;&#xFE0F;</span> Voir sur OpenStreetMap
                  </a>
                  <a href={streetViewUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: tg.colors.mer, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '14px' }}>&#x1F6B6;</span> Street View
                  </a>
                  <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: tg.colors.mer, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '14px' }}>&#x1F4CD;</span> Google Maps
                  </a>
                </div>
              </div>
            </Popup>
          );
        })()}

        {/* Midpoint dots — drag one to insert a waypoint between two anchors. */}
        {!hasOverride && !freehandMode && onWaypointInsert && midpoints.map((mp) => (
          <Marker
            key={mp.key}
            position={mp.position}
            icon={createDotIcon({
              fillColor: tg.colors.grenadine,
              opacity: 0.6,
              borderColor: '#ffffff',
              borderWidth: 1.5,
              size: 12,
              cursor: 'grab',
            })}
            draggable
            title="Glissez pour ajouter un point ici"
            zIndexOffset={-200}
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = (e.target as L.Marker).getLatLng();
                onWaypointInsert(mp.afterPoiIndex, mp.beforeOrder, mp.afterOrder, lat, lng);
              },
            }}
          />
        ))}

        {/* Waypoint markers — hidden when override is active. */}
        {!hasOverride && waypoints.map((wp) => {
          const isSelected = selectedWp === wp.id;
          const icon = createDotIcon({
            fillColor: isSelected
              ? tg.colors.danger
              : (manualMode ? tg.colors.grenadine : tg.colors.ink60),
            borderColor: '#ffffff',
            borderWidth: 2,
            size: manualMode ? 22 : 18,
            cursor: 'grab',
          });
          return (
            <Marker
              key={wp.id}
              position={[wp.lat, wp.lng]}
              icon={icon}
              draggable
              title="Point de passage"
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  handleWaypointDragEnd(wp.id, lat, lng);
                },
                click: () => setSelectedWp(isSelected ? null : wp.id),
              }}
            />
          );
        })}

        {/* Waypoint delete popup — standalone, auto-opens when selectedWp is set. */}
        {!hasOverride && selectedWp && (() => {
          const wp = waypoints.find((w) => w.id === selectedWp);
          if (!wp) return null;
          return (
            <Popup
              position={[wp.lat, wp.lng]}
              autoPan={false}
              eventHandlers={{ remove: () => setSelectedWp((cur) => (cur === wp.id ? null : cur)) }}
            >
              <div style={{ minWidth: '140px', padding: '2px 0' }}>
                <p style={{ fontWeight: 600, fontSize: '12px', marginBottom: '2px', color: tg.colors.ink }}>
                  Point de passage
                </p>
                <p style={{ fontSize: '11px', color: tg.colors.ink60, marginBottom: '8px' }}>
                  Glissez le point sur la carte pour le déplacer.
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteWaypoint(wp.id);
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px', color: 'white', fontWeight: 600, border: 'none', background: tg.colors.danger, borderRadius: '4px', cursor: 'pointer', width: '100%' }}
                >
                  Supprimer
                </button>
              </div>
            </Popup>
          );
        })()}
      </MapContainer>
    </div>
  );
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
}
