import * as amplitude from '@amplitude/analytics-browser';

let initialized = false;

export function initAmplitude(): void {
  if (initialized || typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Amplitude] NEXT_PUBLIC_AMPLITUDE_API_KEY not set — tracking disabled');
    }
    return;
  }

  amplitude.init(apiKey, {
    serverZone: 'EU',
    autocapture: {
      pageViews: false,   // on gère les page views manuellement via TrackPageView
      sessions: true,
      attribution: true,
    },
    defaultTracking: false,
    trackingOptions: {
      ipAddress: false,  // RGPD : pas de collecte d'IP
    },
  });

  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;
  amplitude.track(event, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!initialized) return;
  amplitude.setUserId(userId);
  if (traits) {
    const identity = new amplitude.Identify();
    Object.entries(traits).forEach(([key, value]) => identity.set(key, value as string | number | boolean | string[] | number[] | boolean[]));
    amplitude.identify(identity);
  }
}

export function resetUser(): void {
  if (!initialized) return;
  amplitude.reset();
}
