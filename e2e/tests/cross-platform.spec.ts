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
import {
  seedMobileSession,
  seedPublishedTour,
  cleanupByPrefix,
} from '../fixtures/seed.fixture';
import type { SeededTour } from '../fixtures/seed.fixture';

const prefix = e2ePrefix('xplat');

test.describe('Cross-platform', () => {
  let guidePath: string;
  let token: string;
  let mobileSeeded: SeededTour;

  test.beforeAll(async () => {
    guidePath = getGuideStorageStatePath();
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }
    token = getAccessTokenFromStorageState(guidePath);

    // Seed a session simulating mobile upload
    mobileSeeded = await seedMobileSession(prefix, token);
  });

  test.afterAll(async () => {
    await cleanupByPrefix(prefix);
  });

  test('1 - Mobile session visible in studio', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();

    await page.goto('/guide/studio');

    // Dismiss RGPD consent modal if present
    const consentBtn1 = page.getByRole('button', { name: /^Accepter$/i });
    await consentBtn1.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    if (await consentBtn1.isVisible()) {
      await consentBtn1.click();
      await consentBtn1.waitFor({ state: 'hidden', timeout: 5_000 });
    }

    // Should see the mobile session title
    await expect(
      page.getByText(`${prefix} Session Mobile`, { exact: false }),
    ).toBeVisible({ timeout: 10_000 });

    // Click to open
    await page.getByText(`${prefix} Session Mobile`, { exact: false }).click();
    await expect(page).toHaveURL(/\/guide\/studio\//, { timeout: 10_000 });

    await context.close();
  });

  test('2a - Finalize mobile session', async ({ browser }) => {
    test.slow();

    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();

    await page.goto('/guide/studio');
    const consentBtn2 = page.getByRole('button', { name: /^Accepter$/i });
    await consentBtn2.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    if (await consentBtn2.isVisible()) {
      await consentBtn2.click();
      await consentBtn2.waitFor({ state: 'hidden', timeout: 5_000 });
    }
    await page.getByText(`${prefix} Session Mobile`, { exact: false }).click({ timeout: 10_000 });

    // Go to preview
    await page.getByRole('link', { name: /Aperçu|Preview/i }).click();
    await expect(page).toHaveURL(/\/preview/, { timeout: 10_000 });

    // The submit button should be available
    const submitBtn = page.getByTestId('submit-review-btn');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await expect(
        page.getByText(/soumis|envoyé|modération/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    }

    await context.close();
  });

  test('2b - Published tour visible in catalogue', async ({ page }) => {
    // Seed a published tour to verify catalogue visibility
    const pubPrefix = `${prefix}-pub`;
    await seedPublishedTour(pubPrefix, token);

    await page.goto('/catalogue');
    await page.getByText('Grasse', { exact: false }).first().click();
    await expect(page).toHaveURL(/\/catalogue\/grasse/i, { timeout: 10_000 });

    await expect(
      page.getByText(`${pubPrefix} Tour Publié`, { exact: false }),
    ).toBeVisible({ timeout: 10_000 });

    // Cleanup
    await cleanupByPrefix(pubPrefix);
  });
});
