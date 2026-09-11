import { localizePublicPath } from '../public-routes';

describe('localizePublicPath', () => {
  it.each([
    ['/', '/en'],
    ['/catalogue', '/en/catalogue'],
    ['/catalogue/nice', '/en/catalogue/nice'],
    ['/catalogue/nice/old-town', '/en/catalogue/nice/old-town'],
    ['/guides/marie-dupont', '/en/guides/marie-dupont'],
    ['/aide', '/en/help'],
    ['/cgu', '/en/terms'],
    ['/confidentialite', '/en/privacy'],
    ['/supprimer-mon-compte', '/en/delete-account'],
    ['/mes-achats', '/en/my-purchases'],
  ])('maps French %s to English %s', (source, expected) => {
    expect(localizePublicPath(source, 'en')).toBe(expected);
  });

  it.each([
    ['/en', '/'],
    ['/en/catalogue/nice', '/catalogue/nice'],
    ['/en/guides/marie-dupont', '/guides/marie-dupont'],
    ['/en/help', '/aide'],
    ['/en/terms', '/cgu'],
    ['/en/privacy', '/confidentialite'],
    ['/en/delete-account', '/supprimer-mon-compte'],
    ['/en/my-purchases', '/mes-achats'],
  ])('maps English %s to French %s', (source, expected) => {
    expect(localizePublicPath(source, 'fr')).toBe(expected);
  });

  it('leaves a path already in the requested language untouched', () => {
    expect(localizePublicPath('/en/catalogue', 'en')).toBe('/en/catalogue');
    expect(localizePublicPath('/catalogue', 'fr')).toBe('/catalogue');
  });

  it('leaves private application routes unchanged', () => {
    expect(localizePublicPath('/guide/studio', 'en')).toBe('/guide/studio');
    expect(localizePublicPath('/admin/moderation', 'fr')).toBe('/admin/moderation');
  });

  it('does not confuse /guides with /guide (Studio)', () => {
    expect(localizePublicPath('/guide/login', 'en')).toBe('/guide/login');
  });
});
