import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['fr', 'en'] as const) {
  test(`accueil ${locale} : recherche, compte et création sur tous les écrans`, async ({ page, request }) => {
    const prefix = locale === 'en' ? '/en' : '';
    await page.goto(prefix || '/');
    await expect(page.getByTestId('home-tour').first()).toBeVisible({ timeout: 60_000 });
    const consent = page.getByRole('button', { name: locale === 'en' ? 'Refuse' : 'Refuser', exact: true });
    if (await consent.isVisible()) await consent.click();
    for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const button = page.getByRole('button', { name: locale === 'en' ? 'Find a tour' : 'Trouver une visite', exact: true });
      const box = await button.boundingBox();
      expect(box!.y + box!.height).toBeLessThan(844);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `test-results/ev2-accueil-${locale}-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: `test-results/ev2-accueil-${locale}-ordinateur.png`, fullPage: true });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /audio/);
    await expect(page).toHaveTitle(locale === 'en' ? 'Murmure — Discover cities with audio tours' : 'Murmure — Découvrez les villes en visite audio');
    await expect(page.locator('meta[property="og:image:alt"]')).not.toHaveAttribute('content', /\?/);
    const imagePath = `${prefix}/opengraph-image`;
    const image = await request.get(imagePath);
    expect(image.status()).toBe(200); expect(image.headers()['content-type']).toContain('image/png');
    await page.locator('main').getByRole('link', { name: locale === 'en' ? 'My tours' : 'Mes visites', exact: true }).click();
    await expect(page.getByRole('heading', { name: locale === 'en' ? 'My tours' : 'Mes visites', exact: true })).toBeVisible();
    await page.goto(prefix || '/');
    await page.getByLabel(locale === 'en' ? 'Which city?' : 'Dans quelle ville ?').fill('nIcE');
    await page.getByRole('button', { name: locale === 'en' ? 'Find a tour' : 'Trouver une visite', exact: true }).click();
    await expect(page.getByTestId('city-search')).toHaveValue('nIcE');
    expect(new URL(page.url()).searchParams.get('q')).toBe('nIcE');
    await expect(page.locator('main').getByRole('heading', { name: 'Nice', exact: true })).toBeVisible();
    await expect(page.locator('main').getByRole('heading', { name: 'Cannes', exact: true })).toHaveCount(0);
    await page.goto(locale === 'en' ? '/en/create-tours' : '/creer-des-visites');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page.locator('main').getByRole('link', { name: locale === 'en' ? 'Open my Studio' : 'Accéder à mon Studio', exact: true })).toHaveAttribute('href', '/guide/studio');
    await page.locator('main').getByRole('link', { name: locale === 'en' ? 'Become a guide' : 'Devenir guide', exact: true }).click();
    await expect(page).toHaveURL(/\/guide\/signup/);
    expect(await page.evaluate(() => localStorage.getItem('murmure-studio-locale'))).toBe(locale);
  });
}

test('recherche native sans JavaScript, accents et aucun résultat', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://localhost:3102/');
  await page.getByLabel('Dans quelle ville ?').fill('níce');
  await page.getByRole('button', { name: 'Trouver une visite', exact: true }).click();
  await expect(page.getByTestId('city-search')).toHaveValue('níce');
  await expect(page.locator('main').getByRole('heading', { name: 'Nice', exact: true })).toBeVisible();
  await page.goto('http://localhost:3102/catalogue?q=ville-inexistante-ev2');
  await expect(page.getByText(/Aucune ville ne correspond/)).toBeVisible();
  await context.close();
});

test('une reprise vers une scène disparue ne déclenche aucune lecture', async ({ page }) => {
  await page.goto('/catalogue/nice');
  const card = page.locator('[data-testid^="tour-card-"]').first();
  const testId = await card.getAttribute('data-testid');
  const id = testId!.slice('tour-card-'.length);
  await page.evaluate(({ id }) => localStorage.setItem(`murmure.player.resume.${id}`, JSON.stringify({ sceneId: 'scene-retiree-ev2', position: 12, updatedAt: Date.now() })), { id });
  await page.goto('/');
  const resume = page.getByRole('link', { name: /Retrouver mon écoute/ });
  await expect(resume).toBeVisible({ timeout: 60_000 });
  await expect(resume).toHaveAttribute('href', /#itineraire$/);
  await resume.click();
  await expect(page.getByTestId('scene-audio')).toHaveCount(1, { timeout: 60_000 });
  const audio = page.getByTestId('scene-audio');
  await expect(audio).toHaveJSProperty('paused', true);
  await expect(audio).toHaveJSProperty('currentTime', 0);
  await expect(audio).not.toHaveAttribute('src', /.+/);
});
