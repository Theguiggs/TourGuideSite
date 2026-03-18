'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import type { StudioScene } from '@/types/studio';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon (broken in Next.js/Webpack)
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface PreviewMapProps {
  scenes: StudioScene[];
}

export function PreviewMap({ scenes }: PreviewMapProps) {
  const geoScenes = scenes.filter((s) => s.latitude !== null && s.longitude !== null);

  if (geoScenes.length === 0) return null;

  const center: [number, number] = [
    geoScenes.reduce((sum, s) => sum + s.latitude!, 0) / geoScenes.length,
    geoScenes.reduce((sum, s) => sum + s.longitude!, 0) / geoScenes.length,
  ];

  const polyline: [number, number][] = geoScenes.map((s) => [s.latitude!, s.longitude!]);

  return (
    <MapContainer
      center={center}
      zoom={16}
      style={{ height: '280px', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Route polyline */}
      {polyline.length > 1 && (
        <Polyline positions={polyline} color="#0d9488" weight={3} opacity={0.7} dashArray="8 4" />
      )}

      {/* POI markers */}
      {geoScenes.map((scene, index) => (
        <Marker
          key={scene.id}
          position={[scene.latitude!, scene.longitude!]}
          icon={defaultIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>{index + 1}. {scene.title || `Scène ${index + 1}`}</strong>
              {scene.poiDescription && <p className="text-xs text-gray-500 mt-1">{scene.poiDescription}</p>}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
