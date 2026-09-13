import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['fr', 'en'] as const) {
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
