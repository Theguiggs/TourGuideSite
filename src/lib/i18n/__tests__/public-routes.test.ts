import { localizePublicPath } from '../public-routes';

describe('localizePublicPath', () => {
  it.each([
    ['/', '/en'],
    ['/catalogue', '/en/catalogue'],
    ['/catalogue/nice', '/en/catalogue/nice'],
    ['/catalogue/nice/old-town', '/en/catalogue/nice/old-town'],
    ['/aide', '/en/help'],
    ['/confidentialite', '/en/privacy'],
    ['/supprimer-mon-compte', '/en/delete-account'],
    ['/mes-visites', '/en/my-purchases'],
  ])('maps French %s to English %s', (source, expected) => {
    expect(localizePublicPath(source, 'en')).toBe(expected);
  });

  it.each([
    ['/en', '/'],
    ['/en/catalogue/nice', '/catalogue/nice'],
    ['/en/help', '/aide'],
    ['/en/privacy', '/confidentialite'],
    ['/en/delete-account', '/supprimer-mon-compte'],
    ['/en/my-purchases', '/mes-visites'],
  ])('maps English %s to French %s', (source, expected) => {
    expect(localizePublicPath(source, 'fr')).toBe(expected);
  });

  it('leaves private application routes unchanged', () => {
    expect(localizePublicPath('/guide/studio', 'en')).toBe('/guide/studio');
    expect(localizePublicPath('/admin/moderation', 'fr')).toBe('/admin/moderation');
  });
});
