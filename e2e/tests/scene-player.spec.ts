/** LW-6 : vraie page et vrai élément audio ; le fichier sonore est servi par le test. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page, Route } from '@playwright/test';

// Afficher aussi le lien applicatif, masqué sur ordinateur sans magasin configuré.
test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36' });

/** Lecture seule du catalogue existant, aucun compte ni semis distant nécessaire. */
async function openTour(page: Page, locale: 'fr' | 'en') {
  const prefix = locale === 'en' ? '/en' : '';
  if (process.env.LW6_TOUR_PATH) {
    await page.goto(`${prefix}${process.env.LW6_TOUR_PATH}`);
  } else {
    await page.goto(`${prefix}/catalogue/nice`);
    await page.locator('[data-testid^="tour-card-"]').first().click();
  }
  await expect(page.getByTestId('tour-play-button')).toBeVisible({ timeout: 45_000 });
}

// Une minute de silence PCM : lecture réelle, sans dépendre d’un objet S3 de production.
function silence(): Buffer {
  const size = 60 * 8000 * 2;
  const wav = Buffer.alloc(44 + size);
  wav.write('RIFF'); wav.writeUInt32LE(36 + size, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(size, 40);
  return wav;
}

async function serveAudio(route: Route) {
  if (route.request().resourceType() !== 'media') return route.continue();
  const body = silence();
  const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? '');
  const start = range ? Number(range[1]) : 0;
  const end = range?.[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
  return route.fulfill({
    status: range ? 206 : 200,
    contentType: 'audio/wav',
    headers: { 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${body.length}` } : {}) },
    body: body.subarray(start, end + 1),
  });
}

for (const locale of ['fr', 'en'] as const) {
  test(`lecteur ouvert, clavier et axe (${locale})`, async ({ page }, testInfo) => {
    let mediaRequests = 0;
    page.on('request', (request) => { if (request.resourceType() === 'media') mediaRequests++; });
    await page.route('**/*', serveAudio);
    await openTour(page, locale);
    const control = page.getByTestId('tour-play-button');
    await expect(control).toBeVisible();
    await expect(page.getByRole('combobox', { name: locale === 'en' ? 'Listening language' : 'Langue d’écoute' })).toBeEnabled();
    const before = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(mediaRequests).toBe(0);
    await control.focus();
    await page.keyboard.press('Space');
    await expect(control).toHaveText('Pause');
    const audio = page.getByTestId('scene-audio');
    await expect(audio).toHaveJSProperty('paused', false);
    await expect(page.locator('audio')).toHaveCount(1);
    await page.keyboard.press('Space');
    await expect(audio).toHaveJSProperty('paused', true);
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.currentTime), { timeout: 2000 }).toBeGreaterThan(9);
    const after = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await testInfo.attach('axe-page-visite', { body: JSON.stringify({ before, after }, null, 2), contentType: 'application/json' });
    const fingerprints = (result: typeof before) => result.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}:${JSON.stringify(node.target)}`));
    expect(fingerprints(after).filter((entry) => !fingerprints(before).includes(entry))).toEqual([]);
    const player = await new AxeBuilder({ page }).include('#ecouter').include('[data-testid^="scene-listen-"]').analyze();
    expect(player.violations).toEqual([]);
    await expect(page.getByRole('link', { name: locale === 'en' ? 'Walk with the app' : 'Marcher avec l’appli', exact: true }).first()).toBeVisible();
  });
}

test('l’ancre propose une reprise, sans lecture automatique', async ({ page }) => {
  await page.route('**/*', serveAudio);
  await openTour(page, 'fr');
  await page.getByTestId('tour-play-button').click();
  const audio = page.getByTestId('scene-audio');
  await expect(audio).toHaveJSProperty('paused', false);
  await audio.evaluate((node: HTMLAudioElement) => { node.currentTime = 17; node.pause(); });
  await page.goto(`${page.url().split('#')[0]}#ecouter`);
  await page.reload();
  await expect(page.getByTestId('tour-resume-button')).toBeFocused();
  await expect(page.getByTestId('scene-audio')).toHaveJSProperty('paused', true);
});

test('langue : change la source, repart à zéro et conserve le choix au rechargement', async ({ page }) => {
  // Fixture de traduction sur les seules scènes audio publiques déjà servies.
  // Le fragment distingue la source dans le lecteur ; le son reste le WAV de test.
  await page.route('**/*', async (route) => {
    if (route.request().postData()?.includes('getPublishedTourContent')) {
      const result = await route.fetch();
      const body = await result.json();
      const content = body.data?.getPublishedTourContent;
      if (content?.scenes) {
        for (const scene of content.scenes) {
          if (scene.audioUrl) scene.translatedAudioUrls = JSON.stringify({ en: `${scene.audioUrl}#lw3-en` });
        }
      }
      return route.fulfill({ response: result, json: body });
    }
    return serveAudio(route);
  });
  await openTour(page, 'fr');
  const selector = page.getByRole('combobox', { name: 'Langue d’écoute' });
  await expect(selector).toBeEnabled();
  const options = await selector.locator('option').evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));
  expect(options).toContain('en');
  const baseLanguage = options[0];
  await page.getByTestId('tour-play-button').click();
  const audio = page.getByTestId('scene-audio');
  await expect(audio).toHaveJSProperty('paused', false);
  const original = await audio.getAttribute('src');
  await audio.evaluate((node: HTMLAudioElement) => { node.currentTime = 25; });
  await selector.selectOption('en');
  await expect(audio).not.toHaveAttribute('src', original!);
  await expect(audio).toHaveJSProperty('paused', false);
  await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.currentTime)).toBeLessThan(5);
  await expect(page.locator('audio')).toHaveCount(1);
  await page.getByTestId('tour-play-button').click();
  await selector.selectOption(baseLanguage);
  await expect(audio).toHaveJSProperty('paused', true);
  await selector.selectOption('en');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Langue d’écoute' })).toHaveValue('en');
  await expect(page.getByTestId('scene-audio')).toHaveJSProperty('paused', true);
});
