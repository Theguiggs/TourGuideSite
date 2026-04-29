/**
 * Story 4.1 — Config Playwright dédiée aux tests de régression visuelle.
 *
 * Séparée de `playwright.config.ts` (qui couvre les e2e fonctionnels) pour
 * éviter d'embarquer la fixture auth Cognito dans les snapshots et pour
 * garder un workflow `--update-snapshots` indépendant.
 *
 * Pré-condition : `npm run dev` démarré (ou laisser Playwright le lancer
 * via `webServer`).
 *
 * Usage :
 *   npx playwright test --config=playwright.visual.config.ts
 *   npx playwright test --config=playwright.visual.config.ts --update-snapshots
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  expect: {
    timeout: 15_000,
    // Default tolerance for `toHaveScreenshot` — overridable per-test.
    toHaveScreenshot: {
      maxDiffPixels: 100,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    // Forcer le rendering desktop reproductible.
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
