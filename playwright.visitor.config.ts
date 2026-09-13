import { defineConfig } from '@playwright/test';

/** Recette EV publique : serveur local de production, Cognito simulé, aucun semis. */
export default defineConfig({
  testDir: './e2e/tests', testMatch: 'visitor-auth.spec.ts', workers: 1, timeout: 90_000,
  use: { baseURL: 'http://localhost:3101', browserName: 'chromium', locale: 'fr-FR', trace: 'retain-on-failure' },
  expect: { timeout: 20_000 },
  webServer: { command: 'npm run start -- --port 3101', url: 'http://localhost:3101/connexion', reuseExistingServer: false, timeout: 90_000 },
});
