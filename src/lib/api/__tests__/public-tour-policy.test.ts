import { isPublicCatalogueTour } from '../public-tour-policy';

describe('isPublicCatalogueTour', () => {
  it('keeps real catalogue tours', () => {
    expect(isPublicCatalogueTour({ title: 'Les parfums de Grasse' })).toBe(true);
  });

  it.each([
    'e2e-catalogue-123 Tour publiée',
    'E2E-admin-456 Visite',
    '  e2e-cross-platform-789 Grasse',
  ])('hides E2E test tour %s', (title) => {
    expect(isPublicCatalogueTour({ title })).toBe(false);
  });
});
