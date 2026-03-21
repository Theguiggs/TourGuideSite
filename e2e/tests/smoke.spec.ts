import { test, expect } from '@playwright/test';
import {
  E2E_GUIDE_EMAIL,
  E2E_GUIDE_PASSWORD,
  e2ePrefix,
} from '../fixtures/test-data';
import {
  getGuideStorageStatePath,
  isTokenValid,
  authenticateCognito,
  createStorageState,
} from '../fixtures/auth.fixture';
import { seedTour, queryTourByTitle, deleteItemsByPrefix } from '../helpers/appsync-direct';
import { getAccessTokenFromStorageState } from '../fixtures/auth.fixture';

test.describe('Smoke Tests', () => {
  test('smoke-auth: login guide via UI navigates to dashboard', async ({ page }, testInfo) => {
    // F15 fix: disable trace/video for this test to avoid capturing credentials
    testInfo.config.projects[0].use = {
      ...testInfo.config.projects[0].use,
      trace: 'off',
      video: 'off',
    };
    await page.goto('/guide/login');

    await page.getByTestId('login-email').fill(E2E_GUIDE_EMAIL);
    await page.getByTestId('login-password').fill(E2E_GUIDE_PASSWORD);
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/guide\/dashboard/, { timeout: 15_000 });
  });

  test('smoke-crud: create tour via API, verify, cleanup', async ({ browser }) => {
    const guidePath = getGuideStorageStatePath();

    // Re-auth if token expired
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }

    const token = getAccessTokenFromStorageState(guidePath);
    const prefix = e2ePrefix('smoke');

    // Create tour via AppSync direct
    const tour = await seedTour(prefix, token, {
      title: `${prefix} Smoke Test`,
      city: 'Grasse',
    });
    expect(tour.id).toBeTruthy();

    // Verify via AppSync query
    const found = await queryTourByTitle(prefix, token);
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.some(t => t.title?.includes(prefix))).toBe(true);

    // Cleanup
    const deleted = await deleteItemsByPrefix(prefix);
    expect(deleted).toBeGreaterThanOrEqual(1);

    // Verify cleanup worked
    const afterCleanup = await queryTourByTitle(prefix, token);
    const stillExists = afterCleanup.some(t => t.title?.includes(prefix));
    expect(stillExists).toBe(false);
  });
});
