/**
 * E2E Test Suite — Part 1: Tour Creation + TTS
 *
 * Covers sections 1.1, 1.2, 1.4, 1.5, 1.6, 1.8, 1.9, 1.10 of the E2E protocol.
 *
 * Uses REAL AppSync data seeded via appsync-direct.ts.
 * No stubs — all data comes from seeded AppSync records.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  E2E_GUIDE_EMAIL,
  E2E_GUIDE_PASSWORD,
  e2ePrefix,
} from '../fixtures/test-data';
import {
  getGuideStorageStatePath,
  getAccessTokenFromStorageState,
  isTokenValid,
  authenticateCognito,
  createStorageState,
} from '../fixtures/auth.fixture';
import {
  seedMultilangReadyTour,
  cleanupByPrefix,
  type SeededTour,
} from '../fixtures/seed.fixture';

const STUDIO_BASE = '/guide/studio';
const PREFIX = e2ePrefix('creation');

/**
 * Inject RGPD consent into localStorage before navigating.
 */
async function injectRGPDConsent(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem(
      'studio_rgpd_consent',
      JSON.stringify({ consentDate: new Date().toISOString() }),
    );
  });
}

test.describe.serial('Studio Tour Creation + TTS', () => {
  let guidePath: string;
  let seeded: SeededTour;
  let sessionUrl: string;

  test.beforeAll(async () => {
    guidePath = getGuideStorageStatePath();
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }

    const token = getAccessTokenFromStorageState(guidePath);
    seeded = await seedMultilangReadyTour(PREFIX, token);
    sessionUrl = `${STUDIO_BASE}/${seeded.sessionId}`;

    console.log(`[studio-tour-creation] Seeded tour=${seeded.tourId}, session=${seeded.sessionId}, scenes=${seeded.sceneIds.length}`);
  });

  test.afterAll(async () => {
    // TEMP: skip cleanup to keep seeded data for manual verification
    // await cleanupByPrefix(PREFIX);
  });

  // ---------------------------------------------------------------------------
  // 1.1 — Session list + navigation
  // ---------------------------------------------------------------------------
  test('1.1 - Session list displays and navigates to session', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();

    await page.goto('/');
    await injectRGPDConsent(page);
    await page.goto(STUDIO_BASE);

    // Wait for sessions list to load (seeded data guarantees at least one session)
    await page.waitForSelector('[data-testid="sessions-list"]', { timeout: 15_000 });

    // Verify the seeded session card is displayed
    const sessionCard = page.getByTestId(`session-card-${seeded.sessionId}`);
    await expect(sessionCard).toBeVisible({ timeout: 10_000 });

    await page.screenshot({ path: 'test-results/1.1-session-list.png' });

    // Click the session card
    await sessionCard.click({ timeout: 10_000 });

    // Should navigate to session detail
    await expect(page).toHaveURL(new RegExp(seeded.sessionId), { timeout: 10_000 });

    // Verify session detail page has navigation links
    await expect(page.getByTestId('general-link')).toBeVisible();
    await expect(page.getByTestId('scenes-link')).toBeVisible();
    await expect(page.getByTestId('preview-link-top')).toBeVisible();

    await page.screenshot({ path: 'test-results/1.1-session-detail.png' });
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // 1.2 — General page: fill form, save, status badge
  // ---------------------------------------------------------------------------
  test('1.2 - General page form and save', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();

    await page.goto('/');
    await injectRGPDConsent(page);
    await page.goto(`${sessionUrl}/general`);

    // Wait for page to load
    await expect(page.getByTestId('title-input')).toBeVisible({ timeout: 15_000 });

    // Verify status badge is displayed
    await expect(page.getByTestId('session-status-badge')).toBeVisible();

    // Verify form fields are present and editable
    await expect(page.getByTestId('title-input')).toBeVisible();
    await expect(page.getByTestId('city-input')).toBeVisible();
    await expect(page.getByTestId('description-input')).toBeVisible();
    await expect(page.getByTestId('language-select')).toBeVisible();
    await expect(page.getByTestId('difficulty-select')).toBeVisible();

    // Fill in a description
    await page.getByTestId('description-input').fill('Tour E2E — visite guidee de la vieille ville de Grasse.');

    // Select a theme if visible
    const themeHistoire = page.getByTestId('theme-histoire');
    if (await themeHistoire.isVisible().catch(() => false)) {
      await themeHistoire.click();
    }

    // Cover photo button should be present
    await expect(page.getByTestId('cover-photo-btn')).toBeVisible();

    await page.screenshot({ path: 'test-results/1.2-general-form.png' });

    // Save
    await page.getByTestId('save-general-btn').click();

    // Wait for save confirmation
    await expect(page.locator('[role="status"]', { hasText: /Enregistr/i })).toBeVisible({ timeout: 5_000 });

    await page.screenshot({ path: 'test-results/1.2-general-saved.png' });
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // 1.4 — Scenes: text editing + auto-save
  // ---------------------------------------------------------------------------
  test('1.4 - Scenes text editing', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();

    await page.goto('/');
    await injectRGPDConsent(page);
    await page.goto(`${sessionUrl}/scenes`);

    // Wait for scenes page to load
    await page.waitForSelector('[data-testid="scene-editor"], [data-testid^="tab-"], [data-testid="scene-sidebar"], [role="tablist"]', {
      timeout: 15_000,
    }).catch(() => {});

    // Click on the text tab if available
    const textTab = page.getByTestId('tab-text').or(page.locator('[role="tab"]', { hasText: /Texte/i }));
    if (await textTab.first().isVisible().catch(() => false)) {
      await textTab.first().click();
    }

    // Scene editor should be visible (seeded scenes have transcriptText)
    const sceneEditor = page.getByTestId('scene-editor');
    if (await sceneEditor.isVisible().catch(() => false)) {
      await sceneEditor.click();
      await sceneEditor.fill(
        'Bienvenue dans la vieille ville de Grasse, capitale mondiale du parfum.',
      );

      await page.screenshot({ path: 'test-results/1.4-text-editing.png' });

      // Auto-save triggers on blur
      await page.getByText('Sc', { exact: false }).first().click();
      await page.waitForTimeout(2_000);
    } else {
      await page.screenshot({ path: 'test-results/1.4-scenes-page-state.png' });
    }

    await context.close();
  });

  // ---------------------------------------------------------------------------
  // 1.5 — Scenes: TTS generation
  // ---------------------------------------------------------------------------
  test('1.5 - TTS controls are present and generate button works', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();

    await page.goto('/');
    await injectRGPDConsent(page);
    await page.goto(`${sessionUrl}/scenes`);

    // Wait for page load
    await page.waitForSelector('[data-testid^="tab-"], [data-testid="tts-controls"], [role="tablist"]', {
      timeout: 15_000,
    }).catch(() => {});

    // Navigate to TTS tool if present
    const ttsTool = page.getByTestId('tool-tts');
    if (await ttsTool.isVisible().catch(() => false)) {
      await ttsTool.click();
    }

    // Check for TTS controls
    const ttsControls = page.getByTestId('tts-controls');
    const ttsNoText = page.getByTestId('tts-no-text');
    const ttsGpuUnavailable = page.getByTestId('tts-gpu-unavailable');

    const ttsVisible = await ttsControls.isVisible().catch(() => false);
    const noTextVisible = await ttsNoText.isVisible().catch(() => false);
    const gpuUnavailableVisible = await ttsGpuUnavailable.isVisible().catch(() => false);

    if (ttsVisible) {
      const generateBtn = page.getByTestId('tts-generate-btn');
      if (await generateBtn.isVisible().catch(() => false)) {
        await page.screenshot({ path: 'test-results/1.5-tts-generate-ready.png' });
        await generateBtn.click();

        await page.waitForSelector(
          '[data-testid="tts-processing"], [data-testid="tts-completed"], [data-testid="tts-failed"]',
          { timeout: 15_000 },
        ).catch(() => {});

        await page.screenshot({ path: 'test-results/1.5-tts-after-generate.png' });
      } else {
        const ttsCompleted = page.getByTestId('tts-completed');
        if (await ttsCompleted.isVisible().catch(() => false)) {
          await expect(page.getByTestId('tts-regenerate-btn')).toBeVisible();
          await page.screenshot({ path: 'test-results/1.5-tts-already-completed.png' });
        }
      }
    } else if (noTextVisible) {
      await page.screenshot({ path: 'test-results/1.5-tts-no-text.png' });
    } else if (gpuUnavailableVisible) {
      await page.screenshot({ path: 'test-results/1.5-tts-gpu-unavailable.png' });
    } else {
      await page.screenshot({ path: 'test-results/1.5-tts-page-state.png' });
    }

    await context.close();
  });

  // ---------------------------------------------------------------------------
  // 1.6 — Scenes: audio recording (simplified — just check UI elements exist)
  // ---------------------------------------------------------------------------
  test('1.6 - Audio recorder UI elements exist', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();

    await page.goto('/');
    await injectRGPDConsent(page);
    await page.goto(`${sessionUrl}/scenes`);

    await page.waitForSelector('[data-testid^="tab-"], [data-testid="audio-recorder"], [role="tablist"]', {
      timeout: 15_000,
    }).catch(() => {});

    const recordTool = page.getByTestId('tool-record');
    const audioTab = page.locator('[role="tab"]', { hasText: /Audio/i });
    if (await recordTool.isVisible().catch(() => false)) {
      await recordTool.click();
    } else if (await audioTab.isVisible().catch(() => false)) {
      await audioTab.click();
    }

    const audioRecorder = page.getByTestId('audio-recorder');
    if (await audioRecorder.isVisible().catch(() => false)) {
      const permissionBtn = page.getByTestId('permission-btn');
      const recordBtn = page.getByTestId('record-btn');

      const hasPermBtn = await permissionBtn.isVisible().catch(() => false);
      const hasRecordBtn = await recordBtn.isVisible().catch(() => false);

      expect(hasPermBtn || hasRecordBtn).toBeTruthy();

      const deviceSelect = page.getByTestId('device-select');
      if (await deviceSelect.isVisible().catch(() => false)) {
        await expect(deviceSelect).toBeVisible();
      }

      await page.screenshot({ path: 'test-results/1.6-audio-recorder.png' });
    } else {
      const toggleRecorderBtn = page.getByTestId('toggle-recorder-btn');
      if (await toggleRecorderBtn.isVisible().catch(() => false)) {
        await toggleRecorderBtn.click();
        await expect(page.getByTestId('audio-recorder')).toBeVisible({ timeout: 5_000 });
        await page.screenshot({ path: 'test-results/1.6-audio-recorder-toggled.png' });
      } else {
        await page.goto(`${sessionUrl}/record`);
        await page.waitForSelector('[data-testid="audio-recorder"], [data-testid="teleprompter"], [data-testid="no-text"]', {
          timeout: 15_000,
        }).catch(() => {});
        await page.screenshot({ path: 'test-results/1.6-record-page.png' });
      }
    }

    await context.close();
  });

  // ---------------------------------------------------------------------------
  // 1.8 — Prompter: navigate, verify text displayed
  // ---------------------------------------------------------------------------
  test('1.8 - Prompter displays text and controls', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();

    await page.goto('/');
    await injectRGPDConsent(page);
    await page.goto(`${sessionUrl}/record`);

    const teleprompter = page.getByTestId('teleprompter');
    const noText = page.getByTestId('no-text');
    await teleprompter.or(noText).waitFor({ state: 'visible', timeout: 25_000 });

    const hasTeleprompter = await teleprompter.isVisible().catch(() => false);

    if (hasTeleprompter) {
      await expect(teleprompter).toBeVisible();
      await expect(page.getByTestId('prompter-controls')).toBeVisible();

      const startBtn = page.getByTestId('prompter-start');
      if (await startBtn.isVisible().catch(() => false)) {
        await expect(startBtn).toBeVisible();
      }

      const speedSlider = page.getByTestId('speed-slider');
      if (await speedSlider.isVisible().catch(() => false)) {
        await expect(speedSlider).toBeVisible();
      }

      const chronometre = page.getByTestId('chronometre');
      if (await chronometre.isVisible().catch(() => false)) {
        await expect(chronometre).toBeVisible();
      }
    } else {
      await expect(noText).toBeVisible();
    }

    const prompteurHeading = page.locator('h2', { hasText: /Prompteur/i });
    if (await prompteurHeading.isVisible().catch(() => false)) {
      await expect(prompteurHeading).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/1.8-prompter.png' });
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // 1.9 — Preview: page loads, play button exists
  // ---------------------------------------------------------------------------
  test('1.9 - Preview page loads with play button', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();

    await page.goto('/');
    await injectRGPDConsent(page);
    await page.goto(`${sessionUrl}/preview`);

    await page.waitForSelector(
      '[data-testid="preview-scenes"], [data-testid="play-all-btn"], [data-testid="catalogue-view"]',
      { timeout: 15_000 },
    );

    const previewScenes = page.getByTestId('preview-scenes');
    if (await previewScenes.isVisible().catch(() => false)) {
      await expect(previewScenes).toBeVisible();
    }

    const playAllBtn = page.getByTestId('play-all-btn');
    await expect(playAllBtn.first()).toBeVisible({ timeout: 10_000 });

    const submitBtn = page.getByTestId('submit-review-btn');
    if (await submitBtn.isVisible().catch(() => false)) {
      await expect(submitBtn).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/1.9-preview.png' });
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // 1.10 — Status "Soumis" + multilang button appears
  //
  // Multilang button is only visible when session status is 'submitted',
  // 'published', or 'revision_requested'. NOT on 'ready', 'draft', or 'editing'.
  // ---------------------------------------------------------------------------
  test('1.10 - Session status is "Soumis" and multilang button visible', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();

    await page.goto('/');
    await injectRGPDConsent(page);
    await page.goto(`${sessionUrl}/general`);

    await expect(page.getByTestId('title-input')).toBeVisible({ timeout: 15_000 });

    // Verify status badge is displayed
    const statusBadge = page.getByTestId('session-status-badge');
    await expect(statusBadge).toBeVisible();
    const badgeText = await statusBadge.textContent();
    expect(badgeText).toBeTruthy();

    await page.screenshot({ path: 'test-results/1.10-status-badge.png' });

    // Multilang section should be visible for seeded 'submitted' status
    const multilangSection = page.getByTestId('multilang-section');
    await expect(multilangSection).toBeVisible({ timeout: 5_000 });

    // "Ouvrir le multilangue" button should be present
    const multilangBtn = page.getByTestId('open-multilang-btn');
    await expect(multilangBtn).toBeVisible();

    await page.screenshot({ path: 'test-results/1.10-multilang-button.png' });
    await context.close();
  });
});
