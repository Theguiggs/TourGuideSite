import { test, expect } from '@playwright/test';
import {
  E2E_GUIDE_EMAIL,
  E2E_GUIDE_PASSWORD,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  e2ePrefix,
} from '../fixtures/test-data';
import {
  getAdminStorageStatePath,
  getGuideStorageStatePath,
  isTokenValid,
  authenticateCognito,
  createStorageState,
  getAccessTokenFromStorageState,
} from '../fixtures/auth.fixture';
import { seedSubmittedTour, cleanupByPrefix } from '../fixtures/seed.fixture';
import { queryTourById } from '../helpers/appsync-direct';
import { pollUntil } from '../helpers/wait-helpers';

const prefix = e2ePrefix('admin');

test.describe('Admin Flow', () => {
  let adminPath: string;
  let guidePath: string;
  let guideToken: string;
  let seeded: Awaited<ReturnType<typeof seedSubmittedTour>>;

  test.beforeAll(async () => {
    adminPath = getAdminStorageStatePath();
    guidePath = getGuideStorageStatePath();

    // Ensure tokens are valid
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }
    if (!isTokenValid(adminPath)) {
      const tokens = await authenticateCognito(E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
      createStorageState(tokens, E2E_ADMIN_EMAIL, adminPath);
    }

    guideToken = getAccessTokenFromStorageState(guidePath);

    // Seed a submitted tour for moderation
    seeded = await seedSubmittedTour(prefix, guideToken);
  });

  test.afterAll(async () => {
    await cleanupByPrefix(prefix);
  });

  test('1 - Moderation queue shows submitted tour', async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminPath });
    const page = await context.newPage();

    await page.goto('/admin/moderation');
    await expect(page.getByText(prefix, { exact: false }).first()).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test('2 - Examine tour details', async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminPath });
    const page = await context.newPage();

    await page.goto('/admin/moderation');
    // Click "Examiner" link for our seeded tour
    const row = page.getByTestId(`moderation-item-${seeded.moderationItemId}`);
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByText('Examiner').click();

    // Should navigate to moderation detail page
    await expect(page).toHaveURL(/\/admin\/moderation\//, { timeout: 10_000 });

    // Tour title should be visible
    await expect(page.getByText(`${prefix} Tour Soumis`, { exact: false })).toBeVisible();

    await context.close();
  });

  test('3 - Send back for revision', async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminPath });
    const page = await context.newPage();

    await page.goto(`/admin/moderation/${seeded.moderationItemId}`);

    // Click "Renvoyer au guide"
    await page.getByTestId('revision-btn').click();

    // Fill feedback
    await page.getByTestId('feedback-input').fill(
      'Veuillez améliorer la qualité audio de la scène 1 et ajouter plus de détails historiques.',
    );

    // Submit revision
    await page.getByRole('button', { name: /Renvoyer au guide/i }).last().click();

    // Wait for success feedback in the UI
    await expect(
      page.getByText(/renvoyé|corrections|revision/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test('4 - Approve tour', async ({ browser }) => {
    // Seed a fresh submitted tour for approval
    const approvePrefix = `${prefix}-approve`;
    const freshSeeded = await seedSubmittedTour(approvePrefix, guideToken);

    const context = await browser.newContext({ storageState: adminPath });
    const page = await context.newPage();

    await page.goto(`/admin/moderation/${freshSeeded.moderationItemId}`);

    // Check all checklist items
    const checkboxes = page.getByRole('checkbox');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      // Click the parent label to trigger React's onChange
      const checkbox = checkboxes.nth(i);
      if (!(await checkbox.isChecked())) {
        await checkbox.dispatchEvent('click');
        // Wait a bit for React state update
        await page.waitForTimeout(200);
      }
    }
    // Verify approve button becomes enabled
    await expect(page.getByTestId('approve-btn')).toBeEnabled({ timeout: 5_000 });

    // Click approve
    await page.getByTestId('approve-btn').click();

    // Poll AppSync for tour status = published
    const tour = await pollUntil(
      () => queryTourById(freshSeeded.tourId, guideToken),
      (t) => t?.status === 'published',
      { timeout: 15_000 },
    );
    expect(tour?.status).toBe('published');

    // Cleanup the fresh seeded tour
    await cleanupByPrefix(approvePrefix);

    await context.close();
  });
});
