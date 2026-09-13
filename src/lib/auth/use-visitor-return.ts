'use client';

import { useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const subscribeHash = (notify: () => void) => {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
};
const getHash = () => window.location.hash;
const noHash = () => '';

/** Destination complète partagée par les deux entrées de compte. */
export function useVisitorReturn() {
  const path = usePathname() ?? '/';
  const params = useSearchParams();
  const hash = useSyncExternalStore(subscribeHash, getHash, noHash);
  const query = params?.toString();
  return `${path}${query ? `?${query}` : ''}${hash}`;
}
