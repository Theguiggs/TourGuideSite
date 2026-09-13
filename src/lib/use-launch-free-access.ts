'use client';

import {useEffect, useState} from 'react';
import {launchFreeAccess, type LaunchFreeAccess} from './launch-free-access';

/** Maintient les surfaces promotionnelles à jour sans navigation. */
export function useLaunchFreeAccess(): LaunchFreeAccess {
  const [offer, setOffer] = useState<LaunchFreeAccess>(() => launchFreeAccess());
  useEffect(() => {
    const now = Date.now();
    const boundary = offer.active
      ? offer.endAt
      : offer.startAt && Date.parse(offer.startAt) > now
        ? offer.startAt
        : undefined;
    const delay = boundary ? Math.min(60_000, Math.max(250, Date.parse(boundary) - now)) : 60_000;
    const timer = setTimeout(() => setOffer(launchFreeAccess()), delay);
    return () => clearTimeout(timer);
  }, [offer]);
  return offer;
}
