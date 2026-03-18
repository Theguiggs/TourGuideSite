import { useStudioConsentStore } from '../studio-consent-store';

describe('useStudioConsentStore', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    useStudioConsentStore.getState().resetConsent();
    jest.clearAllMocks();
    Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k]);

    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockLocalStorage[key] ?? null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockLocalStorage[key] = value;
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete mockLocalStorage[key];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts with no consent', () => {
    const state = useStudioConsentStore.getState();
    expect(state.hasConsented).toBe(false);
    expect(state.consentDate).toBeNull();
  });

  it('accepts consent and persists to localStorage', () => {
    useStudioConsentStore.getState().acceptConsent();
    const state = useStudioConsentStore.getState();
    expect(state.hasConsented).toBe(true);
    expect(state.consentDate).toBeTruthy();
    expect(mockLocalStorage['studio_rgpd_consent']).toBeTruthy();
  });

  it('loads consent from localStorage', () => {
    const consentDate = '2026-03-14T10:00:00.000Z';
    mockLocalStorage['studio_rgpd_consent'] = JSON.stringify({ consentDate });

    useStudioConsentStore.getState().loadConsent();
    const state = useStudioConsentStore.getState();
    expect(state.hasConsented).toBe(true);
    expect(state.consentDate).toBe(consentDate);
  });

  it('does not consent when localStorage is empty', () => {
    useStudioConsentStore.getState().loadConsent();
    const state = useStudioConsentStore.getState();
    expect(state.hasConsented).toBe(false);
  });

  it('resets consent and clears localStorage', () => {
    useStudioConsentStore.getState().acceptConsent();
    expect(useStudioConsentStore.getState().hasConsented).toBe(true);

    useStudioConsentStore.getState().resetConsent();
    const state = useStudioConsentStore.getState();
    expect(state.hasConsented).toBe(false);
    expect(state.consentDate).toBeNull();
    expect(mockLocalStorage['studio_rgpd_consent']).toBeUndefined();
  });

  it('handles corrupt localStorage gracefully', () => {
    mockLocalStorage['studio_rgpd_consent'] = 'not-valid-json';
    useStudioConsentStore.getState().loadConsent();
    expect(useStudioConsentStore.getState().hasConsented).toBe(false);
  });

  it('still sets in-memory consent when localStorage.setItem throws', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    useStudioConsentStore.getState().acceptConsent();
    // In-memory state should still be set even though persistence failed
    expect(useStudioConsentStore.getState().hasConsented).toBe(true);
    expect(useStudioConsentStore.getState().consentDate).toBeTruthy();
  });
});
