'use client';

import { useCallback, useRef, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';
import { useWalkingRoute } from '@/lib/hooks/use-walking-route';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

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

export default function TourMap({
  pois,
  selectedPoiId,
  onPoiSelect,
  onMapClick,
  editGpsMode,
  className,
}: TourMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_KEY });

  const sortedPois = [...pois].sort((a, b) => a.order - b.order);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (sortedPois.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      sortedPois.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
      map.fitBounds(bounds, 40);
    } else if (sortedPois.length === 1) {
      map.setCenter({ lat: sortedPois[0].latitude, lng: sortedPois[0].longitude });
      map.setZoom(15);
    }
  }, [sortedPois]);

  // Center on selected POI
  useEffect(() => {
    if (!selectedPoiId || !mapRef.current) return;
    const poi = sortedPois.find((p) => p.id === selectedPoiId);
    if (poi) {
      mapRef.current.panTo({ lat: poi.latitude, lng: poi.longitude });
    }
  }, [selectedPoiId, sortedPois]);

  const handleClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (editGpsMode && onMapClick && e.latLng) {
      onMapClick(e.latLng.lat(), e.latLng.lng());
    }
  }, [editGpsMode, onMapClick]);

  const routePoints = useMemo(
    () => sortedPois.map((p) => ({ lat: p.latitude, lng: p.longitude })),
    [sortedPois],
  );

  const { path: walkingPath, isLoading } = useWalkingRoute(routePoints);

  if (pois.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className || 'h-[400px]'}`}>
        <p className="text-gray-500 text-sm">Aucun POI avec coordonnees GPS</p>
      </div>
    );
  }

  if (!GOOGLE_MAPS_KEY || !isLoaded) {
    return <div className={`bg-gray-100 animate-pulse rounded-xl ${className || 'h-[400px]'}`} />;
  }

  const center = { lat: sortedPois[0].latitude, lng: sortedPois[0].longitude };

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 ${className || 'h-[400px]'}`}>
      <GoogleMap
        mapContainerClassName="h-full w-full"
        center={center}
        zoom={15}
        onLoad={onLoad}
        onClick={handleClick}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          draggableCursor: editGpsMode ? 'crosshair' : undefined,
        }}
      >
        <PolylineF
          path={walkingPath}
          options={{
            strokeColor: '#0d9488',
            strokeWeight: 4,
            strokeOpacity: isLoading ? 0.4 : 0.7,
          }}
        />

        {sortedPois.map((poi) => {
          const isSelected = poi.id === selectedPoiId;
          return (
            <MarkerF
              key={poi.id}
              position={{ lat: poi.latitude, lng: poi.longitude }}
              onClick={() => onPoiSelect(poi.id)}
              label={{ text: `${poi.order}`, color: isSelected ? 'white' : '#0d9488', fontSize: isSelected ? '14px' : '12px', fontWeight: 'bold' }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: isSelected ? 18 : 14,
                fillColor: isSelected ? '#0d9488' : '#ffffff',
                fillOpacity: 1,
                strokeColor: isSelected ? '#0d9488' : '#9ca3af',
                strokeWeight: isSelected ? 3 : 2,
              }}
              title={`${poi.order}. ${poi.title}`}
              zIndex={isSelected ? 100 : poi.order}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
}
