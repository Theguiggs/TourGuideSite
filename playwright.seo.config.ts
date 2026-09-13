import { defineConfig } from '@playwright/test';

/**
 * Passe SEO : production locale, catalogue en lecture seule, aucun compte.
 *
 * Le mode bouchon est délibéré. Le contrat d'indexation se lit sur des données
 * dont on connaît les traductions — une visite bilingue, une visite française
 * seule, une visite à trois langues — et non sur un catalogue de production qui
 * change sous les pieds de l'épreuve. Aucune donnée n'est semée ni supprimée.
 */
export default defineConfig({
  testDir: './e2e/tests',
  testMatch: 'seo-multilingue.spec.ts',
  workers: 1,
  timeout: 120_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3210',
    browserName: 'chromium',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  expect: { timeout: 30_000 },
  webServer: {
    command: 'npm run start -- --port 3210',
    url: 'http://localhost:3210/robots.txt',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_USE_STUBS: 'true',
      FORCE_REAL_API: 'false',
    },
  },
});
