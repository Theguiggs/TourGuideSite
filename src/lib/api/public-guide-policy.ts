type GuideWithDisplayName = {
  displayName?: string | null;
};

export function isPublicCatalogueGuide(guide: GuideWithDisplayName): boolean {
  if (process.env.E2E_ALLOW_TEST_GUIDES === 'true') {
    return true;
  }

  const displayName = guide.displayName?.trimStart().toLowerCase();
  return !displayName?.startsWith('e2e ') && !displayName?.startsWith('e2e-');
}
