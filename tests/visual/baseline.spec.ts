/**
 * Story 4.1 — Baseline screenshots Playwright (T2).
 *
 * Capture les snapshots PNG de référence des 3 écrans publics AVANT migration
 * (Stories 4.2/4.3/4.4). Sortie : docs/epic-4-baseline-screenshots/{home,catalogue,fiche-tour}.png
 *
 * Pré-condition : `npm run dev` démarré sur :3000.
 *
 * Usage manuel :
 *   cd TourGuideWeb && npx playwright test tests/visual/baseline.spec.ts \
 *     --config=playwright.visual.config.ts
 *
 * Note : ce test produit les baselines via screenshot manuel (pas
 * `toMatchSnapshot`) car les baselines servent de référence pour Stories
 * 4.2/4.3/4.4 — pas pour comparaison interne.
 */

import { test } from '@playwright/test';
import path from 'node:path';

// Real tour slug from the seeded catalogue (verified via curl on dev server).
const FICHE_TOUR_PATH =
  '/catalogue/nice/nice-insolite-legendes-fantomes-et-passages-secrets';

const BASELINE_DIR = path.resolve(
  __dirname,
  '../../../docs/epic-4-baseline-screenshots',
);

test.describe('Epic 4 — Baselines pré-migration', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('home', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(BASELINE_DIR, 'home.png'),
      fullPage: false,
    });
  });

  test('catalogue', async ({ page }) => {
    await page.goto('/catalogue');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(BASELINE_DIR, 'catalogue.png'),
      fullPage: false,
    });
  });

  test('fiche-tour', async ({ page }) => {
    await page.goto(FICHE_TOUR_PATH);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(BASELINE_DIR, 'fiche-tour.png'),
      fullPage: false,
    });
  });
});
