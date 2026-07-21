'use client';

import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Tour } from '@/types/tour';
import { TILE_URL, TILE_ATTRIBUTION } from '@/lib/maps/tile-config';
import { FitToPoints } from '@/components/map/FitToPoints';
import { TourPriceBadge } from '@/components/catalogue/tour-price-badge';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪',
};

const DEFAULT_CENTER: L.LatLngTuple = [43.7, 7.25]; // Côte d'Azur
const DEFAULT_ZOOM = 10;

function tourPinIcon(durationMinutes: number, highlighted: boolean): L.DivIcon {
  const bg = highlighted ? '#0f766e' : '#ffffff'; // teal-700 vs white
  const fg = highlighted ? '#ffffff' : '#111827'; // white vs gray-900
  const border = highlighted ? '#0f766e' : '#d1d5db'; // gray-300
  const arrowColor = highlighted ? '#0f766e' : '#ffffff';
  const scale = highlighted ? 1.25 : 1;
  const html = `
    <div style="transform:translate(-50%,-100%) scale(${scale});transform-origin:50% 100%;">
      <div style="
        display:inline-flex;align-items:center;gap:4px;
        padding:6px 10px;border-radius:9999px;
        background:${bg};color:${fg};
        border:1px solid ${border};
        font-size:12px;font-weight:700;white-space:nowrap;
        box-shadow:0 4px 10px rgba(0,0,0,.15);
        font-family:inherit;
      ">
        <span style="font-size:14px;">📍</span>
        <span>${durationMinutes} min</span>
      </div>
      <div style="
        width:0;height:0;margin:0 auto;
        border-left:6px solid transparent;border-right:6px solid transparent;
        border-top:6px solid ${arrowColor};
      "></div>
    </div>
  `;
  return L.divIcon({
    className: 'tg-tour-pin',
    html,
    iconSize: [0, 0], // sized by HTML content
    iconAnchor: [0, 0],
  });
}

interface CatalogueMapProps {
  tours: Tour[];
  highlightedTourId?: string | null;
  onBoundsChange: (visibleTourIds: string[]) => void;
  onTourHover: (tourId: string | null) => void;
}

function BoundsWatcher({
  tours,
  onBoundsChange,
}: {
  tours: Tour[];
  onBoundsChange: (ids: string[]) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      const visible = tours
        .filter((t) => t.latitude != null && t.longitude != null)
        .filter((t) => bounds.contains([t.latitude!, t.longitude!]));
      onBoundsChange(visible.map((t) => t.id));
    },
  });
  return null;
}

export function CatalogueMap({ tours, highlightedTourId, onBoundsChange, onTourHover }: CatalogueMapProps) {
  const [infoTour, setInfoTour] = useState<Tour | null>(null);

  const toursWithCoords = useMemo(
    () => tours.filter((t) => t.latitude != null && t.longitude != null),
    [tours],
  );

  const points = useMemo<L.LatLngTuple[]>(
    () => toursWithCoords.map((t) => [t.latitude!, t.longitude!]),
    [toursWithCoords],
  );

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom
      zoomControl
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitToPoints points={points} padding={50} singleZoom={DEFAULT_ZOOM} />
      <BoundsWatcher tours={toursWithCoords} onBoundsChange={onBoundsChange} />

      {toursWithCoords.map((tour) => {
        const isHighlighted = tour.id === highlightedTourId;
        return (
          <Marker
            key={tour.id}
            position={[tour.latitude!, tour.longitude!]}
            icon={tourPinIcon(tour.duration, isHighlighted)}
            zIndexOffset={isHighlighted ? 1000 : 0}
            eventHandlers={{
              click: () => setInfoTour(tour),
              mouseover: () => onTourHover(tour.id),
              mouseout: () => onTourHover(null),
            }}
          />
        );
      })}

      {infoTour && infoTour.latitude != null && infoTour.longitude != null && (
        <Popup
          position={[infoTour.latitude, infoTour.longitude]}
          eventHandlers={{ remove: () => setInfoTour(null) }}
        >
          <div className="p-1 max-w-[220px]">
            <div className="flex items-start gap-2 mb-1">
              <p className="font-semibold text-gray-900 text-sm">{infoTour.title}</p>
              <TourPriceBadge tour={infoTour} />
            </div>
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
        </Popup>
      )}
    </MapContainer>
  );
}
