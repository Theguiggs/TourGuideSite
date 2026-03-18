'use client';

import { useEffect } from 'react';
import { trackEvent, type EventName } from '@/lib/analytics';

interface TrackPageViewProps {
  event: EventName;
  properties?: Record<string, unknown>;
}

export default function TrackPageView({ event, properties }: TrackPageViewProps) {
  useEffect(() => {
    trackEvent(event, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  return null;
}
