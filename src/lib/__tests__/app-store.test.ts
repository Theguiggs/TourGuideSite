import { detectPlatform, getStoreUrl, isMobileUserAgent } from '../app-store';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

const BOTH = { ios: 'https://apps.apple.com/app/id1', android: 'https://play.google.com/store/apps/details?id=m' };

describe('app-store', () => {
  it('reconnaît la plateforme', () => {
    expect(detectPlatform(IPHONE)).toBe('ios');
    expect(detectPlatform(ANDROID)).toBe('android');
    expect(detectPlatform(DESKTOP)).toBe('other');
    expect(detectPlatform(undefined)).toBe('other');
    expect(isMobileUserAgent(IPHONE)).toBe(true);
    expect(isMobileUserAgent(DESKTOP)).toBe(false);
  });

  it("n'envoie jamais un iPhone sur Google Play, ni un Android sur l'App Store", () => {
    expect(getStoreUrl(IPHONE, BOTH)).toBe(BOTH.ios);
    expect(getStoreUrl(ANDROID, BOTH)).toBe(BOTH.android);
    expect(getStoreUrl(IPHONE, { ios: null, android: BOTH.android })).toBeNull();
    expect(getStoreUrl(ANDROID, { ios: BOTH.ios, android: null })).toBeNull();
  });

  it('propose n’importe quel magasin à un ordinateur, et rien quand il n’y en a pas', () => {
    expect(getStoreUrl(DESKTOP, BOTH)).toBe(BOTH.android);
    expect(getStoreUrl(DESKTOP, { ios: BOTH.ios, android: null })).toBe(BOTH.ios);
    expect(getStoreUrl(DESKTOP, { ios: null, android: null })).toBeNull();
  });

  it('sans variables au build, aucun lien (jamais « # »)', () => {
    expect(getStoreUrl(IPHONE)).toBeNull();
    expect(getStoreUrl(DESKTOP)).toBeNull();
  });
});
