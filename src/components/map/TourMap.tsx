'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap, useMapEvents } from 'react-leaflet';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tg } from '@murmure/design-system';
import { useWalkingRoute } from '@/lib/hooks/use-walking-route';
import { TILE_URL, TILE_ATTRIBUTION } from '@/lib/maps/tile-config';
import { createNumberedIcon } from '@/lib/maps/marker-icons';
import { FitToPoints } from '@/components/map/FitToPoints';

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
  /** Pre-computed polyline drawn by the guide (skips the auto-routing fallback). */
  customPath?: Array<{ lat: number; lng: number }> | null;
}

function PanToSelected({ position }: { position: L.LatLngTuple | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.panTo(position);
  }, [map, position]);
  return null;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

export default function TourMap({
  pois,
  selectedPoiId,
  onPoiSelect,
  onMapClick,
  editGpsMode,
  className,
  customPath = null,
}: TourMapProps) {
  const sortedPois = useMemo(() => [...pois].sort((a, b) => a.order - b.order), [pois]);

  const points = useMemo<L.LatLngTuple[]>(
    () => sortedPois.map((p) => [p.latitude, p.longitude]),
    [sortedPois],
  );

  const hasCustomPath = !!(customPath && customPath.length > 1);

  // Skip the ORS auto-route when the guide has persisted their own polyline.
  const routePoints = useMemo(
    () => (hasCustomPath ? [] : sortedPois.map((p) => ({ lat: p.latitude, lng: p.longitude }))),
    [sortedPois, hasCustomPath],
  );

  const { path: autoWalkingPath, isLoading: autoLoading } = useWalkingRoute(routePoints);
  const walkingPath = hasCustomPath ? customPath! : autoWalkingPath;
  const isLoading = hasCustomPath ? false : autoLoading;
  const walkingPositions = useMemo<L.LatLngTuple[]>(
    () => walkingPath.map((p) => [p.lat, p.lng]),
    [walkingPath],
  );

  const selectedPosition = useMemo<L.LatLngTuple | null>(() => {
    if (!selectedPoiId) return null;
    const poi = sortedPois.find((p) => p.id === selectedPoiId);
    return poi ? [poi.latitude, poi.longitude] : null;
  }, [selectedPoiId, sortedPois]);

  if (pois.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className || 'h-[400px]'}`}>
        <p className="text-gray-500 text-sm">Aucun POI avec coordonnees GPS</p>
      </div>
    );
  }

  const center: L.LatLngTuple = [sortedPois[0].latitude, sortedPois[0].longitude];
  const cursorClass = editGpsMode ? 'tg-map-cursor-crosshair' : '';

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 ${className || 'h-[400px]'} ${cursorClass}`}>
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl
        attributionControl
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FitToPoints points={points} singleZoom={15} />
        <PanToSelected position={selectedPosition} />
        {onMapClick && editGpsMode && <MapClickHandler onClick={onMapClick} />}

        {walkingPositions.length > 1 && (
          <Polyline
            positions={walkingPositions}
            pathOptions={{
              color: tg.colors.mer,
              weight: 4,
              opacity: isLoading ? 0.4 : 0.7,
            }}
          />
        )}

        {sortedPois.map((poi) => {
          const isSelected = poi.id === selectedPoiId;
          const icon = createNumberedIcon({
            number: poi.order,
            size: isSelected ? 36 : 28,
            fontSize: isSelected ? 14 : 12,
            fillColor: isSelected ? tg.colors.mer : tg.colors.card,
            textColor: isSelected ? '#ffffff' : tg.colors.mer,
            borderColor: isSelected ? tg.colors.mer : tg.colors.ink40,
            borderWidth: isSelected ? 3 : 2,
          });
          return (
            <Marker
              key={poi.id}
              position={[poi.latitude, poi.longitude]}
              icon={icon}
              title={`${poi.order}. ${poi.title}`}
              zIndexOffset={isSelected ? 1000 : poi.order}
              eventHandlers={{ click: () => onPoiSelect(poi.id) }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
