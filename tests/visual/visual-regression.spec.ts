/**
 * Story 4.1 — Test régression visuelle (T6).
 *
 * Harness Playwright pour les Stories 4.2 / 4.3 / 4.4. Compare les rendus actuels
 * aux baselines `__screenshots__/visual-regression.spec.ts/*.png` avec
 * `maxDiffPixels: 100` (par-pixel, pas pourcentage).
 *
 * Workflow :
 * - Story 4.1 : génère les premières baselines via `--update-snapshots`.
 * - Stories 4.2 / 4.3 / 4.4 : exécutent ce test, mettent à jour les baselines
 *   correspondantes après validation visuelle de la nouvelle charte.
 *
 * Lance :
 *   cd TourGuideWeb && npx playwright test tests/visual/visual-regression.spec.ts \
 *     --config=playwright.visual.config.ts
 *
 *   # Pour mettre à jour les baselines après changement intentionnel :
 *   cd TourGuideWeb && npx playwright test tests/visual/visual-regression.spec.ts \
 *     --config=playwright.visual.config.ts --update-snapshots
 */

import { test, expect } from '@playwright/test';

const FICHE_TOUR_PATH =
  '/catalogue/nice/nice-insolite-legendes-fantomes-et-passages-secrets';

const SNAPSHOT_OPTIONS = {
  maxDiffPixels: 100,
  // Mask zones dynamiques (timestamps, photos S3 si présentes, durées calculées).
  // Les Stories suivantes pourront enrichir cette liste.
} as const;

test.describe('Epic 4 — Régression visuelle', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('home — visuel stable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('home.png', {
      ...SNAPSHOT_OPTIONS,
      mask: [page.locator('[data-dynamic]')],
    });
  });

  test('catalogue — visuel stable', async ({ page }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('catalogue.png', {
      ...SNAPSHOT_OPTIONS,
      mask: [page.locator('[data-dynamic]')],
    });
  });

  test('fiche-tour — visuel stable', async ({ page }) => {
    await page.goto(FICHE_TOUR_PATH);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('fiche-tour.png', {
      ...SNAPSHOT_OPTIONS,
      mask: [page.locator('[data-dynamic]')],
    });
  });
});
