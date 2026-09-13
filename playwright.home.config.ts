import { defineConfig } from '@playwright/test';

/** EV-2 : production locale, catalogue en lecture seule, aucun compte ni semis. */
export default defineConfig({
  testDir: './e2e/tests', testMatch: 'visitor-home.spec.ts', workers: 1, timeout: 120_000,
  use: { baseURL: 'http://localhost:3102', browserName: 'chromium', locale: 'fr-FR', trace: 'retain-on-failure' },
  expect: { timeout: 30_000 },
  webServer: { command: 'npm run start -- --port 3102', url: 'http://localhost:3102/connexion', reuseExistingServer: false, timeout: 90_000 },
});
