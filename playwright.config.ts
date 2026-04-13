import dotenv from 'dotenv';
dotenv.config({ path: '.env.e2e' });

import { defineConfig } from '@playwright/test';

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
    trace: 'on-first-retry',
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
    },
  },
});
