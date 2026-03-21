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
import { seedPublishedTour, seedDraftTour, cleanupByPrefix } from '../fixtures/seed.fixture';

const prefix = e2ePrefix('catalogue');

test.describe('Catalogue', () => {
  let publishedTitle: string;
  let draftTitle: string;

  test.beforeAll(async () => {
    const guidePath = getGuideStorageStatePath();
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }
    const token = getAccessTokenFromStorageState(guidePath);

    await seedPublishedTour(prefix, token);
    publishedTitle = `${prefix} Tour Publié`;

    await seedDraftTour(prefix, token);
    draftTitle = `${prefix} Draft`;
  });

  test.afterAll(async () => {
    await cleanupByPrefix(prefix);
  });

  test('1 - Published tour visible in catalogue', async ({ page }) => {
    await page.goto('/catalogue');

    // Click on Grasse city
    await page.getByText('Grasse', { exact: false }).first().click();
    await expect(page).toHaveURL(/\/catalogue\/grasse/i, { timeout: 10_000 });

    // Published tour should be visible by exact title
    await expect(page.getByText(publishedTitle, { exact: false })).toBeVisible({ timeout: 10_000 });
  });

  test('2 - Draft tour NOT visible in catalogue', async ({ page }) => {
    await page.goto('/catalogue');

    // Navigate to Grasse
    await page.getByText('Grasse', { exact: false }).first().click();
    await expect(page).toHaveURL(/\/catalogue\/grasse/i, { timeout: 10_000 });

    // Draft tour should NOT appear
    await expect(page.getByText(draftTitle, { exact: true })).not.toBeVisible();
  });
});
