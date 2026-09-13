import { defineConfig } from '@playwright/test';
/** Production locale, sans comptes ni semis distants. Construire avec npm run build avant cette passe. */
export default defineConfig({
  testDir: './e2e/tests', testMatch: 'pwa.spec.ts', workers: 1, timeout: 90_000,
  use: { baseURL: 'http://localhost:3100', browserName: 'chromium', trace: 'retain-on-failure' },
  expect: { timeout: 20_000 },
  webServer: { command: 'npm run start -- --port 3100', url: 'http://localhost:3100/hors-ligne', reuseExistingServer: false, timeout: 90_000 },
});
