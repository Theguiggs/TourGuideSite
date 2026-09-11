import { absoluteUrl, localeFromPath, SITE_URL } from '../site';

describe('site', () => {
  it('fabrique des URL absolues sur notre domaine', () => {
    expect(absoluteUrl('/catalogue/nice')).toBe(`${SITE_URL}/catalogue/nice`);
    expect(absoluteUrl('catalogue')).toBe(`${SITE_URL}/catalogue`);
    expect(absoluteUrl('https://cdn.example/x.jpg')).toBe('https://cdn.example/x.jpg');
  });

  it('lit la locale dans le chemin', () => {
    expect(localeFromPath('/')).toBe('fr');
    expect(localeFromPath('/en')).toBe('en');
    expect(localeFromPath('/en/catalogue/nice')).toBe('en');
    expect(localeFromPath('/english-garden')).toBe('fr');
    expect(localeFromPath(null)).toBe('fr');
  });
});
