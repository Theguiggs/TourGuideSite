/**
 * Access Control E2E Tests
 *
 * Validates that content access rules are enforced:
 * - Guest: can browse catalogue, cannot start/download tours
 * - Authenticated: can access all tour features
 */
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
  getAccessTokenFromStorageState,
} from '../fixtures/auth.fixture';
import { seedPublishedTour, cleanupByPrefix } from '../fixtures/seed.fixture';

const prefix = e2ePrefix('access');

test.describe('Access Control', () => {
  let guidePath: string;

  test.beforeAll(async () => {
    guidePath = getGuideStorageStatePath();
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }
    const token = getAccessTokenFromStorageState(guidePath);
    await seedPublishedTour(prefix, token);
  });

  test.afterAll(async () => {
    await cleanupByPrefix(prefix);
  });

  test('guest can browse catalogue cities', async ({ page }) => {
    await page.goto('/catalogue');
    // Map-based catalogue lists cities (not tours). h1 = "Le catalogue des villes".
    await expect(page.locator('h1')).toContainText(/catalogue/i);
    // The seeded city (Grasse) is listed as a city block link.
    await expect(page.getByRole('link', { name: /Grasse/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('guest can view tour detail page', async ({ page }) => {
    await page.goto('/catalogue');
    // New UX: catalogue (cities) → city page (tour cards) → tour detail.
    await page.getByRole('link', { name: /Grasse/i }).first().click();
    await expect(page).toHaveURL(/\/catalogue\/[^/]+$/, { timeout: 10_000 });
    await page.locator('[data-testid^="tour-card-"]').first().click();
    await expect(page).toHaveURL(/\/catalogue\/[^/]+\/[^/]+/, { timeout: 10_000 });
    // Tour title should be visible
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('authenticated user can access the canonical Studio dashboard', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await page.goto('/guide/studio');
    await expect(page).toHaveURL(/\/guide\/studio$/, { timeout: 10_000 });
    await context.close();
  });
});
