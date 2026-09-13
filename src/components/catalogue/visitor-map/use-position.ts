'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { validCoordinate, type Coordinate } from './geo';

export function usePosition() {
  const [position, setPosition] = useState<Coordinate | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'active' | 'denied' | 'unavailable'>('idle');
  const watch = useRef<number | null>(null);
  const generation = useRef(0);
  const clear = useCallback(() => {
    generation.current++;
    if (watch.current !== null) {
      try { navigator.geolocation?.clearWatch(watch.current); } catch { /* GPS facultatif. */ }
      watch.current = null;
    }
  }, []);
  const stop = useCallback(() => { clear(); setStatus('idle'); setPosition(null); }, [clear]);
  const locate = useCallback(() => {
    clear();
    const token = generation.current;
    setPosition(null);
    setStatus('locating');
    try {
      if (!navigator.geolocation) { setStatus('unavailable'); return; }
      watch.current = navigator.geolocation.watchPosition((result) => {
        if (generation.current !== token) return;
        const point = { latitude: result.coords.latitude, longitude: result.coords.longitude };
        if (!validCoordinate(point)) { clear(); setStatus('unavailable'); return; }
        setPosition(point);
        setStatus('active');
      }, (error) => {
        if (generation.current !== token) return;
        clear(); setPosition(null); setStatus(error.code === 1 ? 'denied' : 'unavailable');
      }, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 });
    } catch { clear(); setStatus('unavailable'); }
  }, [clear]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); clear(); };
  }, [clear, stop]);
  return { position, status, locate, stop };
}
