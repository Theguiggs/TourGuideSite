/**
 * Story 4.4 — Snapshot visuel dédié fiche-tour (T6.4).
 *
 * Capture desktop (1280×800) ET mobile (390×844) de la page fiche tour
 * post-migration Design System. Complémentaire au snapshot global
 * `visual-regression.spec.ts` qui couvre uniquement le viewport desktop.
 *
 * Lance :
 *   cd TourGuideWeb && npx playwright test tests/visual/fiche-tour.spec.ts \
 *     --config=playwright.visual.config.ts
 *
 *   # Pour mettre à jour les baselines après changement intentionnel :
 *   cd TourGuideWeb && npx playwright test tests/visual/fiche-tour.spec.ts \
 *     --config=playwright.visual.config.ts --update-snapshots
 */

import { test, expect } from '@playwright/test';

const FICHE_TOUR_PATH =
  '/catalogue/nice/nice-insolite-legendes-fantomes-et-passages-secrets';

const SNAPSHOT_OPTIONS = {
  maxDiffPixels: 100,
} as const;

test.describe('Story 4.4 — Fiche tour visuel post-migration', () => {
  test('fiche-tour desktop (1280×800) — hero color-block + sidebar CTA', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(FICHE_TOUR_PATH);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('fiche-tour-desktop.png', {
      ...SNAPSHOT_OPTIONS,
      mask: [page.locator('[data-dynamic]')],
    });
  });

  test('fiche-tour mobile (390×844) — sticky bottom CTA', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(FICHE_TOUR_PATH);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('fiche-tour-mobile.png', {
      ...SNAPSHOT_OPTIONS,
      mask: [page.locator('[data-dynamic]')],
    });
  });
});
