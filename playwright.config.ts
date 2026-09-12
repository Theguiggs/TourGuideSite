import dotenv from 'dotenv';
dotenv.config({ path: '.env.e2e' });

import { defineConfig } from '@playwright/test';

process.env.E2E_RUN_PREFIX ??= `local-${process.pid}-${Date.now()}`;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [
        ['html', { open: 'never' }],
        ['junit', { outputFile: 'test-results/e2e-results.xml' }],
        ['json', { outputFile: 'test-results/e2e-results.json' }],
        ['list'],
      ]
    : [['html', { open: 'never' }], ['list']],
  globalSetup: './e2e/fixtures/global-setup.ts',
  globalTeardown: './e2e/fixtures/global-teardown.ts',
  // CI prod build is slower than dev; bump default expect timeout from 5s to 15s
  // so that `expect(page.locator(...)).toBeVisible()` waits long enough for AppSync data to arrive
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:3000',
    // Les tests affirment le français ; le Studio suit la langue du navigateur
    // quand rien n'est mémorisé, et le Chromium de la CI est en en-US.
    locale: 'fr-FR',
    // Trace dès le PREMIER échec : la cause d'une régression E2E est souvent
    // dans le premier essai, pas dans le second.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: process.env.CI ? 'npm run build && npm start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 300_000 : 30_000,
    env: {
      NEXT_PUBLIC_USE_STUBS: process.env.NEXT_PUBLIC_USE_STUBS ?? 'false',
      FORCE_REAL_API: process.env.NEXT_PUBLIC_USE_STUBS === 'true' ? 'false' : 'true',
      // Les E2E sèment une visite puis l'attendent sur le catalogue dans la
      // seconde : pas de conservation du catalogue entre requêtes (le
      // dédoublonnage des lectures en vol reste actif).
      CATALOGUE_CACHE_TTL_MS: '0',
    },
  },
});
