import { isPublicCatalogueGuide } from '../public-guide-policy';

describe('isPublicCatalogueGuide', () => {
  const originalAllowTestGuides = process.env.E2E_ALLOW_TEST_GUIDES;

  afterEach(() => {
    if (originalAllowTestGuides === undefined) {
      delete process.env.E2E_ALLOW_TEST_GUIDES;
    } else {
      process.env.E2E_ALLOW_TEST_GUIDES = originalAllowTestGuides;
    }
  });

  it('keeps real guides public', () => {
    expect(isPublicCatalogueGuide({ displayName: 'Marie Dupont' })).toBe(true);
  });

  it.each(['E2E Test Guide', 'e2e-guide Grasse', '  E2E Test Admin'])(
    'hides technical guide %s',
    (displayName) => {
      expect(isPublicCatalogueGuide({ displayName })).toBe(false);
    },
  );

  it('allows technical guides only inside the E2E test server', () => {
    process.env.E2E_ALLOW_TEST_GUIDES = 'true';
    expect(isPublicCatalogueGuide({ displayName: 'E2E Test Guide' })).toBe(true);
  });
});
