import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { trackEvent, StudioAnalyticsEvents } from '@/lib/analytics';

const SERVICE_NAME = 'StudioConsentStore';
const STORAGE_KEY = 'studio_rgpd_consent';

/**
 * Version du TEXTE de consentement (lot 6.2). Un nouveau texte (nouveau
 * sous-traitant, nouvelle finalité) = nouvelle version = consentement
 * redemandé. Le consentement est aussi porté par `GuideProfile`
 * (`rgpdConsentVersion`/`rgpdConsentAt`) : un autre navigateur le retrouve.
 */
export const CONSENT_VERSION = '2026-09-12';

interface StudioConsentState {
  hasConsented: boolean;
  consentDate: string | null;
  acceptConsent: () => void;
  loadConsent: () => void;
  /** Consentement déjà donné ailleurs (profil) pour la version courante. */
  hydrateFromProfile: (version: string | null | undefined, at: string | null | undefined) => void;
  resetConsent: () => void;
}

export const useStudioConsentStore = create<StudioConsentState>((set) => ({
  hasConsented: false,
  consentDate: null,

  acceptConsent: () => {
    const consentDate = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ consentDate, version: CONSENT_VERSION }));
      logger.info(SERVICE_NAME, 'RGPD consent accepted', { consentDate, version: CONSENT_VERSION });
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
        const parsed = JSON.parse(stored) as { consentDate: string; version?: string };
        // Un consentement d'une version antérieure du texte ne vaut pas pour celle-ci.
        if (parsed.version !== CONSENT_VERSION) {
          logger.info(SERVICE_NAME, 'Consent stored for another text version — asking again', { version: parsed.version ?? 'none' });
          return;
        }
        set({ hasConsented: true, consentDate: parsed.consentDate });
        logger.info(SERVICE_NAME, 'Consent loaded from storage', { consentDate: parsed.consentDate });
      }
    } catch (e) {
      logger.warn(SERVICE_NAME, 'Failed to load consent', { error: String(e) });
    }
  },

  hydrateFromProfile: (version, at) => {
    if (version !== CONSENT_VERSION) return;
    const consentDate = at ?? new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ consentDate, version: CONSENT_VERSION })); } catch { /* ignore */ }
    set({ hasConsented: true, consentDate });
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
