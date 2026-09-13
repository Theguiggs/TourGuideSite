import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

async function mockCognito(page: Page) {
  const calls: string[] = [];
  await page.route('https://cognito-idp.*.amazonaws.com/**', async route => {
    const operation = route.request().headers()['x-amz-target']?.split('.').pop() ?? '';
    calls.push(operation);
    const data: Record<string, object> = {
      SignUp: { UserConfirmed: false, UserSub: '00000000-0000-4000-8000-000000000001', CodeDeliveryDetails: { Destination: 'v***@example.test', DeliveryMedium: 'EMAIL', AttributeName: 'email' } },
      ConfirmSignUp: {}, ResendConfirmationCode: {},
      ForgotPassword: { CodeDeliveryDetails: { DeliveryMedium: 'EMAIL', AttributeName: 'email' } },
      ConfirmForgotPassword: {},
    };
    await route.fulfill({ status: operation in data ? 200 : 400, contentType: 'application/x-amz-json-1.1', body: JSON.stringify(data[operation] ?? { __type: 'NotAuthorizedException', message: 'Incorrect username or password.' }) });
  });
  return calls;
}

test('compte FR/EN : tous formats, clavier et absence de débordement', async ({ page }) => {
  await mockCognito(page);
  for (const path of ['/connexion', '/inscription', '/mot-de-passe-oublie', '/en/sign-in', '/en/sign-up', '/en/reset-password']) {
    await page.goto(path);
    await expect(page.locator('form')).toBeVisible();
    for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const input = page.getByLabel('Email');
      await input.focus(); await expect(input).toBeFocused();
      const rect = await input.boundingBox();
      expect(rect!.width).toBeGreaterThan(200); expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await page.locator('form button[type=submit]').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  }
  await page.goto('/connexion');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/ev1-connexion-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/ev1-connexion-ordinateur.png', fullPage: true });
});

test('inscription et récupération simulées : destination et étape conservées en anglais', async ({ page }) => {
  const calls = await mockCognito(page);
  const target = '/catalogue/nice/test?lang=es#scene-2';
  await page.goto(`/inscription?returnTo=${encodeURIComponent(target)}`);
  await page.getByLabel('Email').fill('visiteur@example.test');
  await page.getByLabel('Mot de passe', { exact: true }).fill('Visiteur1!');
  await page.getByRole('button', { name: 'Créer mon compte', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Confirmer mon email' })).toBeVisible();
  await page.getByLabel('Code reçu par email').fill('123456');
  await page.getByRole('button', { name: 'Confirmer mon compte', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Se connecter', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Créer un compte visiteur' }).click();
  await expect(page.getByRole('heading', { name: 'Créer mon compte', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Déjà un compte ? Se connecter' }).click();
  await expect(page.getByRole('heading', { name: 'Se connecter', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('header').getByRole('link', { name: 'EN', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/en/catalogue/nice/test?lang=es#scene-2');
  await page.getByRole('link', { name: 'Forgot your password?' }).click();
  await page.getByLabel('Email').fill('visiteur@example.test');
  await page.getByRole('button', { name: 'Send the code', exact: true }).click();
  await page.getByLabel('Code from your email').fill('123456');
  await page.getByLabel('New password').fill('Nouveau1!');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(calls).toEqual(['SignUp', 'ConfirmSignUp', 'ForgotPassword', 'ConfirmForgotPassword']);
  expect(page.url()).not.toContain('visiteur%40');
});

test('navigation mobile : fiche réelle, commandes non recouvertes et retour conservé', async ({ page }) => {
  await mockCognito(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/catalogue/nice');
  await page.locator('[data-testid^="tour-card-"]').first().click();
  await expect(page.getByTestId('tour-play-button')).toBeVisible({ timeout: 60_000 });
  const tourPath = new URL(page.url()).pathname;
  await page.goto(`${tourPath}?lang=en#acheter`);
  const nav = page.getByRole('navigation', { name: 'Navigation visiteur', exact: true });
  await expect(nav).toBeVisible();
  const navBox = await nav.boundingBox();
  const ctaBox = await page.locator('.tour-mobile-app-cta').boundingBox();
  expect(ctaBox!.y + ctaBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
  await page.screenshot({ path: 'test-results/ev1-navigation-fiche-mobile.png' });
  await nav.getByRole('link', { name: 'Compte', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Se connecter', exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe(`${tourPath}?lang=en#acheter`);
  await expect(page.getByRole('navigation', { name: 'Navigation visiteur', exact: true })).toHaveCount(0);
});
