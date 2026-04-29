/**
 * Story 4.2 — Capture post-migration de la home landing.
 *
 * Capture la home `/` après migration DS et la sauvegarde dans
 * `docs/epic-4-migration-screenshots/home-after.png` (desktop) +
 * `home-after-mobile.png` (375px). La baseline pré-migration est
 * `docs/epic-4-baseline-screenshots/home.png` (Story 4.1).
 *
 * Le diff visuel attendu (la home a changé volontairement) est documenté
 * dans `docs/story-4-2-visual-diff.md`.
 *
 * Pré-condition : serveur Next dev/prod sur :3000.
 *
 * Usage :
 *   cd TourGuideWeb && npx playwright test tests/visual/story-4-2-home-migration.spec.ts \
 *     --config=playwright.visual.config.ts
 */

import { test } from '@playwright/test';
import path from 'node:path';

const POST_DIR = path.resolve(
  __dirname,
  '../../../docs/epic-4-migration-screenshots',
);

test.describe('Story 4.2 — Home post-migration captures', () => {
  test('Home / desktop 1920×1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    // Wait for fonts to settle to avoid font-swap diff noise.
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(POST_DIR, 'home-after.png'),
      fullPage: true,
    });
  });

  test('Home / mobile 375×812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(POST_DIR, 'home-after-mobile.png'),
      fullPage: true,
    });
  });
});
