# E2E Tests — TourGuideWeb

## Architecture

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts      # Cognito InitiateAuth → storageState per role
│   ├── global-setup.ts      # Pre-test: authenticate guide + admin
│   ├── global-teardown.ts   # Post-test: cleanup auth files
│   ├── seed.fixture.ts      # Reusable seed functions (tour, session, scenes)
│   ├── test-data.ts         # Config (emails, Cognito IDs, prefix helper)
│   ├── sample-audio.webm    # 1s silent WebM/Opus (~1KB)
│   └── sample-photo.jpg     # 1x1 white JPEG (~162B)
├── helpers/
│   ├── appsync-direct.ts    # Amplify typed client (seed/assert) + DynamoDB SDK (cleanup)
│   └── wait-helpers.ts      # pollUntil() for async AppSync assertions
├── tests/
│   ├── smoke.spec.ts        # 2 infra validation tests (auth + CRUD)
│   ├── guide-flow.spec.ts   # 5 tests: login, create, edit, preview, submit
│   ├── admin-flow.spec.ts   # 4 tests: queue, examine, revision, approve
│   ├── catalogue.spec.ts    # 2 tests: published visible, draft invisible
│   └── cross-platform.spec.ts # 3 tests: mobile session, finalize, catalogue
└── README.md
```

## Prerequisites

1. **Cognito test accounts** (created manually):
   - `e2e-guide@test.tourguide.app` — confirmed, with GuideProfile
   - `e2e-admin@test.tourguide.app` — confirmed, in `admin` group
   - `USER_PASSWORD_AUTH` enabled on Cognito App Client

2. **Amplify sandbox** running and stable

3. **`.env.e2e`** (gitignored) with real credentials:
   ```
   E2E_GUIDE_EMAIL=e2e-guide@test.tourguide.app
   E2E_GUIDE_PASSWORD=your-password
   E2E_ADMIN_EMAIL=e2e-admin@test.tourguide.app
   E2E_ADMIN_PASSWORD=your-password
   ```

4. **`amplify_outputs.json`** copied from `../TourGuide/amplify_outputs.json`

5. **AWS credentials** for DynamoDB cleanup (in env or AWS config)

## Run Locally

```bash
# All tests
npm run e2e

# With Playwright UI
npm run e2e:ui

# Smoke tests only
npx playwright test e2e/tests/smoke.spec.ts

# Specific suite
npx playwright test e2e/tests/guide-flow.spec.ts

# View report after run
npm run e2e:report
```

## Debug a Failure

1. **HTML report**: `playwright-report/index.html` (auto-generated)
2. **Traces**: available on first retry (`trace: 'on-first-retry'`)
3. **Screenshots**: captured on failure (`screenshot: 'only-on-failure'`)
4. **Videos**: kept on failure (`video: 'retain-on-failure'`)
5. **Logs**: check console output for `[auth.fixture]`, `[seed.fixture]` prefixed messages

## Add a Test

1. Create a new `e2e/tests/my-suite.spec.ts`
2. In `beforeAll`: seed data with `e2ePrefix('my-suite')` + call seed helpers
3. In `afterAll`: call `cleanupByPrefix(prefix)`
4. Use `data-testid` for element selection (never CSS classes)
5. Use `pollUntil()` for async assertions (never `page.waitForTimeout()`)
6. Use `expect(locator).toBeVisible()` (never hardcoded waits)

## Conventions

- **Prefix**: all seeded data uses `e2e-{suite}-{timestamp}` prefix
- **No `waitForTimeout()`**: always use `expect(locator).toBeVisible({ timeout })` or `pollUntil()`
- **Assertions by exact title**: search by prefix to avoid false positives between runs
- **Suites are autonomous**: each suite seeds and cleans its own data
- **Flakiness budget**: < 2%. Tests that flake 3 times → disabled + ticket
