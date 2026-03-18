import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { trackEvent, StudioAnalyticsEvents } from '@/lib/analytics';

const SERVICE_NAME = 'StudioConsentStore';
const STORAGE_KEY = 'studio_rgpd_consent';

interface StudioConsentState {
  hasConsented: boolean;
  consentDate: string | null;
  acceptConsent: () => void;
  loadConsent: () => void;
  resetConsent: () => void;
}

export const useStudioConsentStore = create<StudioConsentState>((set) => ({
  hasConsented: false,
  consentDate: null,

  acceptConsent: () => {
    const consentDate = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ consentDate }));
      logger.info(SERVICE_NAME, 'RGPD consent accepted', { consentDate });
      trackEvent(StudioAnalyticsEvents.STUDIO_RGPD_CONSENT_ACCEPTED);
    } catch (e) {
      logger.error(SERVICE_NAME, 'Failed to persist consent', { error: String(e) });
    }
    set({ hasConsented: true, consentDate });
  },

  loadConsent: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { consentDate: string };
        set({ hasConsented: true, consentDate: parsed.consentDate });
        logger.info(SERVICE_NAME, 'Consent loaded from storage', { consentDate: parsed.consentDate });
      }
    } catch (e) {
      logger.warn(SERVICE_NAME, 'Failed to load consent', { error: String(e) });
    }
  },

  resetConsent: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    set({ hasConsented: false, consentDate: null });
  },
}));

// Selectors
export const selectHasConsented = (s: StudioConsentState) => s.hasConsented;
export const selectAcceptConsent = (s: StudioConsentState) => s.acceptConsent;
export const selectLoadConsent = (s: StudioConsentState) => s.loadConsent;
