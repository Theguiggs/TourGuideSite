'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Les réponses tardives ne doivent pas modifier la nouvelle page ou session. */
export function useCheckoutLifetime() {
  const active = useRef(false);
  const path = useRef('');
  useEffect(() => {
    active.current = true;
    path.current = window.location.pathname;
    return () => { active.current = false; };
  }, []);
  return useCallback(() => active.current && path.current === window.location.pathname, []);
}
