import {
  CONSENT_KEY,
  CONSENT_VERSION,
  readCookieConsent,
  resetCookieConsent,
  subscribeCookieConsent,
  writeCookieConsent,
} from '../cookie-consent';

beforeEach(() => localStorage.clear());

describe('cookie-consent', () => {
  it('ne connaît aucun choix au départ', () => {
    expect(readCookieConsent()).toBeNull();
  });

  it('mémorise le choix et prévient les abonnés', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeCookieConsent(listener);
    writeCookieConsent('accepted');
    expect(readCookieConsent()).toBe('accepted');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    writeCookieConsent('refused');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('redemande le choix quand la version change ou que la valeur est corrompue', () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: CONSENT_VERSION - 1, choice: 'accepted' }));
    expect(readCookieConsent()).toBeNull();
    localStorage.setItem(CONSENT_KEY, '{not json');
    expect(readCookieConsent()).toBeNull();
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: CONSENT_VERSION, choice: 'maybe' }));
    expect(readCookieConsent()).toBeNull();
  });

  it('peut être oublié pour représenter le bandeau', () => {
    writeCookieConsent('refused');
    resetCookieConsent();
    expect(readCookieConsent()).toBeNull();
  });
});
