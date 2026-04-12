'use client';

import { useCallback, useState, useRef } from 'react';
import { GoogleMap, useJsApiLoader, OverlayViewF, OverlayView, InfoWindowF } from '@react-google-maps/api';
import type { Tour } from '@/types/tour';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪',
};

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

const DEFAULT_CENTER = { lat: 43.7, lng: 7.25 }; // Côte d'Azur
const DEFAULT_ZOOM = 10;

interface CatalogueMapProps {
  tours: Tour[];
  highlightedTourId?: string | null;
  onBoundsChange: (visibleTourIds: string[]) => void;
  onTourHover: (tourId: string | null) => void;
}

export function CatalogueMap({ tours, highlightedTourId, onBoundsChange, onTourHover }: CatalogueMapProps) {
  const [infoTour, setInfoTour] = useState<Tour | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_KEY,
  });

  const toursWithCoords = tours.filter((t) => t.latitude && t.longitude);

  const handleBoundsChanged = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = mapRef.current.getBounds();
    if (!bounds) return;
    const visible = toursWithCoords.filter((t) =>
      bounds.contains({ lat: t.latitude!, lng: t.longitude! }),
    );
    onBoundsChange(visible.map((t) => t.id));
  }, [toursWithCoords, onBoundsChange]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Fit bounds to all tours
    if (toursWithCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      toursWithCoords.forEach((t) => bounds.extend({ lat: t.latitude!, lng: t.longitude! }));
      map.fitBounds(bounds, 50);
    }
  }, [toursWithCoords]);

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">
        <p className="text-sm">Carte non disponible (clé Google Maps manquante)</p>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="w-full h-full bg-gray-100 animate-pulse" />;
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      options={MAP_OPTIONS}
      onLoad={onLoad}
      onBoundsChanged={handleBoundsChanged}
    >
      {toursWithCoords.map((tour) => {
        const isHighlighted = tour.id === highlightedTourId;
        return (
          <OverlayViewF
            key={tour.id}
            position={{ lat: tour.latitude!, lng: tour.longitude! }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              onClick={() => setInfoTour(tour)}
              onMouseEnter={() => onTourHover(tour.id)}
              onMouseLeave={() => onTourHover(null)}
              className="cursor-pointer"
              style={{ transform: 'translate(-50%, -100%)' }}
            >
              {/* Pin shape */}
              <div className={`relative transition-transform ${isHighlighted ? 'scale-125 z-20' : 'z-10'}`}>
                <div className={`px-2.5 py-1.5 rounded-full text-xs font-bold shadow-lg whitespace-nowrap flex items-center gap-1 ${
                  isHighlighted
                    ? 'bg-teal-700 text-white'
                    : 'bg-white text-gray-900 border border-gray-300'
                }`}>
                  <span className="text-sm">📍</span>
                  <span>{tour.duration} min</span>
                </div>
                {/* Arrow pointer */}
                <div className={`w-0 h-0 mx-auto border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent ${
                  isHighlighted ? 'border-t-teal-700' : 'border-t-white'
                }`} />
              </div>
            </div>
          </OverlayViewF>
        );
      })}

      {infoTour && infoTour.latitude && infoTour.longitude && (
        <InfoWindowF
          position={{ lat: infoTour.latitude, lng: infoTour.longitude }}
          onCloseClick={() => setInfoTour(null)}
        >
          <div className="p-1 max-w-[220px]">
            <p className="font-semibold text-gray-900 text-sm mb-1">{infoTour.title}</p>
            <p className="text-xs text-gray-500 mb-1">
              {infoTour.city} · {infoTour.duration} min · {infoTour.distance} km
            </p>
            {infoTour.availableLanguages && infoTour.availableLanguages.length > 0 && (
              <div className="flex gap-1 mb-2 flex-wrap">
                {infoTour.availableLanguages.map((lang) => (
                  <span key={lang} className="text-xs bg-gray-100 px-1 rounded">
                    {LANG_FLAGS[lang] ?? lang}
                    {infoTour.languageAudioTypes?.[lang] === 'recording' ? '🎤' : infoTour.languageAudioTypes?.[lang] === 'tts' ? '🤖' : ''}
                  </span>
                ))}
              </div>
            )}
            <a
              href={`/catalogue/${infoTour.citySlug}/${infoTour.slug}`}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Voir la visite →
            </a>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
