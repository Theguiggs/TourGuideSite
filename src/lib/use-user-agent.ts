'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * User-agent du navigateur, `null` au rendu serveur et à l'hydratation.
 * Aucun effet, aucun setState : la valeur ne change jamais pendant la vie
 * de la page, `useSyncExternalStore` suffit et reste sûr à l'hydratation.
 */
export function useUserAgent(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => navigator.userAgent,
    () => null,
  );
}
