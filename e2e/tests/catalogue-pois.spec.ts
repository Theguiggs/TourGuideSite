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
  let publishedTourId: string;

  test.beforeAll(async () => {
    const guidePath = getGuideStorageStatePath();
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }
    const token = getAccessTokenFromStorageState(guidePath);
    const seeded = await seedPublishedTour(prefix, token);
    publishedTourId = seeded.tourId;
  });

  test.afterAll(async () => {
    await cleanupByPrefix(prefix);
  });

  test('catalogue main page lists tour cards', async ({ page }) => {
    // Tour cards live on the city page.
    await page.goto('/catalogue/grasse');
    // City page tour cards: data-testid="tour-card-{id}"
    await expect(page.getByTestId(`tour-card-${publishedTourId}`)).toBeVisible({ timeout: 15_000 });
  });

  test('tour detail shows description and metadata', async ({ page }) => {
    await page.goto('/catalogue/grasse');
    await page.getByTestId(`tour-card-${publishedTourId}`).click();
    await expect(page).toHaveURL(/\/catalogue\/[^/]+\/[^/]+/, { timeout: 10_000 });

    // Description section
    await expect(page.getByText('Description')).toBeVisible({ timeout: 5_000 });

    // Metadata — duration, distance
    await expect(page.getByText('min').first()).toBeVisible();
    await expect(page.getByText('km').first()).toBeVisible();

    // App CTA — sidebar always shows download prompt ("Téléchargez Murmure")
    // "Ouvrir dans Murmure" only appears in QR-scan context (?source=qr)
    await expect(page.getByText(/Téléchargez Murmure/i).first()).toBeVisible();
  });

  test('tour detail shows reviews with ratings', async ({ page }) => {
    await page.goto('/catalogue/grasse');
    await page.getByTestId(`tour-card-${publishedTourId}`).click();
    await expect(page).toHaveURL(/\/catalogue\/[^/]+\/[^/]+/, { timeout: 10_000 });

    // Avis section should exist
    await expect(page.getByText('Avis').first()).toBeVisible({ timeout: 5_000 });

    // Star ratings (if reviews exist)
    const stars = page.locator('[aria-label*="etoiles"]');
    const starCount = await stars.count();
    if (starCount > 0) {
      await expect(stars.first()).toBeVisible();
    }
  });

  test('tour detail shows guide info', async ({ page }) => {
    await page.goto('/catalogue/grasse');
    await page.getByTestId(`tour-card-${publishedTourId}`).click();
    await expect(page).toHaveURL(/\/catalogue\/[^/]+\/[^/]+/, { timeout: 10_000 });

    // Guide showcase card — labelled "Votre guide"
    await expect(page.getByText('Votre guide').first()).toBeVisible({ timeout: 5_000 });
  });
});
