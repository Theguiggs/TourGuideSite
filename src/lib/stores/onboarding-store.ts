import { create } from 'zustand';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'OnboardingStore';
const STORAGE_KEY = 'studio_onboarding';

export type OnboardingFeature = 'general' | 'itinerary' | 'scenes' | 'recording' | 'preview';

interface OnboardingState {
  isFirstVisit: boolean;
  dismissedFeatures: Set<OnboardingFeature>;
  showBubbles: boolean;

  loadOnboarding: () => void;
  dismissFeature: (feature: OnboardingFeature) => void;
  dismissAll: () => void;
  resetOnboarding: () => void;
  shouldShowBubble: (feature: OnboardingFeature) => boolean;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isFirstVisit: true,
  dismissedFeatures: new Set(),
  showBubbles: true,

  loadOnboarding: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          isFirstVisit: false,
          dismissedFeatures: new Set(parsed.dismissed ?? []),
          showBubbles: parsed.showBubbles ?? true,
        });
      } else {
        set({ isFirstVisit: true, showBubbles: true });
      }
      logger.info(SERVICE_NAME, 'Onboarding loaded');
    } catch {
      logger.warn(SERVICE_NAME, 'Failed to load onboarding');
    }
  },

  dismissFeature: (feature) => {
    set((state) => {
      const next = new Set(state.dismissedFeatures);
      next.add(feature);
      persistOnboarding(next, state.showBubbles);
      return { dismissedFeatures: next, isFirstVisit: false };
    });
    logger.info(SERVICE_NAME, 'Feature dismissed', { feature });
  },

  dismissAll: () => {
    const dismissed = get().dismissedFeatures;
    set({ showBubbles: false, isFirstVisit: false });
    persistOnboarding(dismissed, false);
    logger.info(SERVICE_NAME, 'All bubbles dismissed');
  },

  resetOnboarding: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    set({ isFirstVisit: true, dismissedFeatures: new Set(), showBubbles: true });
  },

  shouldShowBubble: (feature) => {
    const state = get();
    return state.showBubbles && !state.dismissedFeatures.has(feature);
  },
}));

function persistOnboarding(dismissed: Set<OnboardingFeature>, showBubbles: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dismissed: Array.from(dismissed),
      showBubbles,
    }));
  } catch { /* ignore */ }
}

// Selectors
export const selectIsFirstVisit = (s: OnboardingState) => s.isFirstVisit;
export const selectShowBubbles = (s: OnboardingState) => s.showBubbles;
export const selectDismissAll = (s: OnboardingState) => s.dismissAll;
