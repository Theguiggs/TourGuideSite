'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPOI {
  id: string;
  order: number;
  title: string;
  latitude: number;
  longitude: number;
}

interface TourMapProps {
  pois: MapPOI[];
  selectedPoiId: string | null;
  onPoiSelect: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  editGpsMode?: boolean;
  className?: string;
}

const iconCache = new Map<string, L.DivIcon>();

function createNumberedIcon(order: number, isSelected: boolean): L.DivIcon {
  const key = `${order}:${isSelected}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    className: 'poi-marker',
    html: `<div style="
      width: ${isSelected ? 36 : 28}px;
      height: ${isSelected ? 36 : 28}px;
      border-radius: 50%;
      background: ${isSelected ? '#0d9488' : '#ffffff'};
      color: ${isSelected ? '#ffffff' : '#0d9488'};
      border: 3px solid ${isSelected ? '#0d9488' : '#9ca3af'};
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: ${isSelected ? 16 : 13}px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    ">${order}</div>`,
    iconSize: [isSelected ? 36 : 28, isSelected ? 36 : 28],
    iconAnchor: [isSelected ? 18 : 14, isSelected ? 18 : 14],
  });
  iconCache.set(key, icon);
  return icon;
}

function MapEvents({ onMapClick, editGpsMode }: { onMapClick?: (lat: number, lng: number) => void; editGpsMode?: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!editGpsMode || !onMapClick) return;

    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map, onMapClick, editGpsMode]);

  return null;
}

function FitBounds({ pois, editGpsMode }: { pois: MapPOI[]; editGpsMode?: boolean }) {
  const map = useMap();
  const prevPoisRef = useRef<string>('');

  useEffect(() => {
    if (pois.length === 0) return;
    if (editGpsMode) return;
    const key = pois.map((p) => `${p.id}:${p.latitude}:${p.longitude}`).join(',');
    if (key === prevPoisRef.current) return;
    prevPoisRef.current = key;

    if (pois.length === 1) {
      map.setView([pois[0].latitude, pois[0].longitude], 15, { animate: true });
    } else {
      const bounds = L.latLngBounds(pois.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [pois, map, editGpsMode]);

  return null;
}

function CenterOnSelected({ pois, selectedPoiId }: { pois: MapPOI[]; selectedPoiId: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPoiId) return;
    const poi = pois.find((p) => p.id === selectedPoiId);
    if (!poi) return;
    map.setView([poi.latitude, poi.longitude], map.getZoom(), { animate: true });
  }, [selectedPoiId, pois, map]);

  return null;
}

export default function TourMap({
  pois,
  selectedPoiId,
  onPoiSelect,
  onMapClick,
  editGpsMode,
  className,
}: TourMapProps) {
  if (pois.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className || 'h-[400px]'}`}>
        <p className="text-gray-500 text-sm">Aucun POI avec coordonnees GPS</p>
      </div>
    );
  }

  const sortedPois = [...pois].sort((a, b) => a.order - b.order);
  const center: [number, number] = [sortedPois[0].latitude, sortedPois[0].longitude];
  const routePositions: [number, number][] = sortedPois.map((p) => [p.latitude, p.longitude]);

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 ${className || 'h-[400px]'}`}>
      <MapContainer
        center={center}
        zoom={15}
        className="h-full w-full"
        style={{ cursor: editGpsMode ? 'crosshair' : 'grab' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pois={sortedPois} editGpsMode={editGpsMode} />
        <CenterOnSelected pois={sortedPois} selectedPoiId={selectedPoiId} />
        <MapEvents onMapClick={onMapClick} editGpsMode={editGpsMode} />

        {/* Route polyline */}
        <Polyline
          positions={routePositions}
          pathOptions={{ color: '#0d9488', weight: 3, dashArray: '8 6', opacity: 0.7 }}
        />

        {/* POI markers */}
        {sortedPois.map((poi) => (
          <Marker
            key={poi.id}
            position={[poi.latitude, poi.longitude]}
            icon={createNumberedIcon(poi.order, poi.id === selectedPoiId)}
            eventHandlers={{
              click: () => onPoiSelect(poi.id),
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
