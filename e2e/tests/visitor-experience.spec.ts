import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Son silencieux d’une seconde : le navigateur produit lui-même la fin média. */
function silentWav(): Buffer {
  const dataSize = 8_000 * 2;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataSize, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8_000, 24); wav.writeUInt32LE(16_000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  return wav;
}

for (const locale of ['fr', 'en'] as const) {
  test(`Écoute manuelle ${locale} : arrivée silencieuse et fin native sans enchaînement`, async ({ page }) => {
    let mediaRequests = 0;
    await page.route('**/*', async route => {
      if (route.request().resourceType() !== 'media') return route.continue();
      mediaRequests++;
      await route.fulfill({ contentType: 'audio/wav', body: silentWav() });
    });
    await page.goto(`${locale === 'en' ? '/en' : ''}/catalogue/nice`);
    await page.locator('[data-testid^="tour-card-"]').first().click();
    await expect(page.getByTestId('tour-play-button')).toBeVisible();
    await page.goto(`${page.url().split('#')[0]}#ecouter`);
    const audio = page.getByTestId('scene-audio');
    const play = page.getByTestId('tour-play-button');
    await expect(play).toBeFocused();
    await expect(audio).not.toHaveAttribute('src');
    expect(mediaRequests).toBe(0);
    await play.click();
    await expect(audio).toHaveJSProperty('ended', true);
    const firstSource = await audio.getAttribute('src');
    const requestCount = mediaRequests;
    expect(requestCount).toBeGreaterThan(0);
    // Attente observée après une vraie fin WAV, sans dispatchEvent ni faux play().
    await page.waitForTimeout(1_500);
    await expect(audio).toHaveJSProperty('paused', true);
    await expect(audio).toHaveAttribute('src', firstSource!);
    expect(mediaRequests).toBe(requestCount);
    const next = page.getByTestId('tour-next-button');
    if (await next.count()) {
      await next.click();
      await expect(audio).not.toHaveAttribute('src', firstSource!);
      await expect(audio).toHaveJSProperty('ended', true);
    } else {
      // Une visite payante ne propose désormais qu’une étape d’aperçu.
      await expect(page.getByTestId('tour-ending-purchase-link')).toHaveAttribute('href', '#acheter');
      await expect(page.locator('[data-testid^="scene-listen-button-"]')).toHaveCount(1);
    }
    await expect(audio).toHaveCount(1);
  });

  test(`EV-3/5 ${locale} : filtres, retour, fiche responsive et audio unique`, async ({ page }) => {
    const prefix = locale === 'en' ? '/en' : '';
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${prefix}/catalogue/nice?audio=bogus&duration=invalid`);
    const refuse = page.getByRole('button', { name: locale === 'en' ? 'Decline' : 'Refuser', exact: true });
    if (await refuse.isVisible()) await refuse.click();
    const cards = page.locator('[data-testid^="tour-card-"]');
    await expect(cards.first()).toBeVisible();
    await page.getByRole('combobox', { name: locale === 'en' ? 'Duration' : 'Durée', exact: true }).selectOption('short');
    await expect(page).toHaveURL(/duration=short/);
    await page.getByRole('button', { name: locale === 'en' ? 'Open menu' : 'Ouvrir le menu', exact: true }).click();
    await expect(page.getByRole('link', { name: locale === 'en' ? 'FR' : 'EN', exact: true }).first()).toHaveAttribute('href', /duration=short/);
    await page.getByRole('button', { name: locale === 'en' ? 'Close menu' : 'Fermer le menu', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('combobox', { name: locale === 'en' ? 'Duration' : 'Durée', exact: true })).toHaveValue('short');
    await cards.first().click();
    await expect(page.getByTestId('tour-play-button')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('scene-audio')).toHaveCount(1);
    await expect(page.getByTestId('scene-audio')).toHaveJSProperty('paused', true);
    expect((await page.locator('#itineraire').boundingBox())!.y).toBeLessThan((await page.locator('#acheter').boundingBox())!.y);
    for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `débordement ${width}`).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `test-results/ev-fiche-${locale}-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: `test-results/ev-fiche-${locale}-ordinateur.png`, fullPage: true });
    await page.goBack();
    await expect(page.getByRole('combobox', { name: locale === 'en' ? 'Duration' : 'Durée', exact: true })).toHaveValue('short');
    await page.getByRole('button', { name: locale === 'en' ? 'Clear filters' : 'Effacer les filtres' }).click();
    await expect(page).not.toHaveURL(/audio=|duration=|price=/);
  });

  test(`EV-4/5 ${locale} : bibliothèque déconnectée et aide`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(locale === 'en' ? '/en/my-purchases' : '/mes-achats');
    await expect(page.locator('main').getByRole('link', { name: locale === 'en' ? 'Sign in' : 'Se connecter', exact: true })).toHaveAttribute('href', /returnTo=/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto(locale === 'en' ? '/en/help' : '/aide');
    await expect(page.locator('#visiteur')).toContainText(locale === 'en' ? 'not synchronised' : 'pas synchronisée');
    expect((await new AxeBuilder({ page }).include('#visiteur').analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
