import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** Passe publique LW-6 en lecture seule, indépendante des comptes de semis E2E. */
export default defineConfig({
  ...base,
  testMatch: '**/scene-player.spec.ts',
  globalSetup: undefined,
  globalTeardown: undefined,
  timeout: 90_000,
  webServer: { ...(Array.isArray(base.webServer) ? base.webServer[0] : base.webServer!), timeout: 90_000 },
});
