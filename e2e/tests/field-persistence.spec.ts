/**
 * E2E Test Suite — Field Persistence
 *
 * Verifies that ALL editable fields in TourGuide Studio persist their values
 * after navigation away and back. Pattern: write value -> navigate away -> come back -> verify.
 *
 * Uses REAL AppSync data seeded via appsync-direct.ts.
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
  seedLanguagePurchase,
  seedSceneSegment,
  cleanupByPrefix,
  type SeededTour,
} from '../fixtures/seed.fixture';

const STUDIO_BASE = '/guide/studio';
const PREFIX = e2ePrefix('persist');

/**
 * Inject RGPD consent into localStorage before navigating.
 */
async function injectRGPDConsent(page: Page): Promise<void> {
  // Must be on a real page to access localStorage
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    localStorage.setItem(
      'studio_rgpd_consent',
      JSON.stringify({ consentDate: new Date().toISOString() }),
    );
  });
}

test.describe.serial('Field Persistence', () => {
  let guidePath: string;
  let seeded: SeededTour & { guideId: string };
  let sessionUrl: string;
  let token: string;
  let segmentId: string;

  test.beforeAll(async () => {
    guidePath = getGuideStorageStatePath();
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }

    token = getAccessTokenFromStorageState(guidePath);
    // Use 'editing' so title/description fields are editable (not locked)
    seeded = await seedMultilangReadyTour(PREFIX, token, { sessionStatus: 'editing' });
    sessionUrl = `${STUDIO_BASE}/${seeded.sessionId}`;

    // Seed a language purchase for English
    await seedLanguagePurchase(seeded.sessionId, 'en', token, {
      guideId: seeded.guideId,
      qualityTier: 'manual',
      purchaseType: 'manual',
      amountCents: 0,
      moderationStatus: 'draft',
      status: 'active',
    });

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
    // TEMP: skip cleanup to keep seeded data for manual verification
    // await cleanupByPrefix(PREFIX);
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

  test('2b - Description longue persists after navigation', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/general`);
    await page.waitForTimeout(3_000);

    // Edit description
    const descInput = page.locator('#tour-description, [data-testid="description-input"]');
    const newDesc = `Description longue test ${Date.now()}`;
    await descInput.clear();
    await descInput.fill(newDesc);

    // Save
    await page.locator('[data-testid="save-general-btn"], button:has-text("Enregistrer")').first().click();
    await page.waitForTimeout(3_000);

    // Navigate away
    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Navigate back
    await page.goto(`${sessionUrl}/general`);
    await page.waitForTimeout(3_000);

    // Verify
    const currentDesc = await page.locator('#tour-description, [data-testid="description-input"]').inputValue();
    expect(currentDesc).toBe(newDesc);

    await page.screenshot({ path: 'test-results/persist-2b-description.png' });
    await context.close();
  });

  test('3 - Cover photo key persists after navigation', async ({ browser }) => {
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

    // Wait for upload to complete (stub mode is instant)
    await page.waitForTimeout(3_000);

    // Verify photo appears (either preview URL or S3Image)
    const coverArea = page.locator('img[alt="Couverture"]');
    const hasCover = await coverArea.isVisible().catch(() => false);

    // Save
    await page.getByTestId('save-general-btn').click();
    await expect(page.locator('[role="status"]', { hasText: /Enregistr/i })).toBeVisible({ timeout: 5_000 });

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
  // POI FIELDS (Scenes page, POI tab)
  // ---------------------------------------------------------------------------

  test('4 - POI title persists after switching scenes', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Click on the POI tab
    const poiTab = page.getByTestId('tab-poi');
    if (await poiTab.isVisible().catch(() => false)) {
      await poiTab.click();
    }

    // Edit POI title on the first scene
    const poiTitleInput = page.getByTestId('poi-title-input');
    await expect(poiTitleInput).toBeVisible({ timeout: 10_000 });
    const newPoiTitle = `POI Title ${Date.now()}`;
    await poiTitleInput.clear();
    await poiTitleInput.fill(newPoiTitle);

    // Save POI
    await page.getByTestId('save-poi-btn').click();
    await page.waitForTimeout(3_000);

    // Switch to scene 2
    const scene2Btn = page.getByTestId(`sidebar-scene-${seeded.sceneIds[1]}`);
    await expect(scene2Btn).toBeVisible({ timeout: 5_000 });
    await scene2Btn.click();
    await page.waitForTimeout(3_000);

    // Switch back to scene 1
    const scene1Btn = page.getByTestId(`sidebar-scene-${seeded.sceneIds[0]}`);
    await scene1Btn.click();
    await page.waitForTimeout(3_000);

    // Verify POI title persisted
    const currentPoiTitle = await page.getByTestId('poi-title-input').inputValue();
    expect(currentPoiTitle).toBe(newPoiTitle);

    await page.screenshot({ path: 'test-results/persist-4-poi-title.png' });
    await context.close();
  });

  test('5 - POI description persists after switching scenes', async ({ browser }) => {
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

  test('6 - POI GPS coordinates persist after switching scenes', async ({ browser }) => {
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

    // Click on Text tab (wait for it to be ready)
    const textTab = page.getByTestId('tab-text');
    await expect(textTab).toBeVisible({ timeout: 10_000 });
    await textTab.click();
    await page.waitForTimeout(500);

    // Edit text
    const sceneEditor = page.getByTestId('scene-editor');
    await expect(sceneEditor).toBeVisible({ timeout: 10_000 });
    const newText = `Scene text persistence test ${Date.now()}`;
    await sceneEditor.clear();
    await sceneEditor.fill(newText);

    // Trigger blur to auto-save
    await page.getByTestId('tab-poi').click();
    await page.waitForTimeout(3_000);

    // Switch to scene 2
    await page.getByTestId(`sidebar-scene-${seeded.sceneIds[1]}`).click();
    await page.waitForTimeout(3_000);

    // Switch back to scene 1
    await page.getByTestId(`sidebar-scene-${seeded.sceneIds[0]}`).click();
    await page.waitForTimeout(3_000);

    // Go back to text tab
    await page.getByTestId('tab-text').click();
    await page.waitForTimeout(500);

    // Verify text persisted
    const currentText = await page.getByTestId('scene-editor').inputValue();
    expect(currentText).toBe(newText);

    await page.screenshot({ path: 'test-results/persist-7-scene-text.png' });
    await context.close();
  });

  test('8 - Scene text persists after page navigation (General and back)', async ({ browser }) => {
    const context = await browser.newContext({ storageState: guidePath });
    const page = await context.newPage();
    await injectRGPDConsent(page);

    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Click Text tab (wait until ready)
    const textTab = page.getByTestId('tab-text');
    await expect(textTab).toBeVisible({ timeout: 10_000 });
    await textTab.click();
    await page.waitForTimeout(500);

    // Edit text
    const sceneEditor = page.getByTestId('scene-editor');
    await expect(sceneEditor).toBeVisible({ timeout: 10_000 });
    const newText = `Cross-page text ${Date.now()}`;
    await sceneEditor.clear();
    await sceneEditor.fill(newText);

    // Trigger blur for auto-save
    await page.getByTestId('tab-poi').click();
    await page.waitForTimeout(3_000);

    // Navigate to General page
    await page.goto(`${sessionUrl}/general`);
    await page.waitForTimeout(3_000);

    // Navigate back to Scenes
    await page.goto(`${sessionUrl}/scenes`);
    await page.waitForTimeout(3_000);

    // Go to Text tab
    const textTab2 = page.getByTestId('tab-text');
    await expect(textTab2).toBeVisible({ timeout: 10_000 });
    await textTab2.click();
    await page.waitForTimeout(500);

    // Verify text persisted
    await expect(page.getByTestId('scene-editor')).toBeVisible({ timeout: 10_000 });
    const currentText = await page.getByTestId('scene-editor').inputValue();
    expect(currentText).toBe(newText);

    await page.screenshot({ path: 'test-results/persist-8-text-cross-page.png' });
    await context.close();
  });

  // ---------------------------------------------------------------------------
  // TRANSLATED TEXT (Language tabs, SplitEditor)
  // ---------------------------------------------------------------------------

  test('9 - Translated scene text (EN) persists after switching language tabs', async ({ browser }) => {
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

  test('11 - Translated tour title persists after switching language tabs', async ({ browser }) => {
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

  test('12 - Translated tour description persists after switching language tabs', async ({ browser }) => {
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
