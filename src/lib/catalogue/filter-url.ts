'use client';

import { useSyncExternalStore } from 'react';

const EVENT = 'murmure:catalogue-filters';
const subscribe = (notify: () => void) => {
  window.addEventListener('popstate', notify);
  window.addEventListener(EVENT, notify);
  return () => { window.removeEventListener('popstate', notify); window.removeEventListener(EVENT, notify); };
};

/** L’URL constitue l’état partageable et restaure les choix au retour navigateur. */
export function useFilterUrl(initial = '') {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => initial);
  const params = new URLSearchParams(search);
  const update = (values: Record<string, string>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new Event(EVENT));
  };
  return { params, update };
}

