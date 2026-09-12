'use client';
import { useEffect, useState } from 'react';
import { Button, tg } from '@murmure/design-system/web';
import { RefreshCw } from 'lucide-react';

export function PwaRegistration({ locale }: { locale: 'fr' | 'en' }) {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_PWA_TEST !== 'true') return;
    if (!('serviceWorker' in navigator)) return;
    let alive = true;
    const cleanup: Array<() => void> = [];
    void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then((registration) => {
      if (!alive) return;
      const inspect = () => { if (alive && registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting); };
      const found = () => {
        const worker = registration.installing;
        if (!worker) return;
        const changed = () => { if (worker.state === 'installed') inspect(); };
        worker.addEventListener('statechange', changed);
        cleanup.push(() => worker.removeEventListener('statechange', changed));
      };
      inspect(); found();
      registration.addEventListener('updatefound', found);
      cleanup.push(() => registration.removeEventListener('updatefound', found));
      const check = () => { if (!document.hidden) void registration.update().catch(() => {}); };
      document.addEventListener('visibilitychange', check);
      cleanup.push(() => document.removeEventListener('visibilitychange', check));
    }).catch(() => { /* Le site reste utilisable sans service worker. */ });
    return () => { alive = false; cleanup.forEach((fn) => fn()); };
  }, []);

  useEffect(() => {
    if (!updating || !waiting) return;
    // Le choix porte sur cet onglet. Un autre onglet n’est jamais rechargé ici.
    const changed = () => { if (waiting.state === 'activated') window.location.reload(); };
    waiting.addEventListener('statechange', changed);
    const failed = () => { if (waiting.state === 'redundant') { setUpdating(false); setWaiting(null); } };
    waiting.addEventListener('statechange', failed);
    waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    changed();
    return () => { waiting.removeEventListener('statechange', changed); waiting.removeEventListener('statechange', failed); };
  }, [updating, waiting]);
  if (!waiting) return null;
  return <aside aria-label={locale === 'en' ? 'Site update' : 'Mise à jour du site'} style={{ position: 'fixed', bottom: tg.space[4], left: tg.space[4], right: tg.space[4], zIndex: 1100, background: tg.colors.paper, color: tg.colors.ink, border: `1px solid ${tg.colors.ink40}`, borderRadius: tg.radius.md, padding: tg.space[3], display: 'flex', gap: tg.space[3], alignItems: 'center', flexWrap: 'wrap' }}>
    <span>{locale === 'en' ? 'A new version is ready.' : 'Une nouvelle version est prête.'}</span>
    <Button size="sm" disabled={updating} onClick={() => setUpdating(true)}><RefreshCw size={16} aria-hidden />{locale === 'en' ? 'Reload' : 'Recharger'}</Button>
  </aside>;
}
