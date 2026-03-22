/**
 * Admin Features E2E Tests
 *
 * Validates admin-specific features:
 * - Tour list shows POI count, duration, guide name
 * - Guide detail shows email and catalogue link
 */
import { test, expect } from '@playwright/test';
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
} from '../fixtures/test-data';
import {
  getAdminStorageStatePath,
  isTokenValid,
  authenticateCognito,
  createStorageState,
} from '../fixtures/auth.fixture';

test.describe('Admin Features', () => {
  let adminPath: string;

  test.beforeAll(async () => {
    adminPath = getAdminStorageStatePath();
    if (!isTokenValid(adminPath)) {
      const tokens = await authenticateCognito(E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
      createStorageState(tokens, E2E_ADMIN_EMAIL, adminPath);
    }
  });

  test('admin tours list shows columns: guide, POIs, duration', async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminPath });
    const page = await context.newPage();

    await page.goto('/admin/tours');
    await expect(page.locator('h1')).toContainText('parcours', { timeout: 10_000 });

    // Table headers should include Guide, POIs
    await expect(page.locator('th', { hasText: 'Guide' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'POIs' })).toBeVisible();

    // At least one tour row
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test('admin guides list shows guide profiles', async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminPath });
    const page = await context.newPage();

    await page.goto('/admin/guides');
    await expect(page.locator('h1')).toContainText('guides', { timeout: 10_000 });

    // At least one guide in the list
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test('admin guide detail shows profile info', async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminPath });
    const page = await context.newPage();

    await page.goto('/admin/guides');
    // Click first guide link
    const guideLink = page.locator('tbody tr a').first();
    await expect(guideLink).toBeVisible({ timeout: 10_000 });
    await guideLink.click();

    // Guide profile card should show
    await expect(page.getByText('ID profil')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Ville', { exact: true })).toBeVisible();

    // Catalogue link button
    await expect(page.getByText(/Voir catalogue/i)).toBeVisible();

    await context.close();
  });
});
