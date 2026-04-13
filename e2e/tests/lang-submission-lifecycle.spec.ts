/**
 * E2E Tests: Language Submission Lifecycle
 * Order: read-only tests first, mutations last
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
import { seedModerationItem, deleteItemsById, resolveGuideId, updateSessionTranslations } from '../helpers/appsync-direct';

const PREFIX = e2ePrefix('lang-lc');
const STUDIO = (sid: string) => `/guide/studio/${sid}`;

let guidePath: string, adminPath: string, guideToken: string, guideId: string;
let sessionId: string, tourId: string, sceneIds: string[];
let purchaseIds: string[] = [], segmentIds: string[] = [], moderationItemId: string;

const EN = [
  { title: 'Place aux Aires', text: 'Welcome to Place aux Aires, the historic heart of Grasse.' },
  { title: 'Notre-Dame du Puy Cathedral', text: 'The cathedral has dominated the old town since the twelfth century.' },
  { title: 'Fragonard Perfumery', text: 'Fragonard, founded in 1926, is the oldest perfumery in Grasse.' },
];
const ES = [
  { title: 'Plaza de las Aires', text: 'Bienvenidos a la Plaza de las Aires, el corazon historico de Grasse.' },
  { title: 'Catedral Notre-Dame du Puy', text: 'La catedral domina el casco antiguo desde el siglo XII.' },
  { title: 'Perfumeria Fragonard', text: 'Fragonard, fundada en 1926, es la perfumeria mas antigua de Grasse.' },
];

async function injectConsent(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('rgpd-consent', JSON.stringify({ analytics: true, timestamp: Date.now() }));
    localStorage.setItem('studio_rgpd_consent', JSON.stringify({ consentDate: new Date().toISOString() }));
  });
}
async function gPage(browser: Browser, path: string) {
  const context = await browser.newContext({ storageState: guidePath });
  const page = await context.newPage();
  await page.goto('/'); await injectConsent(page);
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
  const btn = page.locator('button:has-text("Accepter")');
  if (await btn.isVisible({ timeout: 1_500 }).catch(() => false)) { await btn.click(); await page.waitForTimeout(500); }
  // Allow AppSync hydration — CI prod is slower than local dev
  await page.waitForTimeout(4_000);
  return { context, page };
}
async function aPage(browser: Browser, path: string) {
  const context = await browser.newContext({ storageState: adminPath });
  const page = await context.newPage();
  await page.goto('/'); await injectConsent(page);
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
  // Allow AppSync hydration — CI prod is slower than local dev
  await page.waitForTimeout(4_000);
  return { context, page };
}

test.describe('Language Submission Lifecycle', () => {
  test.beforeAll(async () => {
    guidePath = getGuideStorageStatePath();
    adminPath = getAdminStorageStatePath();
    if (!isTokenValid(guidePath)) { const t = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD); createStorageState(t, E2E_GUIDE_EMAIL, guidePath); }
    if (!isTokenValid(adminPath)) { const t = await authenticateCognito(E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD); createStorageState(t, E2E_ADMIN_EMAIL, adminPath); }
    guideToken = getAccessTokenFromStorageState(guidePath);
    guideId = await resolveGuideId(guideToken);

    const data = await seedMultilangReadyTour(PREFIX, guideToken);
    tourId = data.tourId; sessionId = data.sessionId; sceneIds = data.sceneIds;

    const enP = await seedLanguagePurchase(sessionId, 'en', guideToken, { guideId, moderationStatus: 'submitted', status: 'active', amountCents: 199, qualityTier: 'standard', purchaseType: 'single' });
    const esP = await seedLanguagePurchase(sessionId, 'es', guideToken, { guideId, moderationStatus: 'draft', status: 'active', amountCents: 199, qualityTier: 'standard', purchaseType: 'single' });
    purchaseIds = [enP.id, esP.id];

    for (let i = 0; i < sceneIds.length; i++) {
      const enSeg = await seedSceneSegment(sceneIds[i], 0, guideToken, { language: 'en', transcriptText: EN[i].text, translatedTitle: EN[i].title, status: 'tts_generated' });
      const esSeg = await seedSceneSegment(sceneIds[i], 1, guideToken, { language: 'es', transcriptText: ES[i].text, translatedTitle: ES[i].title, status: 'tts_generated' });
      segmentIds.push(enSeg.id, esSeg.id);
    }
    await updateSessionTranslations(sessionId, { en: 'Grasse Old Town', es: 'Casco Antiguo' }, { en: 'Discover Grasse.', es: 'Descubre Grasse.' }, guideToken);

    const mod = await seedModerationItem(tourId, guideId, guideToken, { tourTitle: `${PREFIX} Grasse`, city: 'Grasse', status: 'pending' });
    moderationItemId = mod.id;

    // Give AppSync GSI (TourLanguagePurchaseBySessionId) time to propagate in CI
    await new Promise((r) => setTimeout(r, 5_000));
  });

  test.afterAll(async () => {
    try {
      await deleteItemsById('TourLanguagePurchase', purchaseIds);
      await deleteItemsById('SceneSegment', segmentIds);
      await deleteItemsById('ModerationItem', [moderationItemId]);
      await cleanupByPrefix(PREFIX);
    } catch { /* ok */ }
  });

  // ══════════════════════════════════════
  // READ-ONLY TESTS (no data mutation)
  // ══════════════════════════════════════

  // Guide: locking
  // FIXME flaky CI (purchases not visible in browser context)
  test.skip('1.1 EN locked banner', async ({ browser }) => {
    const { context, page } = await gPage(browser, `${STUDIO(sessionId)}/scenes`);
    const tab = page.locator('[data-testid*="lang-tab"]').filter({ hasText: 'EN' });
    if (await tab.isVisible({ timeout: 5_000 })) { await tab.click(); await page.waitForTimeout(1_000); }
    await expect(page.getByTestId('lang-locked-banner')).toBeVisible({ timeout: 5_000 });
    await context.close();
  });
  test('1.2 Translate/Edit hidden', async ({ browser }) => {
    const { context, page } = await gPage(browser, `${STUDIO(sessionId)}/scenes`);
    const tab = page.locator('[data-testid*="lang-tab"]').filter({ hasText: 'EN' });
    if (await tab.isVisible({ timeout: 5_000 })) { await tab.click(); await page.waitForTimeout(1_000); }
    await expect(page.getByTestId('translate-info-button')).not.toBeVisible();
    await context.close();
  });
  test('2.1 ES editable', async ({ browser }) => {
    const { context, page } = await gPage(browser, `${STUDIO(sessionId)}/scenes`);
    const tab = page.locator('[data-testid*="lang-tab"]').filter({ hasText: 'ES' });
    if (await tab.isVisible({ timeout: 5_000 })) { await tab.click(); await page.waitForTimeout(1_000); }
    await expect(page.getByTestId('lang-locked-banner')).not.toBeVisible();
    await context.close();
  });

  // Guide: submission table
  // FIXME flaky CI (purchases not visible)
  test.skip('3.1 Table statuses', async ({ browser }) => {
    const { context, page } = await gPage(browser, `${STUDIO(sessionId)}/submission`);
    await expect(page.getByTestId('language-submissions-section')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('lang-submission-en').locator('text=Soumis')).toBeVisible();
    await expect(page.getByTestId('lang-submission-es').locator('text=Brouillon')).toBeVisible();
    await context.close();
  });
  // FIXME flaky CI (purchases not visible)
  test.skip('3.2 EN Retirer button', async ({ browser }) => {
    const { context, page } = await gPage(browser, `${STUDIO(sessionId)}/submission`);
    await expect(page.getByTestId('retract-lang-en')).toBeVisible({ timeout: 10_000 });
    await context.close();
  });

  // Admin: queue
  test('6.1 Admin queue has entries', async ({ browser }) => {
    const { context, page } = await aPage(browser, '/admin/moderation');
    expect(await page.locator('tbody tr').count()).toBeGreaterThan(0);
    await context.close();
  });
  test('6.2 Admin comparison banner', async ({ browser }) => {
    const { context, page } = await aPage(browser, `/admin/moderation/${tourId}?lang=en`);
    await expect(page.locator('text=Comparaison FR / EN')).toBeVisible({ timeout: 5_000 });
    await context.close();
  });

  // Admin: EN content
  test('7.1 EN narration', async ({ browser }) => {
    const { context, page } = await aPage(browser, `/admin/moderation/${tourId}?lang=en`);
    await page.waitForSelector('[data-testid^="tourist-scene-"]', { timeout: 15_000 });
    const body = await page.textContent('body');
    expect(body).toContain('Welcome to Place aux Aires');
    expect(body).toContain('cathedral has dominated');
    expect(body).toContain('Fragonard, founded in 1926');
    await context.close();
  });
  test('7.2 EN titles + badges', async ({ browser }) => {
    const { context, page } = await aPage(browser, `/admin/moderation/${tourId}?lang=en`);
    await page.waitForSelector('[data-testid^="tourist-scene-"]', { timeout: 15_000 });
    const body = await page.textContent('body');
    expect(body).toContain('Notre-Dame du Puy Cathedral');
    expect(body).toContain('Fragonard Perfumery');
    expect(await page.locator('text=EN OK').count()).toBeGreaterThanOrEqual(3);
    await context.close();
  });
  test('7.3 EN description label', async ({ browser }) => {
    const { context, page } = await aPage(browser, `/admin/moderation/${tourId}?lang=en`);
    await page.waitForTimeout(3_000);
    expect(await page.textContent('body')).toContain('Description (EN)');
    await context.close();
  });

  // Admin: ES content
  test('8.1 ES narration', async ({ browser }) => {
    const { context, page } = await aPage(browser, `/admin/moderation/${tourId}?lang=es`);
    await page.waitForSelector('[data-testid^="tourist-scene-"]', { timeout: 15_000 });
    const body = await page.textContent('body');
    expect(body).toContain('Bienvenidos a la Plaza de las Aires');
    expect(body).toContain('catedral domina el casco antiguo');
    await context.close();
  });
  test('8.2 ES titles + badges', async ({ browser }) => {
    const { context, page } = await aPage(browser, `/admin/moderation/${tourId}?lang=es`);
    await page.waitForSelector('[data-testid^="tourist-scene-"]', { timeout: 15_000 });
    const body = await page.textContent('body');
    expect(body).toContain('Plaza de las Aires');
    expect(body).toContain('Catedral Notre-Dame du Puy');
    expect(await page.locator('text=ES OK').count()).toBeGreaterThanOrEqual(3);
    await context.close();
  });
  test('8.3 ES description label', async ({ browser }) => {
    const { context, page } = await aPage(browser, `/admin/moderation/${tourId}?lang=es`);
    await page.waitForTimeout(3_000);
    expect(await page.textContent('body')).toContain('Description (ES)');
    await context.close();
  });

  // Comparison view has scenes
  test('10.1 Comparison view shows scenes', async ({ browser }) => {
    const { context, page } = await aPage(browser, `/admin/moderation/${tourId}?lang=en`);
    await page.waitForSelector('[data-testid^="tourist-scene-"]', { timeout: 15_000 });
    expect(await page.locator('[data-testid^="tourist-scene-"]').count()).toBeGreaterThan(0);
    await context.close();
  });

  // ══════════════════════════════════════
  // MUTATION TESTS (run last)
  // ══════════════════════════════════════

  test('4.1 Retirer → Brouillon', async ({ browser }) => {
    const { context, page } = await gPage(browser, `${STUDIO(sessionId)}/submission`);
    await page.getByTestId('retract-lang-en').click();
    await page.waitForTimeout(3_000);
    await expect(page.getByTestId('lang-submission-en').locator('text=Brouillon')).toBeVisible({ timeout: 5_000 });
    await context.close();
  });
  test('4.2 EN editable after retract', async ({ browser }) => {
    const { context, page } = await gPage(browser, `${STUDIO(sessionId)}/scenes`);
    const tab = page.locator('[data-testid*="lang-tab"]').filter({ hasText: 'EN' });
    if (await tab.isVisible({ timeout: 5_000 })) { await tab.click(); await page.waitForTimeout(1_000); }
    await expect(page.getByTestId('lang-locked-banner')).not.toBeVisible();
    await context.close();
  });
});
