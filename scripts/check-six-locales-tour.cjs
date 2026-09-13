const { chromium } = require('@playwright/test');
const fs = require('node:fs');

const baseUrl = process.env.SIX_LOCALES_BASE_URL || 'http://localhost:3106';
const locales = ['fr', 'en', 'es', 'de', 'it', 'nl'];
const slug = '/catalogue/aix-en-provence/aix-en-provence-places-et-portes';

(async () => {
  const browser = await chromium.launch({headless: true});
  const results = [];
  for (const width of [320, 1440]) {
    for (const locale of locales) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const path = `${locale === 'fr' ? '' : `/${locale}`}${slug}`;
      const response = await page.goto(`${baseUrl}${path}`, {waitUntil: 'domcontentloaded', timeout: 180000});
      await page.waitForFunction(() => !!document.querySelector('h1') && document.querySelectorAll('ol > li').length >= 2);
      await page.waitForFunction(() => [...document.querySelectorAll('main img')].some(image => image.complete && image.naturalWidth > 0));
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const rendered = await page.evaluate(() => {
        const stops = [...document.querySelectorAll('ol > li')];
        const images = [...document.querySelectorAll('main img')];
        return {
          lang: document.documentElement.lang,
          title: document.title,
          heading: document.querySelector('h1')?.textContent?.trim() || '',
          overflow: document.documentElement.scrollWidth > innerWidth,
          stopCount: stops.length,
          lockedStops: stops.filter(stop => stop.hasAttribute('aria-label')).length,
          listenButtons: stops.filter(stop => stop.querySelector('button')).length,
          loadedImages: images.filter(image => image.complete && image.naturalWidth > 0).length,
          sourceWarning: !!document.querySelector('[data-testid="itinerary-source-language"]'),
        };
      });
      results.push({width, locale, path, status: response?.status(), errors, ...rendered});
      await page.close();
    }
  }
  await browser.close();
  fs.writeFileSync('.six-tour-browser-results.json', JSON.stringify(results, null, 2));
  const failures = results.filter(row => row.status !== 200 || row.lang !== row.locale || row.overflow || row.errors.length || !row.heading || row.stopCount < 2 || row.loadedImages < 1 || row.lockedStops !== row.stopCount - 1 || row.listenButtons > 1);
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
