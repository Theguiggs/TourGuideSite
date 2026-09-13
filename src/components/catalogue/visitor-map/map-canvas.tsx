'use client';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, useMap } from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { tg } from '@murmure/design-system/web';
import { createNumberedIcon } from '@/lib/maps/marker-icons';
import { TILE_URL, TILE_ATTRIBUTION } from '@/lib/maps/tile-config';
import { FitToPoints } from '@/components/map/FitToPoints';
import { validCoordinate, type Coordinate, type MapStop } from './geo';

function Position({ point }: { point: Coordinate | null }) {
  const map = useMap();
  useEffect(() => { if (point) map.panTo([point.latitude, point.longitude]); }, [map, point]);
  return point ? <CircleMarker center={[point.latitude, point.longitude]} radius={8} pathOptions={{ color: tg.colors.mer, fillOpacity: 1 }} /> : null;
}
export default function MapCanvas({ stops, path, currentId, nearestId, position, onListen, locale }: {
  stops: MapStop[]; path: Coordinate[]; currentId: string | null; nearestId?: string;
  position: Coordinate | null; onListen(id: string): void; locale: InterfaceLocale;
}) {
  const points = useMemo<LatLngTuple[]>(() => stops.map((stop) => [stop.latitude, stop.longitude]), [stops]);
  const line = useMemo<LatLngTuple[]>(() => path.filter(validCoordinate).map((p) => [p.latitude, p.longitude]), [path]);
  const bounds = useMemo(() => [...points, ...line], [points, line]);
  return <div data-testid="visitor-map-canvas" style={{ height: 360, borderRadius: tg.radius.md, overflow: 'hidden', position: 'relative', zIndex: 0 }}>
    <MapContainer center={points[0]} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitToPoints points={bounds} />
      {line.length > 1 && <Polyline positions={line} pathOptions={{ color: tg.colors.mer, weight: 4 }} />}
      {stops.map((stop) => {
        const active = stop.id === currentId;
        const nearest = stop.id === nearestId;
        const title = `${stop.order}. ${stop.title}${active ? translate(locale, ' — En écoute', ' — Playing') : ''}${nearest ? translate(locale, ' — La plus proche', ' — Nearest') : ''}`;
        return <Marker key={stop.id} position={[stop.latitude, stop.longitude]} title={title} alt={title}
          icon={createNumberedIcon({ number: stop.order, fillColor: active ? tg.colors.grenadine : nearest ? tg.colors.mer : tg.colors.paper, textColor: active || nearest ? tg.colors.paper : tg.colors.ink, borderColor: stop.locked ? tg.colors.ink40 : tg.colors.ink, size: 36 })}
          eventHandlers={{ click: () => { if (stop.listenable) onListen(stop.id); } }} />;
      })}
      <Position point={position} />
    </MapContainer>
  </div>;
}
