'use client';

import { MapContainer, TileLayer, Polyline, CircleMarker } from 'react-leaflet';
import { tg } from '@tourguide/design-system';
import 'leaflet/dist/leaflet.css';

interface WalkMapProps {
  points: Array<{ lat: number; lng: number }>;
}

export function WalkMap({ points }: WalkMapProps) {
  if (points.length === 0) {
    return (
      <div
        className="bg-paper-soft h-48 flex items-center justify-center text-sm text-ink-40"
        data-testid="walk-map-empty"
      >
        Pas de tracé GPS
      </div>
    );
  }

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const center: [number, number] = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ];
  const positions = points.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div data-testid="walk-map" className="h-48">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={positions} pathOptions={{ color: tg.colors.mer, weight: 4 }} />
        <CircleMarker center={positions[0]} pathOptions={{ color: tg.colors.mer, fillColor: tg.colors.mer, fillOpacity: 1 }} radius={5} />
        <CircleMarker
          center={positions[positions.length - 1]}
          pathOptions={{ color: tg.colors.ocre, fillColor: tg.colors.ocre, fillOpacity: 1 }}
          radius={5}
        />
      </MapContainer>
    </div>
  );
}
