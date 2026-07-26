import { isPublicCatalogueTour } from '../public-tour-policy';

describe('isPublicCatalogueTour', () => {
  const originalAllowTestTours = process.env.E2E_ALLOW_TEST_TOURS;

  afterEach(() => {
    if (originalAllowTestTours === undefined) {
      delete process.env.E2E_ALLOW_TEST_TOURS;
    } else {
      process.env.E2E_ALLOW_TEST_TOURS = originalAllowTestTours;
    }
  });

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

  it('allows E2E fixtures only in the E2E test server', () => {
    process.env.E2E_ALLOW_TEST_TOURS = 'true';
    expect(isPublicCatalogueTour({ title: 'e2e-catalogue-123 Tour publiée' })).toBe(true);
  });
});
