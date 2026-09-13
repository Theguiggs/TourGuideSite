'use client';

import { useSyncExternalStore } from 'react';
import { readResume, RESUME_CLEAR_EVENT } from './scene-player/resume-store';
import type { PurchasedTour } from '@/types/purchase';

const subscribe = (notify: () => void) => {
  const cleared = () => queueMicrotask(notify);
  window.addEventListener('storage', notify);
  window.addEventListener(RESUME_CLEAR_EVENT, cleared);
  return () => { window.removeEventListener('storage', notify); window.removeEventListener(RESUME_CLEAR_EVENT, cleared); };
};

/** Snapshot primitif stable ; les droits restent vérifiés à l’ouverture du lecteur. */
export function useLibraryResumes(purchases: PurchasedTour[]): string[] {
  const value = useSyncExternalStore(subscribe, () => JSON.stringify(purchases
    .filter(p => p.tour.status === 'published')
    .map(p => ({ id: p.tour.id, resume: readResume(p.tour.id) }))
    .filter(p => p.resume)
    .sort((a, b) => b.resume!.updatedAt - a.resume!.updatedAt)
    .map(p => p.id)), () => '[]');
  return JSON.parse(value) as string[];
}
