import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';

test('production : installation, shell fr/en sans réseau, cache public et réessai intact', async ({ page, context }, testInfo) => {
  const worker = await page.request.get('/sw.js');
  expect(worker.status()).toBe(200);
  expect(worker.headers()['cache-control']).toContain('no-cache');
  await page.goto('/aide');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const reg = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(reg).toBe('http://localhost:3100/');
  const manifest = await (await page.request.get('/manifest.json')).json();
  expect(manifest).toMatchObject({ id: '/', scope: '/', display: 'standalone' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/hors-ligne');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'public/pwa/offline-mobile.png' });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto('/aide');
  const cdp = await context.newCDPSession(page);
  const installability = await cdp.send('Page.getInstallabilityErrors');
  await testInfo.attach('installability', { body: JSON.stringify(installability), contentType: 'application/json' });
  expect(installability.installabilityErrors).toEqual([]);
  await context.setOffline(true);
  await page.goto('/aide?returnTo=%2Fcatalogue&reason=offline');
  await expect(page.getByRole('heading', { name: 'Un instant hors du monde.' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('img')).toHaveJSProperty('naturalWidth', 192);
  const original = page.url();
  await context.setOffline(false);
  await page.getByRole('link', { name: 'Réessayer' }).click();
  await expect(page).toHaveURL(original);
  await expect(page.getByRole('heading', { name: 'Un instant hors du monde.' })).toHaveCount(0);
  await context.setOffline(true);
  await page.goto('/en/help?source=pwa');
  await expect(page.getByRole('heading', { name: 'A moment away from it all.' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const keys = await page.evaluate(async () => {
    const names = await caches.keys();
    return (await Promise.all(names.filter((name) => name.startsWith('murmure-')).map(async (name) => (await (await caches.open(name)).keys()).map((r) => r.url)))).flat();
  });
  expect(keys.some((url) => /appsync|cognito|stripe|X-Amz|\/help|\/aide|\/api\//i.test(url))).toBe(false);
  expect(keys).toContain('http://localhost:3100/offline/en.html');
});

test('mise à jour : bannière sans recharge, activation choisie dans un seul onglet', async ({ page, context }) => {
  await page.goto('/aide');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const other = await context.newPage();
  await other.goto('/aide');
  await other.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await other.evaluate(() => Object.assign(window, { retainedDuringUpdate: true }));
  await page.evaluate(async () => {
    const bytes = new Uint8Array(44 + 16000);
    const view = new DataView(bytes.buffer);
    const text = (offset: number, value: string) => [...value].forEach((char, i) => { bytes[offset + i] = char.charCodeAt(0); });
    text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVEfmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    text(36, 'data'); view.setUint32(40, 16000, true);
    const audio = document.createElement('audio'); audio.muted = true; audio.loop = true;
    audio.src = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
    document.body.appendChild(audio); await audio.play();
  });
  let navigations = 0;
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations++; });
  // Seulement serveur local lancé par cette config ; toujours restaurer le fichier.
  expect(new URL(page.url()).origin).toBe('http://localhost:3100');
  const path = resolve('public/sw.js');
  const original = await readFile(path, 'utf8');
  try {
    await writeFile(path, original.replace("'lw5-v1'", "'lw5-test-update'"));
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await expect(page.getByText('Une nouvelle version est prête.')).toBeVisible();
    expect(navigations).toBe(0);
    await expect(page.locator('audio')).toHaveJSProperty('paused', false);
    await page.getByRole('button', { name: 'Recharger', exact: true }).click();
    await expect.poll(() => navigations).toBeGreaterThan(0);
    expect(await other.evaluate(() => (window as unknown as { retainedDuringUpdate: boolean }).retainedDuringUpdate)).toBe(true);
  } finally { await writeFile(path, original); }
});
