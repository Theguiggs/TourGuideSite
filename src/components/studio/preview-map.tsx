'use client';

import { useCallback, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';
import { tg } from '@tourguide/design-system';
import type { StudioScene } from '@/types/studio';
import { useWalkingRoute } from '@/lib/hooks/use-walking-route';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

interface PreviewMapProps {
  scenes: StudioScene[];
}

export function PreviewMap({ scenes }: PreviewMapProps) {
  const geoScenes = scenes.filter((s) => s.latitude !== null && s.longitude !== null);
  const mapRef = useRef<google.maps.Map | null>(null);

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
    }
  }, [geoScenes]);

  const points = useMemo(
    () => geoScenes.map((s) => ({ lat: s.latitude!, lng: s.longitude! })),
    [geoScenes],
  );

  const { path: walkingPath, isLoading } = useWalkingRoute(points);

  if (geoScenes.length === 0 || !GOOGLE_MAPS_KEY) return null;
  if (!isLoaded) return <div className="h-[280px] w-full bg-paper-soft animate-pulse rounded-lg" />;

  const center = { lat: geoScenes[0].latitude!, lng: geoScenes[0].longitude! };

  return (
    <GoogleMap
      mapContainerStyle={{ height: '280px', width: '100%', borderRadius: `${tg.radius.sm}px` }}
      center={center}
      zoom={16}
      onLoad={onLoad}
      options={{ disableDefaultUI: true, zoomControl: true, mapTypeControl: false, streetViewControl: false }}
    >
      {walkingPath.length > 1 && (
        <PolylineF
          path={walkingPath}
          options={{
            strokeColor: tg.colors.mer,
            strokeWeight: 4,
            strokeOpacity: isLoading ? 0.4 : 0.7,
          }}
        />
      )}
      {geoScenes.map((scene, index) => (
        <MarkerF
          key={scene.id}
          position={{ lat: scene.latitude!, lng: scene.longitude! }}
          label={{ text: `${index + 1}`, color: 'white', fontSize: '12px', fontWeight: 'bold' }}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: tg.colors.mer,
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 2,
          }}
          title={scene.title ?? `Scene ${index + 1}`}
        />
      ))}
    </GoogleMap>
  );
}
