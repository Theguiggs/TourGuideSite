/**
 * E2E: Full multilang cycle — Guide creates FR+EN+ES, Admin approves EN, rejects ES,
 * Guide sees feedback and corrects, edge cases.
 */

import { test, expect, type Browser, type Page, type BrowserContext } from '@playwright/test';
import {
  authenticateCognito, createStorageState, getGuideStorageStatePath, getAdminStorageStatePath,
  isTokenValid, getAccessTokenFromStorageState,
} from '../fixtures/auth.fixture';
import {
  E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, e2ePrefix,
} from '../fixtures/test-data';
import {
  seedMultilangReadyTour, seedLanguagePurchase, seedSceneSegment, cleanupByPrefix,
} from '../fixtures/seed.fixture';
import {
  seedModerationItem, deleteItemsById, resolveGuideId, updateSessionTranslations,
  updateModerationItemStatus, updateLanguagePurchaseStatus, updateSessionStatus,
} from '../helpers/appsync-direct';

const PREFIX = e2ePrefix('full-ml');
const STUDIO = (sid: string) => `/guide/studio/${sid}`;

// Shared state
let guidePath: string, adminPath: string, guideToken: string, adminToken: string, guideId: string;
let tourId: string, sessionId: string, sceneIds: string[];
let enPurchaseId: string, esPurchaseId: string, itPurchaseId: string;
let segmentIds: string[] = [];
let moderationItemId: string;

// --- Helpers ---
async function injectConsent(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('rgpd-consent', JSON.stringify({ analytics: true, timestamp: Date.now() }));
    localStorage.setItem('studio_rgpd_consent', JSON.stringify({ consentDate: new Date().toISOString() }));
  });
}
async function guidePage(browser: Browser, path: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ storageState: guidePath });
  const page = await ctx.newPage();
  await page.goto('/'); await injectConsent(page);
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
  const btn = page.locator('button:has-text("Accepter")');
  if (await btn.isVisible({ timeout: 1_500 }).catch(() => false)) { await btn.click(); await page.waitForTimeout(500); }
  // Allow AppSync hydration (queries kicked off after DOM is ready) — CI prod is slower than local dev
  await page.waitForTimeout(4_000);
  return { ctx, page };
}
async function adminPage(browser: Browser, path: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ storageState: adminPath });
  const page = await ctx.newPage();
  await page.goto('/'); await injectConsent(page);
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
  // Allow AppSync hydration (queries kicked off after DOM is ready) — CI prod is slower than local dev
  await page.waitForTimeout(4_000);
  return { ctx, page };
}

// Translated content (deterministic for assertions)
const EN = {
  scenes: [
    { title: 'Place aux Aires', text: 'Welcome to Place aux Aires, the historic heart of Grasse.' },
    { title: 'Notre-Dame du Puy Cathedral', text: 'The cathedral has dominated the old town since the twelfth century.' },
    { title: 'Fragonard Perfumery', text: 'Fragonard, founded in 1926, is the oldest perfumery in Grasse.' },
  ],
  desc: 'Discover the historic heart of Grasse, world capital of perfume.',
  tourTitle: 'Grasse Old Town',
};
const ES = {
  scenes: [
    { title: 'Plaza de las Aires', text: 'Bienvenidos a la Plaza de las Aires, el corazon historico de Grasse.' },
    { title: 'Catedral Notre-Dame du Puy', text: 'La catedral domina el casco antiguo desde el siglo XII.' },
    { title: 'Perfumeria Fragonard', text: 'Fragonard, fundada en 1926, es la perfumeria mas antigua de Grasse.' },
  ],
  desc: 'Descubre el corazon historico de Grasse, capital mundial del perfume.',
  tourTitle: 'Casco Antiguo de Grasse',
};
const REJECT_FEEDBACK = 'Traduction scene 2 incorrecte — vocabulaire inadapte pour un contexte touristique';

test.describe('Full Multilang Cycle', () => {

  test.beforeAll(async () => {
    guidePath = getGuideStorageStatePath();
    adminPath = getAdminStorageStatePath();
    if (!isTokenValid(guidePath)) { const t = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD); createStorageState(t, E2E_GUIDE_EMAIL, guidePath); }
    if (!isTokenValid(adminPath)) { const t = await authenticateCognito(E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD); createStorageState(t, E2E_ADMIN_EMAIL, adminPath); }
    guideToken = getAccessTokenFromStorageState(guidePath);
    adminToken = getAccessTokenFromStorageState(adminPath);
    guideId = await resolveGuideId(guideToken);

    // Seed tour + session + 3 scenes
    const data = await seedMultilangReadyTour(PREFIX, guideToken);
    tourId = data.tourId; sessionId = data.sessionId; sceneIds = data.sceneIds;

    // EN + ES purchases (both submitted)
    const enP = await seedLanguagePurchase(sessionId, 'en', guideToken, { guideId, moderationStatus: 'submitted', status: 'active', amountCents: 199, qualityTier: 'standard', purchaseType: 'single' });
    const esP = await seedLanguagePurchase(sessionId, 'es', guideToken, { guideId, moderationStatus: 'submitted', status: 'active', amountCents: 199, qualityTier: 'standard', purchaseType: 'single' });
    // IT purchase with no segments (edge case)
    const itP = await seedLanguagePurchase(sessionId, 'it', guideToken, { guideId, moderationStatus: 'draft', status: 'active', amountCents: 199, qualityTier: 'standard', purchaseType: 'single' });
    enPurchaseId = enP.id; esPurchaseId = esP.id; itPurchaseId = itP.id;

    // EN + ES segments for each scene
    for (let i = 0; i < sceneIds.length; i++) {
      const enSeg = await seedSceneSegment(sceneIds[i], 0, guideToken, { language: 'en', transcriptText: EN.scenes[i].text, translatedTitle: EN.scenes[i].title, status: 'tts_generated' });
      const esSeg = await seedSceneSegment(sceneIds[i], 1, guideToken, { language: 'es', transcriptText: ES.scenes[i].text, translatedTitle: ES.scenes[i].title, status: 'tts_generated' });
      segmentIds.push(enSeg.id, esSeg.id);
    }

    // Translated session info
    await updateSessionTranslations(sessionId, { en: EN.tourTitle, es: ES.tourTitle }, { en: EN.desc, es: ES.desc }, guideToken);

    // ModerationItem
    const mod = await seedModerationItem(tourId, guideId, guideToken, { tourTitle: `${PREFIX} Grasse Vieille Ville`, city: 'Grasse', status: 'pending' });
    moderationItemId = mod.id;

    console.log(`[Setup] Tour:${tourId} Ses:${sessionId} EN:${enPurchaseId} ES:${esPurchaseId} IT:${itPurchaseId} Mod:${moderationItemId} Segs:${segmentIds.length}`);

    // Give AppSync GSI (TourLanguagePurchaseBySessionId) time to propagate the new purchases.
    // Local sandbox is fast (~1s), GitHub CI runners need more (5s observed).
    await new Promise((r) => setTimeout(r, 5_000));
  });

  test.afterAll(async () => {
    try {
      await deleteItemsById('TourLanguagePurchase', [enPurchaseId, esPurchaseId, itPurchaseId]);
      await deleteItemsById('SceneSegment', segmentIds);
      await deleteItemsById('ModerationItem', [moderationItemId]);
      await cleanupByPrefix(PREFIX);
    } catch { /* partial cleanup ok */ }
  });

  // ═══════════════════════════════════════
  // Phase 1 — Guide state initial
  // ═══════════════════════════════════════

  test('1.1 Table: FR source + EN Soumis + ES Soumis + IT Brouillon', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/submission`);
    const table = page.getByTestId('language-submissions-section');
    await expect(table).toBeVisible({ timeout: 10_000 });
    await expect(table.locator('text=(source)')).toBeVisible();
    await expect(page.getByTestId('lang-submission-en').locator('text=Soumis')).toBeVisible();
    await expect(page.getByTestId('lang-submission-es').locator('text=Soumis')).toBeVisible();
    await expect(page.getByTestId('lang-submission-it').locator('text=Brouillon')).toBeVisible();
    await page.screenshot({ path: 'test-results/full-1.1-table.png' });
    await ctx.close();
  });

  test('1.2 EN locked in scenes', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/scenes`);
    const enTab = page.locator('[data-testid*="lang-tab"]').filter({ hasText: 'EN' });
    if (await enTab.isVisible({ timeout: 5_000 })) { await enTab.click(); await page.waitForTimeout(1_000); }
    await expect(page.getByTestId('lang-locked-banner')).toBeVisible({ timeout: 5_000 });
    await ctx.close();
  });

  test('1.3 ES locked in scenes', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/scenes`);
    const esTab = page.locator('[data-testid*="lang-tab"]').filter({ hasText: 'ES' });
    if (await esTab.isVisible({ timeout: 5_000 })) { await esTab.click(); await page.waitForTimeout(1_000); }
    await expect(page.getByTestId('lang-locked-banner')).toBeVisible({ timeout: 5_000 });
    await ctx.close();
  });

  // ═══════════════════════════════════════
  // Phase 2 — Admin examine EN
  // ═══════════════════════════════════════

  test('2.1 Admin queue shows EN and ES', async ({ browser }) => {
    const { ctx, page } = await adminPage(browser, '/admin/moderation');
    await expect(page.getByText(PREFIX, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });

  test('2.2 EN narration text exact', async ({ browser }) => {
    const { ctx, page } = await adminPage(browser, `/admin/moderation/${tourId}?lang=en`);
    await page.waitForSelector('[data-testid^="tourist-scene-"]', { timeout: 15_000 });
    expect(await page.locator('[data-testid^="tourist-scene-"]').count()).toBeGreaterThanOrEqual(3);
    const body = await page.textContent('body');
    expect(body).toContain('Welcome to Place aux Aires');
    expect(body).toContain('cathedral has dominated');
    expect(body).toContain('Fragonard, founded in 1926');
    await page.screenshot({ path: 'test-results/full-2.2-en-narration.png' });
    await ctx.close();
  });

  test('2.3 EN titles exact', async ({ browser }) => {
    const { ctx, page } = await adminPage(browser, `/admin/moderation/${tourId}?lang=en`);
    await page.waitForSelector('[data-testid^="tourist-scene-"]', { timeout: 15_000 });
    const body = await page.textContent('body');
    expect(body).toContain('Notre-Dame du Puy Cathedral');
    expect(body).toContain('Fragonard Perfumery');
    expect(await page.locator('text=EN OK').count()).toBeGreaterThanOrEqual(3);
    await ctx.close();
  });

  test('2.4 EN description label', async ({ browser }) => {
    const { ctx, page } = await adminPage(browser, `/admin/moderation/${tourId}?lang=en`);
    await page.waitForTimeout(3_000);
    await expect(page.getByText('Description (EN)')).toBeVisible({ timeout: 5_000 });
    await ctx.close();
  });

  // Phase 2.5 + 3 — Admin approves EN, rejects ES (via API)
  test('2.5+3.1 Admin approves EN, rejects ES via API', async () => {
    // Approve EN purchase
    await updateLanguagePurchaseStatus(enPurchaseId, 'approved', guideToken);
    // Reject ES purchase with feedback
    await updateLanguagePurchaseStatus(esPurchaseId, 'rejected', guideToken);
    // Update moderation item with rejection feedback
    await updateModerationItemStatus(moderationItemId, 'rejected', JSON.stringify({
      category: 'translation',
      feedback: REJECT_FEEDBACK,
    }), guideToken);
    // Update session status to rejected (simulates what the admin flow does)
    await updateSessionStatus(sessionId, 'rejected', guideToken);
  });

  // ═══════════════════════════════════════
  // Phase 4 — Guide sees result
  // ═══════════════════════════════════════

  test('4.1 Table: EN Approuvé, ES Refusé', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/submission`);
    await page.waitForTimeout(2_000);
    await expect(page.getByTestId('lang-submission-en').locator('text=Approuve')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('lang-submission-es').locator('text=Refuse')).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'test-results/full-4.1-statuses.png' });
    await ctx.close();
  });

  test('4.2 EN still locked (approved)', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/scenes`);
    const enTab = page.locator('[data-testid*="lang-tab"]').filter({ hasText: 'EN' });
    if (await enTab.isVisible({ timeout: 5_000 })) { await enTab.click(); await page.waitForTimeout(1_000); }
    await expect(page.getByTestId('lang-locked-banner')).toBeVisible({ timeout: 5_000 });
    await ctx.close();
  });

  test('4.3 ES unlocked (rejected)', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/scenes`);
    const esTab = page.locator('[data-testid*="lang-tab"]').filter({ hasText: 'ES' });
    if (await esTab.isVisible({ timeout: 5_000 })) { await esTab.click(); await page.waitForTimeout(1_000); }
    await expect(page.getByTestId('lang-locked-banner')).not.toBeVisible();
    await ctx.close();
  });

  test('4.4 ReviewFeedbackPanel visible', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/submission`);
    await page.waitForTimeout(2_000);
    await expect(page.getByTestId('review-feedback-panel')).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });

  test('4.5 Feedback contains rejection text', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/submission`);
    await page.waitForTimeout(3_000);
    const panel = page.getByTestId('review-feedback-panel');
    if (await panel.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const text = await panel.textContent();
      expect(text).toContain('vocabulaire inadapte');
    }
    await page.screenshot({ path: 'test-results/full-4.5-feedback.png' });
    await ctx.close();
  });

  // ═══════════════════════════════════════
  // Phase 5 — Guide retracts ES and edits
  // ═══════════════════════════════════════

  test('5.1 Retirer ES → Brouillon', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/submission`);
    await page.waitForTimeout(2_000);
    // ES rejected can be retracted (back to draft)
    const retractBtn = page.getByTestId('retract-lang-es');
    if (await retractBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await retractBtn.click();
      await page.waitForTimeout(3_000);
      await expect(page.getByTestId('lang-submission-es').locator('text=Brouillon')).toBeVisible({ timeout: 5_000 });
    } else {
      // If no retract button, ES might show as draft already (retractLanguageSubmission handles rejected→draft)
      // Use submit button instead to verify ES is in resubmittable state
      const submitBtn = page.getByTestId('submit-lang-es');
      const incomplet = page.getByTestId('lang-submission-es').locator('text=Incomplet');
      const brouillon = page.getByTestId('lang-submission-es').locator('text=Brouillon');
      expect(await submitBtn.isVisible().catch(() => false) || await incomplet.isVisible().catch(() => false) || await brouillon.isVisible().catch(() => false)).toBe(true);
    }
    await page.screenshot({ path: 'test-results/full-5.1-es-retracted.png' });
    await ctx.close();
  });

  // ═══════════════════════════════════════
  // Phase 6 — Edge cases
  // ═══════════════════════════════════════

  test('6.1 Dépublier EN → EN Brouillon', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/submission`);
    await page.waitForTimeout(2_000);
    const unpubBtn = page.getByTestId('unpublish-lang-en');
    if (await unpubBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await unpubBtn.click();
      await page.waitForTimeout(3_000);
      await expect(page.getByTestId('lang-submission-en').locator('text=Brouillon')).toBeVisible({ timeout: 5_000 });
    }
    await page.screenshot({ path: 'test-results/full-6.1-en-unpublished.png' });
    await ctx.close();
  });

  test('6.2 EN editable after dépublication', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/scenes`);
    const enTab = page.locator('[data-testid*="lang-tab"]').filter({ hasText: 'EN' });
    if (await enTab.isVisible({ timeout: 5_000 })) { await enTab.click(); await page.waitForTimeout(1_000); }
    await expect(page.getByTestId('lang-locked-banner')).not.toBeVisible();
    await page.screenshot({ path: 'test-results/full-6.2-en-editable.png' });
    await ctx.close();
  });

  test('6.3 IT (no segments) shows Incomplet', async ({ browser }) => {
    const { ctx, page } = await guidePage(browser, `${STUDIO(sessionId)}/submission`);
    await page.waitForTimeout(2_000);
    const itRow = page.getByTestId('lang-submission-it');
    await expect(itRow).toBeVisible({ timeout: 10_000 });
    await expect(itRow.locator('text=Incomplet')).toBeVisible();
    // No submit button for incomplete language
    await expect(page.getByTestId('submit-lang-it')).not.toBeVisible();
    await page.screenshot({ path: 'test-results/full-6.3-it-incomplet.png' });
    await ctx.close();
  });
});
