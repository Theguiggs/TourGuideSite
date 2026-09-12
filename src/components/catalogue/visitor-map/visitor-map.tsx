'use client';
import dynamic from 'next/dynamic';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button, tg } from '@murmure/design-system/web';
import { LocateFixed, Map as MapIcon, LockKeyhole } from 'lucide-react';
import type { POI } from '@/types/tour';
import { useTourPlayer } from '@/components/catalogue/scene-player';
import { FREE_PREVIEW_SCENES } from '@/lib/catalogue/scene-pois';
import { nearestStop, validCoordinate, type Coordinate } from './geo';
import { usePosition } from './use-position';

const Canvas = dynamic(() => import('./map-canvas'), { ssr: false });
class MapBoundary extends Component<{ children: ReactNode; fallback: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="status">{this.props.fallback}</p> : this.props.children; }
}
const COPY = {
  fr: { title: 'Votre itinéraire sur la carte', show: 'Afficher la carte', locate: 'Me situer', stop: 'Arrêter la localisation', locating: 'Recherche de votre position…', denied: 'Localisation refusée. Vous pouvez toujours consulter la carte.', unavailable: 'Position indisponible. La carte reste consultable.', mapError: 'Carte momentanément indisponible. Retrouvez les étapes dans la liste.', nearest: 'Étape la plus proche', locked: 'Étape verrouillée', listen: 'Écouter cette étape', contract: 'Le guidage automatique et l’écoute écran éteint sont réservés à l’appli.', foreground: 'La localisation fonctionne tant que cette page reste visible.' },
  en: { title: 'Your route on the map', show: 'Show map', locate: 'Locate me', stop: 'Stop locating', locating: 'Finding your position…', denied: 'Location permission denied. You can still use the map.', unavailable: 'Position unavailable. You can still use the map.', mapError: 'Map temporarily unavailable. Find the stops in the list.', nearest: 'Nearest stop', locked: 'Locked stop', listen: 'Listen to this stop', contract: 'Automatic guidance and listening with the screen off are reserved for the app.', foreground: 'Location works while this page remains visible.' },
};
export default function VisitorMap({ pois, path = [], hasAccess, locale }: { pois: POI[]; path?: Coordinate[]; hasAccess: boolean; locale: 'fr' | 'en' }) {
  const player = useTourPlayer();
  const copy = COPY[locale];
  const location = usePosition();
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLElement>(null);
  const stops = useMemo(() => pois.flatMap((poi, index) => {
    if (poi.hasCoordinates === false || !validCoordinate(poi) || (poi.hasCoordinates !== true && poi.latitude === 0 && poi.longitude === 0)) return [];
    const locked = !hasAccess && index >= FREE_PREVIEW_SCENES;
    return [{ id: poi.id, order: poi.order, latitude: poi.latitude, longitude: poi.longitude, title: locked ? copy.locked : poi.title, locked, listenable: !locked && poi.hasAudio === true }];
  }), [pois, hasAccess, copy.locked]);
  const nearest = location.position ? nearestStop(stops, location.position) : null;
  const hasStops = stops.length > 0;
  useEffect(() => {
    if (!root.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: '200px' });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [hasStops]);
  if (!stops.length) return null;
  return <section ref={root} aria-label={copy.title} style={{ marginTop: tg.space[6], color: tg.colors.ink }} data-testid="visitor-map">
    <h3 style={{ fontFamily: tg.fonts.display }}>{copy.title}</h3>
    {visible ? <MapBoundary fallback={copy.mapError}><Canvas stops={stops} path={path} currentId={player?.currentSceneId ?? null} nearestId={nearest?.stop.id} position={location.position} locale={locale} onListen={(id) => player?.toggle(id)} /></MapBoundary>
      : <Button variant="ghost" onClick={() => setVisible(true)}><MapIcon size={18} aria-hidden />{copy.show}</Button>}
    <div style={{ marginTop: tg.space[3] }}>
      <Button variant="ghost" onClick={() => { setVisible(true); if (location.status === 'active' || location.status === 'locating') location.stop(); else location.locate(); }}>
        <LocateFixed size={18} aria-hidden />{location.status === 'active' || location.status === 'locating' ? copy.stop : copy.locate}
      </Button>
    </div>
    <div role="status">
    <p>{location.status === 'locating' ? copy.locating : location.status === 'denied' ? copy.denied : location.status === 'unavailable' ? copy.unavailable : ''}</p>
    {nearest && <div data-testid="nearest-stop"><p>{copy.nearest} : {nearest.stop.order}. {nearest.stop.title} · {Math.round(nearest.distance / 10) * 10} m</p>
      {nearest.stop.locked && <LockKeyhole aria-label={copy.locked} size={18} />}
      {nearest.stop.listenable && <Button onClick={() => player?.toggle(nearest.stop.id)}>{copy.listen}</Button>}
    </div>}
    </div>
    <p>{copy.contract}</p><p style={{ fontSize: tg.fontSize.caption }}>{copy.foreground}</p>
  </section>;
}
