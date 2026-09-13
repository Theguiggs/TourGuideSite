import { defineConfig } from '@playwright/test';

/** Recette visiteur locale sans création de compte ni paiement réel. */
export default defineConfig({
  testDir: './e2e/tests', testMatch: ['visitor-experience.spec.ts', 'visitor-auth.spec.ts', 'visitor-home.spec.ts'],
  workers: 1, timeout: 120_000,
  use: { baseURL: 'http://localhost:3102', browserName: 'chromium', locale: 'fr-FR', trace: 'retain-on-failure' },
  expect: { timeout: 30_000 },
  webServer: { command: 'npm run start -- --port 3102', url: 'http://localhost:3102/connexion', reuseExistingServer: false, timeout: 90_000 },
});
