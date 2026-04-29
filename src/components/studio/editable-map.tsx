'use client';

import { useCallback, useRef, useMemo, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF, InfoWindowF } from '@react-google-maps/api';
import { tg } from '@tourguide/design-system';
import type { StudioScene } from '@/types/studio';
import { useWalkingRoute, invalidatePoint } from '@/lib/hooks/use-walking-route';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  afterPoiIndex: number;
}

interface EditableMapProps {
  scenes: StudioScene[];
  waypoints: Waypoint[];
  onPoiDrag: (sceneId: string, lat: number, lng: number) => void;
  onWaypointDrag: (waypointId: string, lat: number, lng: number) => void;
  onWaypointAdd: (afterPoiIndex: number, lat: number, lng: number) => void;
  onWaypointDelete: (waypointId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  /** Called when route distance/duration is computed */
  onRouteInfo?: (distanceMeters: number, durationSeconds: number) => void;
  /** Map container height — defaults to '350px', use '100%' for fullscreen */
  height?: string;
}

export function EditableMap({ scenes, waypoints, onPoiDrag, onWaypointDrag, onWaypointAdd, onWaypointDelete, onMapClick, onRouteInfo, height = '350px' }: EditableMapProps) {
  const geoScenes = scenes.filter((s) => s.latitude !== null && s.longitude !== null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedWp, setSelectedWp] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_KEY });

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (geoScenes.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      geoScenes.forEach((s) => bounds.extend({ lat: s.latitude!, lng: s.longitude! }));
      map.fitBounds(bounds, 40);
    } else if (geoScenes.length === 1) {
      map.setCenter({ lat: geoScenes[0].latitude!, lng: geoScenes[0].longitude! });
      map.setZoom(16);
    } else {
      // No geolocated POI yet — center on a default (Paris) at city zoom so the
      // user can still pan and click to place the first point.
      map.setCenter({ lat: 48.8566, lng: 2.3522 });
      map.setZoom(12);
    }
  }, [geoScenes]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    // Close any open popups
    setSelectedWp(null);
    setSelectedPoi(null);
    if (!e.latLng || !onMapClick) return;
    onMapClick(e.latLng.lat(), e.latLng.lng());
  }, [onMapClick]);

  // Click on route polyline → add waypoint at that position
  const handlePolylineClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || geoScenes.length < 2) return;
    const clickLat = e.latLng.lat();
    const clickLng = e.latLng.lng();
    // Find nearest segment between POIs
    let bestIndex = 0;
    let bestDist = Infinity;
    for (let i = 0; i < geoScenes.length - 1; i++) {
      const dist = distToSegment(
        clickLat, clickLng,
        geoScenes[i].latitude!, geoScenes[i].longitude!,
        geoScenes[i + 1].latitude!, geoScenes[i + 1].longitude!,
      );
      if (dist < bestDist) { bestDist = dist; bestIndex = i; }
    }
    onWaypointAdd(bestIndex, clickLat, clickLng);
  }, [geoScenes, onWaypointAdd]);

  const handlePoiDrag = useCallback((sceneId: string, lat: number, lng: number) => {
    const scene = geoScenes.find((s) => s.id === sceneId);
    if (scene?.latitude && scene?.longitude) {
      invalidatePoint(scene.latitude, scene.longitude);
    }
    onPoiDrag(sceneId, lat, lng);
  }, [geoScenes, onPoiDrag]);

  const handleWaypointDrag = useCallback((wpId: string, lat: number, lng: number) => {
    const wp = waypoints.find((w) => w.id === wpId);
    if (wp) invalidatePoint(wp.lat, wp.lng);
    onWaypointDrag(wpId, lat, lng);
    setSelectedWp(null);
  }, [waypoints, onWaypointDrag]);

  const handleDeleteWaypoint = useCallback((wpId: string) => {
    setSelectedWp(null);
    onWaypointDelete(wpId);
  }, [onWaypointDelete]);

  // Build ordered list of all points (POIs + waypoints)
  const routePoints = useMemo(() => {
    const pts: { lat: number; lng: number }[] = [];
    for (let i = 0; i < geoScenes.length; i++) {
      pts.push({ lat: geoScenes[i].latitude!, lng: geoScenes[i].longitude! });
      const wps = waypoints.filter((w) => w.afterPoiIndex === i).sort((a, b) => a.id.localeCompare(b.id));
      for (const wp of wps) pts.push({ lat: wp.lat, lng: wp.lng });
    }
    return pts;
  }, [geoScenes, waypoints]);

  const { path: walkingPath, isLoading: routeLoading, totalDistanceMeters, totalDurationSeconds } = useWalkingRoute(routePoints);

  const onRouteInfoRef = useRef(onRouteInfo);
  onRouteInfoRef.current = onRouteInfo;
  useMemo(() => {
    if (!routeLoading && totalDistanceMeters > 0 && onRouteInfoRef.current) {
      onRouteInfoRef.current(totalDistanceMeters, totalDurationSeconds);
    }
  }, [routeLoading, totalDistanceMeters, totalDurationSeconds]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div
        style={{ height }}
        className="w-full bg-ocre-soft border border-ocre-soft rounded-lg flex items-center justify-center p-4 text-center text-sm text-ocre"
        data-testid="editable-map-no-key"
      >
        Carte indisponible : <code className="mx-1 font-mono text-xs">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> manquante dans <code className="ml-1 font-mono text-xs">.env.local</code>.
      </div>
    );
  }
  if (!isLoaded) return <div style={{ height }} className="w-full bg-paper-soft animate-pulse rounded-lg" />;

  const isFullscreen = height === '100%';

  return (
    <GoogleMap
      mapContainerStyle={{ height, width: '100%', borderRadius: isFullscreen ? '0' : '8px', cursor: onMapClick ? 'crosshair' : 'grab' }}
      onLoad={onLoad}
      onClick={handleMapClick}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        gestureHandling: isFullscreen ? 'greedy' : 'cooperative',
      }}
    >
      {/* Walking route polyline — clickable to add waypoints */}
      {walkingPath.length > 1 && (
        <PolylineF
          path={walkingPath}
          options={{
            strokeColor: tg.colors.mer,
            strokeWeight: 5,
            strokeOpacity: routeLoading ? 0.4 : 0.85,
            clickable: true,
          }}
          onClick={handlePolylineClick}
        />
      )}

      {/* Invisible wider polyline for easier click target */}
      {walkingPath.length > 1 && (
        <PolylineF
          path={walkingPath}
          options={{
            strokeColor: tg.colors.mer,
            strokeWeight: 20,
            strokeOpacity: 0,
            clickable: true,
          }}
          onClick={handlePolylineClick}
        />
      )}

      {/* POI markers — draggable, clickable */}
      {geoScenes.map((scene, index) => (
        <MarkerF
          key={scene.id}
          position={{ lat: scene.latitude!, lng: scene.longitude! }}
          draggable
          onDragEnd={(e) => {
            if (e.latLng) handlePoiDrag(scene.id, e.latLng.lat(), e.latLng.lng());
          }}
          onClick={() => { setSelectedPoi(selectedPoi === scene.id ? null : scene.id); setSelectedWp(null); }}
          label={{ text: `${index + 1}`, color: 'white', fontSize: '12px', fontWeight: 'bold' }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: selectedPoi === scene.id ? tg.colors.ardoise : tg.colors.mer,
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: selectedPoi === scene.id ? 3 : 2,
          }}
          title={`${index + 1}. ${scene.title ?? 'Scene'}`}
        />
      ))}

      {/* POI info popup */}
      {selectedPoi && (() => {
        const scene = geoScenes.find((s) => s.id === selectedPoi);
        if (!scene?.latitude || !scene?.longitude) return null;
        const lat = scene.latitude;
        const lng = scene.longitude;
        const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
        const gmapsUrl = `https://www.google.com/maps/@${lat},${lng},18z`;
        const streetViewUrl = `https://www.google.com/maps?layer=c&cbll=${lat},${lng}`;
        return (
          <InfoWindowF
            position={{ lat, lng }}
            onCloseClick={() => setSelectedPoi(null)}
            options={{ pixelOffset: new google.maps.Size(0, -18) }}
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
          </InfoWindowF>
        );
      })()}

      {/* Waypoint markers — draggable, click to select, shows delete popup */}
      {waypoints.map((wp) => (
        <MarkerF
          key={wp.id}
          position={{ lat: wp.lat, lng: wp.lng }}
          draggable
          onDragEnd={(e) => {
            if (e.latLng) handleWaypointDrag(wp.id, e.latLng.lat(), e.latLng.lng());
          }}
          onClick={() => setSelectedWp(selectedWp === wp.id ? null : wp.id)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: selectedWp === wp.id ? tg.colors.danger : tg.colors.ink60,
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          }}
          title="Point de passage"
        />
      ))}

      {/* Delete popup for selected waypoint */}
      {selectedWp && (() => {
        const wp = waypoints.find((w) => w.id === selectedWp);
        if (!wp) return null;
        return (
          <InfoWindowF
            position={{ lat: wp.lat, lng: wp.lng }}
            onCloseClick={() => setSelectedWp(null)}
            options={{ pixelOffset: new google.maps.Size(0, -12) }}
          >
            <button
              onClick={() => handleDeleteWaypoint(wp.id)}
              style={{ padding: '4px 12px', fontSize: '12px', color: tg.colors.danger, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}
            >
              Supprimer ce point
            </button>
          </InfoWindowF>
        );
      })()}
    </GoogleMap>
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
