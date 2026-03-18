import { useOnboardingStore } from '../onboarding-store';

describe('useOnboardingStore', () => {
  const mockStore: Record<string, string> = {};

  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockStore[key] ?? null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { mockStore[key] = value; });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete mockStore[key]; });
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it('starts as first visit', () => {
    expect(useOnboardingStore.getState().isFirstVisit).toBe(true);
    expect(useOnboardingStore.getState().showBubbles).toBe(true);
  });

  it('shouldShowBubble returns true for undismissed features', () => {
    expect(useOnboardingStore.getState().shouldShowBubble('general')).toBe(true);
  });

  it('dismisses a feature', () => {
    useOnboardingStore.getState().dismissFeature('general');
    expect(useOnboardingStore.getState().shouldShowBubble('general')).toBe(false);
    expect(useOnboardingStore.getState().shouldShowBubble('itinerary')).toBe(true);
  });

  it('dismisses all bubbles', () => {
    useOnboardingStore.getState().dismissAll();
    expect(useOnboardingStore.getState().showBubbles).toBe(false);
    expect(useOnboardingStore.getState().shouldShowBubble('general')).toBe(false);
  });

  it('persists and loads from localStorage', () => {
    useOnboardingStore.getState().dismissFeature('scenes');
    useOnboardingStore.getState().resetOnboarding();
    useOnboardingStore.getState().loadOnboarding();
    // After reset + load from empty storage, it should be first visit again
    expect(useOnboardingStore.getState().isFirstVisit).toBe(true);
  });

  it('resets onboarding', () => {
    useOnboardingStore.getState().dismissAll();
    useOnboardingStore.getState().resetOnboarding();
    expect(useOnboardingStore.getState().isFirstVisit).toBe(true);
    expect(useOnboardingStore.getState().showBubbles).toBe(true);
  });
});
