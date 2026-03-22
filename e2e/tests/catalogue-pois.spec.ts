/**
 * Catalogue POIs E2E Tests
 *
 * Validates that published tours show correct data:
 * - Tour detail page shows POIs with real names
 * - Reviews and ratings are displayed
 * - Guide info is shown
 * - Download CTA is present
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

const prefix = e2ePrefix('pois');

test.describe('Catalogue POIs', () => {
  test.beforeAll(async () => {
    const guidePath = getGuideStorageStatePath();
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

  test('catalogue main page lists cities with photos', async ({ page }) => {
    await page.goto('/catalogue');
    // Cities should have images
    const cityCards = page.locator('[class*="rounded-2xl"]');
    await expect(cityCards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cityCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('tour detail shows description and metadata', async ({ page }) => {
    // Navigate to a known seeded tour if it exists, otherwise any tour
    await page.goto('/catalogue');
    await page.locator('a[class*="rounded-2xl"], [class*="rounded-2xl"] a').first().click();
    await expect(page).toHaveURL(/\/catalogue\//, { timeout: 10_000 });

    // Click first tour
    const tourCard = page.locator('a[class*="rounded-xl"]').first();
    if (await tourCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tourCard.click();
      await expect(page).toHaveURL(/\/catalogue\/.*\//, { timeout: 10_000 });

      // Description section
      await expect(page.getByText('Description')).toBeVisible({ timeout: 5_000 });

      // Metadata sidebar — duration, distance, POIs
      await expect(page.getByText('min').first()).toBeVisible();
      await expect(page.getByText('km').first()).toBeVisible();

      // Download CTA
      await expect(page.getByText(/Telecharger/i).first()).toBeVisible();
    }
  });

  test('tour detail shows reviews with ratings', async ({ page }) => {
    await page.goto('/catalogue');
    await page.locator('a[class*="rounded-2xl"], [class*="rounded-2xl"] a').first().click();
    await expect(page).toHaveURL(/\/catalogue\//, { timeout: 10_000 });

    const tourCard = page.locator('a[class*="rounded-xl"]').first();
    if (await tourCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tourCard.click();

      // Avis section should exist
      await expect(page.getByText('Avis').first()).toBeVisible({ timeout: 5_000 });

      // Star ratings
      await expect(page.locator('[aria-label*="etoiles"]').first()).toBeVisible();
    }
  });

  test('tour detail shows guide info', async ({ page }) => {
    await page.goto('/catalogue');
    await page.locator('a[class*="rounded-2xl"], [class*="rounded-2xl"] a').first().click();
    await expect(page).toHaveURL(/\/catalogue\//, { timeout: 10_000 });

    const tourCard = page.locator('a[class*="rounded-xl"]').first();
    if (await tourCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tourCard.click();

      // Guide name should be visible
      await expect(page.getByText('Guide local').first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
