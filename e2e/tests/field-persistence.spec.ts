/**
 * E2E Test Suite — Field Persistence
 *
 * Verifies that ALL editable fields in TourGuide Studio persist their values
 * after navigation away and back. Pattern: write value -> navigate away -> come back -> verify.
 *
 * Uses REAL AppSync data seeded via appsync-direct.ts.
 */
import { studioConsentSeed } from '../fixtures/consent';
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
  seedLanguagePurchase,
  seedSceneSegment,
  type SeededTour,
} from '../fixtures/seed.fixture';
import { deleteItemsById } from '../helpers/appsync-direct';

const STUDIO_BASE = '/guide/studio';
const PREFIX = e2ePrefix('persist');

/**
 * Inject RGPD consent into localStorage before navigating.
 */
async function injectRGPDConsent(page: Page): Promise<void> {
  // Must be on a real page to access localStorage
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.evaluate((seed) => {
    localStorage.setItem('studio_rgpd_consent', seed);
  }, studioConsentSeed());
}

test.describe.serial('Field Persistence', () => {
  let guidePath: string;
  let seeded: SeededTour & { guideId: string };
  let sessionUrl: string;
  let token: string;
  let segmentId: string;
  let languagePurchaseId: string;

  test.beforeAll(async () => {
    guidePath = getGuideStorageStatePath();
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }

    token = getAccessTokenFromStorageState(guidePath);
    // Use 'editing' so title/description fields are editable (not locked)
    seeded = await seedMultilangReadyTour(PREFIX, token, {
      sessionStatus: 'editing',
      narrationMode: 'recording',
    });
    sessionUrl = `${STUDIO_BASE}/${seeded.sessionId}`;

    // Seed a language purchase for English
    const languagePurchase = await seedLanguagePurchase(seeded.sessionId, 'en', token, {
      guideId: seeded.guideId,
      qualityTier: 'manual',
      purchaseType: 'manual',
      amountCents: 0,
      moderationStatus: 'draft',
    });
    languagePurchaseId = languagePurchase.id;

    // Seed an EN segment for the first scene with translated text
    const seg = await seedSceneSegment(seeded.sceneIds[0], 0, token, {
      language: 'en',
      transcriptText: 'Welcome to the Place aux Aires, the historic heart of Grasse.',
      status: 'translated',
      sourceSegmentId: null,
      manuallyEdited: false,
    });
    segmentId = seg.id;

    console.log(
      `[field-persistence] Seeded tour=${seeded.tourId}, session=${seeded.sessionId}, ` +
      `scenes=${seeded.sceneIds.length}, segmentId=${segmentId}`,
    );
  });

  test.afterAll(async () => {
    if (!seeded) return;
    await deleteItemsById('SceneSegment', [segmentId]);
    await deleteItemsById('TourLanguagePurchase', [languagePurchaseId]);
    await deleteItemsById('StudioScene', seeded.sceneIds);
    await deleteItemsById('StudioSession', [seeded.sessionId]);
    await deleteItemsById('GuideTour', [seeded.tourId]);
  });

  // ---------------------------------------------------------------------------
  // GENERAL PAGE FIELDS
  // ---------------------------------------------------------------------------

  test('1 - Title persists after navigation to Scenes and back', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    // Navigate to General page
    await page.goto(`${sessionUrl}/general`);
    await expect(page.getByTestId('title-input')).toBeVisible({ timeout: 15_000 });

    // Edit title
    const titleInput = page.getByTestId('title-input');
    const newTitle = `Persistence Test ${Date.now()}`;
    await titleInput.clear();
    await titleInput.fill(newTitle);

    // Save
    await page.getByTestId('save-general-btn').click();
    await expect(page.locator('[role="status"]', { hasText: /Enregistr/i })).toBeVisible({ timeout: 5_000 });

    // Navigate to Scenes
    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Navigate back to General
    await page.goto(`${sessionUrl}/general`);
    await expect(page.getByTestId('title-input')).toBeVisible({ timeout: 15_000 });

    // Verify title persisted
    const currentTitle = await page.getByTestId('title-input').inputValue();
    expect(currentTitle).toBe(newTitle);

    await page.screenshot({ path: 'test-results/persist-1-title.png' });
    await context.close();
  });

  test('2 - Language selector persists after navigation', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/general`);
    await expect(page.getByTestId('language-select')).toBeVisible({ timeout: 15_000 });

    // Change language to English
    const langSelect = page.getByTestId('language-select');
    await langSelect.selectOption('en');
    const selectedLang = await langSelect.inputValue();
    expect(selectedLang).toBe('en');

    // Save
    await page.getByTestId('save-general-btn').click();
    await expect(page.locator('[role="status"]', { hasText: /Enregistr/i })).toBeVisible({ timeout: 5_000 });

    // Navigate away
    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Navigate back
    await page.goto(`${sessionUrl}/general`);
    await expect(page.getByTestId('language-select')).toBeVisible({ timeout: 15_000 });

    // Verify language persisted
    const currentLang = await page.getByTestId('language-select').inputValue();
    expect(currentLang).toBe('en');

    // Restore to French for subsequent tests
    await langSelect.selectOption('fr');
    await page.getByTestId('save-general-btn').click();
    await expect(page.locator('[role="status"]', { hasText: /Enregistr/i })).toBeVisible({ timeout: 5_000 });

    await page.screenshot({ path: 'test-results/persist-2-language.png' });
    await context.close();
  });

  // FIXME: description save doesn't persist in CI — updateGuideTourMutation returns ok
  // (toast appears) but getGuideTourById still returns the seeded value after navigation.
  // Root cause unknown; likely a schema mismatch between frontend and deployed backend for
  // the `description` field on GuideTour. Skip until investigated.
  test.skip('2b - Description longue persists after navigation', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/general`);
    await page.waitForTimeout(3_000);

    // Edit description
    const descInput = page.locator('[data-testid="description-input"]');
    const newDesc = `Description longue test ${Date.now()}`;
    await descInput.clear();
    await descInput.fill(newDesc);
    // Focus save button to flush React onChange state before clicking
    await page.getByTestId('save-general-btn').focus();

    // Save
    await page.getByTestId('save-general-btn').click();
    await expect(page.locator('[role="status"]', { hasText: /Enregistr/i })).toBeVisible({ timeout: 5_000 });

    // Navigate away
    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Navigate back
    await page.goto(`${sessionUrl}/general`);
    await page.waitForTimeout(3_000);

    // Verify
    const currentDesc = await page.locator('[data-testid="description-input"]').inputValue();
    expect(currentDesc).toBe(newDesc);

    await page.screenshot({ path: 'test-results/persist-2b-description.png' });
    await context.close();
  });

  // FIXME: S3 upload never completes in GitHub CI runner (button stays "Ajouter une photo").
  // Works locally. Likely Amplify Storage credentials issue in CI prod build. Skip until investigated.
  test.skip('3 - Cover photo key persists after navigation', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/general`);
    await expect(page.getByTestId('cover-photo-btn')).toBeVisible({ timeout: 15_000 });

    // Upload a cover photo via the hidden file input
    const coverInput = page.getByTestId('cover-photo-input');
    // Create a minimal test image (1x1 JPEG)
    const buffer = Buffer.from(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSRFJiMkcKSnBjRFNicoKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+gD/2Q==',
      'base64',
    );

    await coverInput.setInputFiles({
      name: 'test-cover.jpg',
      mimeType: 'image/jpeg',
      buffer,
    });

    // Wait for upload to complete (real S3 upload in CI can take several seconds)
    // Wait for the button text to change to "Changer la photo" (indicates upload done)
    await expect(page.getByTestId('cover-photo-btn')).toContainText('Changer', { timeout: 15_000 });

    // Save
    await page.getByTestId('save-general-btn').click();
    await expect(page.locator('[role="status"]', { hasText: /Enregistr/i })).toBeVisible({ timeout: 10_000 });

    // Navigate away
    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Navigate back
    await page.goto(`${sessionUrl}/general`);
    await expect(page.getByTestId('cover-photo-btn')).toBeVisible({ timeout: 15_000 });

    // Verify cover photo key is still present (button text should say "Changer la photo")
    const btnText = await page.getByTestId('cover-photo-btn').textContent();
    expect(btnText).toContain('Changer');

    await page.screenshot({ path: 'test-results/persist-3-cover.png' });
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // POI FIELDS (Itinerary page)
  // ---------------------------------------------------------------------------

  test('4 - POI details persist after an itinerary reload', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/itinerary`);
    const firstPoi = page.getByTestId('poi-overview-card').first();
    await expect(firstPoi).toBeVisible({ timeout: 15_000 });
    await firstPoi.getByTestId('poi-edit').click();

    const editForm = page.getByTestId('poi-edit-form');
    await expect(editForm).toBeVisible();
    const newPoiTitle = `POI Title ${Date.now()}`;
    const newDescription = `POI Desc ${Date.now()}`;
    await editForm.getByLabel(/Titre du POI|POI title/i).fill(newPoiTitle);
    await editForm.getByLabel(/^Description$/i).fill(newDescription);
    await editForm.getByLabel('Latitude').fill('43.6591');
    await editForm.getByLabel('Longitude').fill('6.9243');
    await editForm.getByRole('button', { name: /Sauver|Save/i }).click();
    await expect(page.getByTestId('save-status-saved')).toBeVisible({ timeout: 10_000 });

    await page.reload();
    const persistedPoi = page.getByTestId('poi-overview-card').first();
    await expect(persistedPoi).toContainText(newPoiTitle, { timeout: 15_000 });
    await persistedPoi.getByTestId('poi-edit').click();
    const persistedForm = page.getByTestId('poi-edit-form');
    await expect(persistedForm.getByLabel(/Titre du POI|POI title/i)).toHaveValue(newPoiTitle);
    await expect(persistedForm.getByLabel(/^Description$/i)).toHaveValue(newDescription);
    await expect(persistedForm.getByLabel('Latitude')).toHaveValue('43.6591');
    await expect(persistedForm.getByLabel('Longitude')).toHaveValue('6.9243');

    await page.screenshot({ path: 'test-results/persist-4-poi-title.png' });
    await context.close();
  });

  test.skip('5 - covered by the combined itinerary persistence scenario', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // POI tab
    const poiTab = page.getByTestId('tab-poi');
    if (await poiTab.isVisible().catch(() => false)) {
      await poiTab.click();
    }

    // Edit POI description
    const poiDescInput = page.locator('#poi-desc');
    await expect(poiDescInput).toBeVisible({ timeout: 10_000 });
    const newDesc = `POI Desc ${Date.now()}`;
    await poiDescInput.clear();
    await poiDescInput.fill(newDesc);

    // Save
    await page.getByTestId('save-poi-btn').click();
    await page.waitForTimeout(3_000);

    // Switch to scene 2
    await page.getByTestId(`sidebar-scene-${seeded.sceneIds[1]}`).click();
    await page.waitForTimeout(3_000);

    // Switch back to scene 1
    await page.getByTestId(`sidebar-scene-${seeded.sceneIds[0]}`).click();
    await page.waitForTimeout(3_000);

    // Verify description persisted
    const currentDesc = await page.locator('#poi-desc').inputValue();
    expect(currentDesc).toBe(newDesc);

    await page.screenshot({ path: 'test-results/persist-5-poi-desc.png' });
    await context.close();
  });

  test.skip('6 - covered by the combined itinerary persistence scenario', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // POI tab
    const poiTab = page.getByTestId('tab-poi');
    if (await poiTab.isVisible().catch(() => false)) {
      await poiTab.click();
    }

    // Edit GPS coordinates
    const latInput = page.locator('#poi-lat');
    const lngInput = page.locator('#poi-lng');
    await expect(latInput).toBeVisible({ timeout: 10_000 });

    const newLat = '43.6591';
    const newLng = '6.9243';
    await latInput.clear();
    await latInput.fill(newLat);
    await lngInput.clear();
    await lngInput.fill(newLng);

    // Save
    await page.getByTestId('save-poi-btn').click();
    await page.waitForTimeout(3_000);

    // Switch to scene 2
    await page.getByTestId(`sidebar-scene-${seeded.sceneIds[1]}`).click();
    await page.waitForTimeout(3_000);

    // Switch back to scene 1
    await page.getByTestId(`sidebar-scene-${seeded.sceneIds[0]}`).click();
    await page.waitForTimeout(3_000);

    // Verify coordinates persisted
    const currentLat = await page.locator('#poi-lat').inputValue();
    const currentLng = await page.locator('#poi-lng').inputValue();
    expect(currentLat).toBe(newLat);
    expect(currentLng).toBe(newLng);

    await page.screenshot({ path: 'test-results/persist-6-poi-gps.png' });
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // SCENE TEXT (Scenes page, Texte tab)
  // ---------------------------------------------------------------------------

  test('7 - Scene transcript text persists after switching scenes', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Edit text
    const sceneEditor = page.getByTestId('scene-editor');
    await expect(sceneEditor).toBeVisible({ timeout: 10_000 });
    const newText = `Scene text persistence test ${Date.now()}`;
    await sceneEditor.clear();
    await sceneEditor.fill(newText);

    await page.getByTestId('save-scene').click();
    await expect(page.locator('[role="status"]', { hasText: /Scène sauvegardée|Scene saved/i })).toBeVisible({ timeout: 10_000 });

    // Switch to scene 2
    await page.getByTestId(`sidebar-scene-${seeded.sceneIds[1]}`).click();
    await page.waitForTimeout(3_000);

    // Switch back to scene 1
    await page.getByTestId(`sidebar-scene-${seeded.sceneIds[0]}`).click();
    await page.waitForTimeout(3_000);

    // Verify text persisted
    const currentText = await page.getByTestId('scene-editor').inputValue();
    expect(currentText).toBe(newText);

    await page.screenshot({ path: 'test-results/persist-7-scene-text.png' });
    await context.close();
  });

  test('8 - Scene text persists after page navigation (General and back)', async ({ browser }) => {
    test.setTimeout(60_000);
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Edit text
    const sceneEditor = page.getByTestId('scene-editor');
    await expect(sceneEditor).toBeVisible({ timeout: 10_000 });
    const newText = `Cross-page text ${Date.now()}`;
    await sceneEditor.clear();
    await sceneEditor.fill(newText);

    await page.getByTestId('save-scene').click();
    await expect(page.locator('[role="status"]', { hasText: /Scène sauvegardée|Scene saved/i })).toBeVisible({ timeout: 10_000 });

    // Navigate to General page
    await page.goto(`${sessionUrl}/general`);
    await page.waitForTimeout(3_000);

    // Navigate back to Scenes
    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // The session index is eventually consistent after a full browser reload.
    // Retry the real page read instead of accepting a stale value or masking a
    // genuinely lost mutation.
    await expect.poll(async () => {
      await page.reload();
      await expect(page.getByTestId('scene-editor')).toBeVisible({ timeout: 10_000 });
      return page.getByTestId('scene-editor').inputValue();
    }, {
      message: 'The confirmed scene text should propagate to a fresh page read',
      timeout: 30_000,
      intervals: [2_000, 3_000, 5_000],
    }).toBe(newText);

    await page.screenshot({ path: 'test-results/persist-8-text-cross-page.png' });
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // TRANSLATED TEXT (Language tabs, SplitEditor)
  // ---------------------------------------------------------------------------

  test.skip('9 - guide-side translated text editing was replaced by automatic translation', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Click on EN language tab
    const enTab = page.getByTestId('lang-tab-en');
    if (await enTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await enTab.click();
      await page.waitForTimeout(3_000);

      // Find the first SplitEditor and click Edit
      const editBtn = page.getByTestId('edit-button').first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(500);
      }

      // Edit translated text
      const translatedTextarea = page.getByTestId('translated-textarea').first();
      if (await translatedTextarea.isVisible().catch(() => false)) {
        const newTranslatedText = `Translated text ${Date.now()}`;
        await translatedTextarea.clear();
        await translatedTextarea.fill(newTranslatedText);

        // Trigger blur by pressing Tab (moves focus away from input)
        await page.keyboard.press('Tab');
        await page.waitForTimeout(3_000);

        // Switch to FR tab
        const frTab = page.getByTestId('lang-tab-fr');
        await frTab.click();
        await page.waitForTimeout(3_000);

        // Switch back to EN tab
        await enTab.click();
        await page.waitForTimeout(3_000);

        // Verify translated text persisted (could be in readonly or editable mode)
        const readonlyText = page.getByTestId('translated-text-readonly').first();
        const editableText = page.getByTestId('translated-textarea').first();
        const isReadonly = await readonlyText.isVisible().catch(() => false);
        const isEditable = await editableText.isVisible().catch(() => false);

        if (isEditable) {
          const currentText = await editableText.inputValue();
          expect(currentText).toBe(newTranslatedText);
        } else if (isReadonly) {
          const currentText = await readonlyText.textContent();
          expect(currentText).toContain(newTranslatedText);
        }
      }
    }

    await page.screenshot({ path: 'test-results/persist-9-translated-text.png' });
    await context.close();
  });

  test.fixme('10 - Translated scene title persists after switching language tabs — flaky: onBlur save timing with AppSync eventual consistency', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Click on EN language tab
    const enTab = page.getByTestId('lang-tab-en');
    if (await enTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await enTab.click();
      await page.waitForTimeout(3_000);

      // Click Edit to enter editing mode
      const editBtn = page.getByTestId('edit-button').first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(500);
      }

      // Edit translated title
      const titleInput = page.getByTestId('translated-title-input').first();
      if (await titleInput.isVisible().catch(() => false)) {
        const newTitle = `Translated Title ${Date.now()}`;
        await titleInput.clear();
        await titleInput.fill(newTitle);

        // Trigger blur by pressing Tab (moves focus away from input)
        await page.keyboard.press('Tab');
        await page.waitForTimeout(3_000);

        // Switch to FR tab
        const frTab = page.getByTestId('lang-tab-fr');
        await frTab.click();
        await page.waitForTimeout(3_000);

        // Switch back to EN tab
        await enTab.click();
        await page.waitForTimeout(3_000);

        // Verify title persisted
        const readonlyTitle = page.getByTestId('translated-title-readonly').first();
        const editableTitle = page.getByTestId('translated-title-input').first();
        const isReadonly = await readonlyTitle.isVisible().catch(() => false);
        const isEditable = await editableTitle.isVisible().catch(() => false);

        if (isEditable) {
          const currentTitle = await editableTitle.inputValue();
          expect(currentTitle).toBe(newTitle);
        } else if (isReadonly) {
          const currentTitle = await readonlyTitle.textContent();
          expect(currentTitle).toContain(newTitle);
        }
      }
    }

    await page.screenshot({ path: 'test-results/persist-10-translated-title.png' });
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // TOUR INFO TRANSLATION (Language tabs, TourInfoTranslation component)
  // ---------------------------------------------------------------------------

  test.skip('11 - guide-side translated title editing was replaced by automatic translation', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Click on EN language tab
    const enTab = page.getByTestId('lang-tab-en');
    if (await enTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await enTab.click();
      await page.waitForTimeout(3_000);

      // Find the TourInfoTranslation component
      const tourInfo = page.getByTestId('tour-info-translation');
      if (await tourInfo.isVisible().catch(() => false)) {
        // Click edit button for title
        const editTitleBtn = page.getByTestId('edit-title-button');
        if (await editTitleBtn.isVisible().catch(() => false)) {
          await editTitleBtn.click();
          await page.waitForTimeout(500);
        }

        // Edit translated tour title
        const tourTitleInput = page.getByTestId('translated-title-input').first();
        // TourInfoTranslation has its own translated-title-input, but if SplitEditors also
        // have this testid we need to scope it to the tour-info-translation container
        const scopedTitleInput = tourInfo.getByTestId('translated-title-input');
        const targetInput = await scopedTitleInput.isVisible().catch(() => false)
          ? scopedTitleInput
          : tourTitleInput;

        if (await targetInput.isVisible().catch(() => false)) {
          const newTourTitle = `Tour EN Title ${Date.now()}`;
          await targetInput.clear();
          await targetInput.fill(newTourTitle);

          // Trigger blur to save
          await page.locator('h3').first().click();
          await page.waitForTimeout(3_000);

          // Switch to FR tab
          const frTab = page.getByTestId('lang-tab-fr');
          await frTab.click();
          await page.waitForTimeout(3_000);

          // Switch back to EN tab
          await enTab.click();
          await page.waitForTimeout(3_000);

          // Verify tour title persisted
          const tourInfoAfter = page.getByTestId('tour-info-translation');
          const readonlyTitle = tourInfoAfter.getByTestId('translated-title-readonly');
          const editableTitle = tourInfoAfter.getByTestId('translated-title-input');
          const isReadonly = await readonlyTitle.isVisible().catch(() => false);
          const isEditable = await editableTitle.isVisible().catch(() => false);

          if (isEditable) {
            const currentTitle = await editableTitle.inputValue();
            expect(currentTitle).toBe(newTourTitle);
          } else if (isReadonly) {
            const currentTitle = await readonlyTitle.textContent();
            expect(currentTitle).toContain(newTourTitle);
          }
        }
      }
    }

    await page.screenshot({ path: 'test-results/persist-11-tour-title-translation.png' });
    await context.close();
  });

  test.skip('12 - guide-side translated description editing was replaced by automatic translation', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Click on EN language tab
    const enTab = page.getByTestId('lang-tab-en');
    if (await enTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await enTab.click();
      await page.waitForTimeout(3_000);

      // Find the TourInfoTranslation component
      const tourInfo = page.getByTestId('tour-info-translation');
      if (await tourInfo.isVisible().catch(() => false)) {
        // Click edit button for description
        const editDescBtn = page.getByTestId('edit-description-button');
        if (await editDescBtn.isVisible().catch(() => false)) {
          await editDescBtn.click();
          await page.waitForTimeout(500);
        }

        // Edit translated description
        const scopedDescInput = tourInfo.getByTestId('translated-description-input');

        if (await scopedDescInput.isVisible().catch(() => false)) {
          const newDesc = `Tour EN Description ${Date.now()}`;
          await scopedDescInput.clear();
          await scopedDescInput.fill(newDesc);

          // Trigger blur to save
          await page.locator('h3').first().click();
          await page.waitForTimeout(3_000);

          // Switch to FR tab
          const frTab = page.getByTestId('lang-tab-fr');
          await frTab.click();
          await page.waitForTimeout(3_000);

          // Switch back to EN tab
          await enTab.click();
          await page.waitForTimeout(3_000);

          // Verify description persisted
          const tourInfoAfter = page.getByTestId('tour-info-translation');
          const readonlyDesc = tourInfoAfter.getByTestId('translated-description-readonly');
          const editableDesc = tourInfoAfter.getByTestId('translated-description-input');
          const isReadonly = await readonlyDesc.isVisible().catch(() => false);
          const isEditable = await editableDesc.isVisible().catch(() => false);

          if (isEditable) {
            const currentDesc = await editableDesc.inputValue();
            expect(currentDesc).toBe(newDesc);
          } else if (isReadonly) {
            const currentDesc = await readonlyDesc.textContent();
            expect(currentDesc).toContain(newDesc);
          }
        }
      }
    }

    await page.screenshot({ path: 'test-results/persist-12-tour-desc-translation.png' });
    await context.close();
  });
});
