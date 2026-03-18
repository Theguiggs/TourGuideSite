'use client';

import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import type { StudioScene } from '@/types/studio';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// POI marker (teal)
const poiIcon = (index: number) => L.divIcon({
  className: '',
  html: `<div style="background:#0d9488;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${index + 1}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Waypoint marker (small gray)
const waypointIcon = L.divIcon({
  className: '',
  html: '<div style="background:#9ca3af;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.3);cursor:grab"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  afterPoiIndex: number; // waypoint sits between POI[afterPoiIndex] and POI[afterPoiIndex+1]
}

interface EditableMapProps {
  scenes: StudioScene[];
  waypoints: Waypoint[];
  onPoiDrag: (sceneId: string, lat: number, lng: number) => void;
  onWaypointDrag: (waypointId: string, lat: number, lng: number) => void;
  onWaypointAdd: (afterPoiIndex: number, lat: number, lng: number) => void;
  onWaypointDelete: (waypointId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

function MapClickHandler({ scenes, onWaypointAdd, onMapClick }: { scenes: StudioScene[]; onWaypointAdd: (afterPoiIndex: number, lat: number, lng: number) => void; onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      // Single click: place POI mode
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
    dblclick(e) {
      // Find nearest segment to insert waypoint
      const geoScenes = scenes.filter((s) => s.latitude && s.longitude);
      if (geoScenes.length < 2) return;

      let bestIndex = 0;
      let bestDist = Infinity;

      for (let i = 0; i < geoScenes.length - 1; i++) {
        const a = L.latLng(geoScenes[i].latitude!, geoScenes[i].longitude!);
        const b = L.latLng(geoScenes[i + 1].latitude!, geoScenes[i + 1].longitude!);
        const dist = distToSegment(e.latlng, a, b);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      }

      onWaypointAdd(bestIndex, e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function distToSegment(p: L.LatLng, a: L.LatLng, b: L.LatLng): number {
  const dx = b.lng - a.lng;
  const dy = b.lat - a.lat;
  if (dx === 0 && dy === 0) return p.distanceTo(a);
  let t = ((p.lng - a.lng) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  const proj = L.latLng(a.lat + t * dy, a.lng + t * dx);
  return p.distanceTo(proj);
}

export function EditableMap({ scenes, waypoints, onPoiDrag, onWaypointDrag, onWaypointAdd, onWaypointDelete, onMapClick }: EditableMapProps) {
  const geoScenes = scenes.filter((s) => s.latitude !== null && s.longitude !== null);

  if (geoScenes.length === 0) return null;

  const center: [number, number] = [
    geoScenes.reduce((sum, s) => sum + s.latitude!, 0) / geoScenes.length,
    geoScenes.reduce((sum, s) => sum + s.longitude!, 0) / geoScenes.length,
  ];

  // Build route: POIs + waypoints in order
  const routePoints: [number, number][] = [];
  for (let i = 0; i < geoScenes.length; i++) {
    routePoints.push([geoScenes[i].latitude!, geoScenes[i].longitude!]);
    // Insert waypoints after this POI
    const wps = waypoints.filter((w) => w.afterPoiIndex === i).sort((a, b) => a.id.localeCompare(b.id));
    for (const wp of wps) {
      routePoints.push([wp.lat, wp.lng]);
    }
  }

  return (
    <MapContainer center={center} zoom={16} style={{ height: '350px', width: '100%' }} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler scenes={scenes} onWaypointAdd={onWaypointAdd} onMapClick={onMapClick} />

      {/* Route polyline */}
      {routePoints.length > 1 && (
        <Polyline positions={routePoints} color="#0d9488" weight={3} opacity={0.8} dashArray="6 4" />
      )}

      {/* POI markers — draggable */}
      {geoScenes.map((scene, index) => (
        <DraggablePOIMarker
          key={scene.id}
          scene={scene}
          index={index}
          onDrag={onPoiDrag}
        />
      ))}

      {/* Waypoint markers — draggable */}
      {waypoints.map((wp) => (
        <DraggableWaypointMarker
          key={wp.id}
          waypoint={wp}
          onDrag={onWaypointDrag}
          onDelete={onWaypointDelete}
        />
      ))}
    </MapContainer>
  );
}

function DraggablePOIMarker({ scene, index, onDrag }: { scene: StudioScene; index: number; onDrag: (sceneId: string, lat: number, lng: number) => void }) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onDrag(scene.id, pos.lat, pos.lng);
      }
    },
  }), [scene.id, onDrag]);

  return (
    <Marker
      ref={markerRef}
      position={[scene.latitude!, scene.longitude!]}
      icon={poiIcon(index)}
      draggable={true}
      eventHandlers={eventHandlers}
    >
      <Popup>
        <div className="text-sm">
          <strong>{index + 1}. {scene.title || `Scène ${index + 1}`}</strong>
          {scene.poiDescription && <p className="text-xs text-gray-500 mt-1">{scene.poiDescription}</p>}
          <p className="text-xs text-gray-400 mt-1">Glissez pour repositionner</p>
        </div>
      </Popup>
    </Marker>
  );
}

function DraggableWaypointMarker({ waypoint, onDrag, onDelete }: { waypoint: Waypoint; onDrag: (id: string, lat: number, lng: number) => void; onDelete: (id: string) => void }) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onDrag(waypoint.id, pos.lat, pos.lng);
      }
    },
  }), [waypoint.id, onDrag]);

  return (
    <Marker
      ref={markerRef}
      position={[waypoint.lat, waypoint.lng]}
      icon={waypointIcon}
      draggable={true}
      eventHandlers={eventHandlers}
    >
      <Popup>
        <div className="text-xs">
          <p>Point de passage</p>
          <button onClick={() => onDelete(waypoint.id)} className="text-red-600 underline mt-1">Supprimer</button>
        </div>
      </Popup>
    </Marker>
  );
}
