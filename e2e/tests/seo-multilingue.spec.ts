import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * Recette SEO multilingue — ce qu'un robot reçoit vraiment.
 *
 * Les tests unitaires prouvent la règle ; celui-ci prouve le HTML servi : codes
 * HTTP réels, canonical et hreflang dans la source rendue, sitemap et robots
 * sur le port local, page utile sans JavaScript, et aucune régression de mise
 * en page de 320 à 1440 px.
 *
 * Jeu de données (mode bouchon, voir `MOCK_TOURS`) :
 *
 * | Visite                         | Langues indexables |
 * |--------------------------------|--------------------|
 * | grasse/ame-des-parfumeurs      | fr, en             |
 * | grasse/vieille-ville           | fr                 |
 * | paris/secrets-de-montmartre    | fr, en, es         |
 * | lyon/traboules-vieux-lyon      | fr, it             |
 */

const SITE = 'https://murmure-visit.com';
const ROBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const BILINGUE = '/catalogue/grasse/ame-des-parfumeurs';
const TRILINGUE = '/catalogue/paris/secrets-de-montmartre';
const FR_SEULE = '/catalogue/grasse/vieille-ville';

/** Le chemin localisé, comme `localizePublicPath` le fabrique côté serveur. */
const localized = (path: string, locale: string) => (locale === 'fr' ? path : `/${locale}${path}`);

async function head(page: Page) {
  return page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    alternates: Object.fromEntries(
      [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((node) => [
        node.getAttribute('hreflang'),
        node.getAttribute('href'),
      ]),
    ) as Record<string, string>,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
    lang: document.documentElement.lang,
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) =>
      JSON.parse(node.textContent ?? '{}'),
    ) as Array<Record<string, unknown>>,
  }));
}

async function locs(request: APIRequestContext): Promise<string[]> {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

test.describe('robots et sitemap', () => {
  test('robots interdit les espaces privés dans les six langues et annonce le sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain(`Sitemap: ${SITE}/sitemap.xml`);
    for (const forbidden of ['/api/', '/guide/', '/admin/', '/mes-achats', '/mes-visites', '/en/my-purchases', '/es/my-purchases', '/de/my-purchases', '/it/my-purchases', '/nl/my-purchases']) {
      expect(body).toContain(`Disallow: ${forbidden}`);
    }
  });

  test('le sitemap ne liste que des URL absolues, publiées, sans doublon', async ({ request }) => {
    const urls = await locs(request);
    expect(urls.length).toBeGreaterThan(0);
    // La racine est annoncée sans barre oblique finale, comme sa canonical.
    for (const url of urls) expect(url === SITE || url.startsWith(`${SITE}/`)).toBe(true);
    expect(urls).toContain(SITE);
    expect(new Set(urls).size).toBe(urls.length);
    // Aucun espace privé, aucune page filtrée.
    for (const url of urls) {
      expect(url).not.toMatch(/\/(mes-achats|mes-visites|my-purchases|sign-in|connexion|admin|guide\/)/);
      expect(url).not.toContain('?');
    }
  });

  test('le sitemap suit le contrat d’indexation, langue par langue', async ({ request }) => {
    const urls = new Set(await locs(request));
    // Visite bilingue : FR et EN, rien d'autre.
    for (const locale of ['fr', 'en']) expect(urls).toContain(`${SITE}${localized(BILINGUE, locale)}`);
    for (const locale of ['es', 'de', 'it', 'nl']) expect(urls).not.toContain(`${SITE}${localized(BILINGUE, locale)}`);
    // Visite à trois langues.
    for (const locale of ['fr', 'en', 'es']) expect(urls).toContain(`${SITE}${localized(TRILINGUE, locale)}`);
    for (const locale of ['de', 'it', 'nl']) expect(urls).not.toContain(`${SITE}${localized(TRILINGUE, locale)}`);
    // Visite française seule.
    expect(urls).toContain(`${SITE}${FR_SEULE}`);
    expect(urls).not.toContain(`${SITE}${localized(FR_SEULE, 'en')}`);
    // La ville hérite de l'union des langues de ses visites.
    for (const locale of ['fr', 'en']) expect(urls).toContain(`${SITE}${localized('/catalogue/grasse', locale)}`);
    expect(urls).not.toContain(`${SITE}${localized('/catalogue/grasse', 'de')}`);
    // Les pages éditoriales restent dans les six langues.
    for (const locale of ['fr', 'en', 'es', 'de', 'it', 'nl']) {
      expect(urls).toContain(`${SITE}${localized('/catalogue', locale)}`);
    }
  });

  test('chaque URL du sitemap répond 200 sur ce serveur', async ({ request }) => {
    const paths = [...new Set((await locs(request)).map((url) => url.slice(SITE.length) || '/'))];
    expect(paths.length).toBeGreaterThan(10);
    for (const path of paths) {
      const response = await request.get(path, { maxRedirects: 0, headers: { 'user-agent': ROBOT_UA } });
      expect(response.status(), `${path} devrait répondre 200`).toBe(200);
    }
  });
});

test.describe('canonical, hreflang et x-default', () => {
  for (const locale of ['fr', 'en'] as const) {
    test(`la variante publiée ${locale} est auto-référente et réciproque`, async ({ page }) => {
      await page.goto(localized(BILINGUE, locale));
      const meta = await head(page);
      expect(meta.canonical).toBe(`${SITE}${localized(BILINGUE, locale)}`);
      expect(meta.robots).toBeNull();
      expect(Object.keys(meta.alternates).sort()).toEqual(['en', 'fr', 'x-default']);
      expect(meta.alternates.fr).toBe(`${SITE}${BILINGUE}`);
      expect(meta.alternates.en).toBe(`${SITE}/en${BILINGUE}`);
      expect(meta.alternates['x-default']).toBe(`${SITE}${BILINGUE}`);
      // Auto-référence : le groupe contient la page elle-même.
      expect(Object.values(meta.alternates)).toContain(meta.canonical);
      expect(meta.lang).toBe(locale);
      for (const href of Object.values(meta.alternates)) expect(href.startsWith('https://')).toBe(true);
    });
  }

  test('les trois variantes de la visite trilingue se désignent mutuellement', async ({ page }) => {
    const groups: Array<Record<string, string>> = [];
    for (const locale of ['fr', 'en', 'es']) {
      await page.goto(localized(TRILINGUE, locale));
      groups.push((await head(page)).alternates);
    }
    for (const group of groups) {
      expect(Object.keys(group).sort()).toEqual(['en', 'es', 'fr', 'x-default']);
      expect(group).toEqual(groups[0]);
    }
  });

  test('une variante non publiée est servie, jamais indexée, et n’annonce aucune langue', async ({ page }) => {
    for (const locale of ['de', 'it', 'nl']) {
      const response = await page.goto(localized(BILINGUE, locale));
      expect(response?.status()).toBe(200);
      const meta = await head(page);
      expect(meta.robots).toMatch(/noindex/);
      expect(meta.robots).toMatch(/follow/);
      expect(meta.canonical).toBe(`${SITE}${localized(BILINGUE, locale)}`);
      expect(Object.keys(meta.alternates)).toHaveLength(0);
    }
  });

  test('les espaces personnels refusent l’index dans toutes les langues', async ({ page }) => {
    for (const path of ['/mes-achats', '/en/my-purchases', '/es/my-purchases', '/de/my-purchases']) {
      await page.goto(path);
      expect((await head(page)).robots).toMatch(/noindex/);
    }
  });
});

test.describe('codes réels', () => {
  test('une ville et une visite inconnues répondent 404', async ({ request }) => {
    for (const path of ['/catalogue/ville-inconnue', '/catalogue/grasse/visite-inconnue', '/en/catalogue/ville-inconnue', '/de/catalogue/grasse/visite-inconnue']) {
      expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
    }
  });

  test('aucune page publique ne redirige', async ({ request }) => {
    for (const path of ['/', '/en', '/es/catalogue', '/catalogue/grasse', BILINGUE, `/en${BILINGUE}`]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
    }
  });
});

test.describe('données structurées', () => {
  test('l’accueil se présente comme éditeur et comme site', async ({ page }) => {
    await page.goto('/es');
    const types = (await head(page)).jsonLd.map((node) => node['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
  });

  test('la fiche visite décrit la visite et son fil d’Ariane, fidèlement', async ({ page }) => {
    await page.goto(BILINGUE);
    const meta = await head(page);
    const trip = meta.jsonLd.find((node) => node['@type'] === 'TouristTrip')!;
    expect(trip.url).toBe(`${SITE}${BILINGUE}`);
    expect(trip['@id']).toBe(trip.url);

    const crumbs = meta.jsonLd.find((node) => node['@type'] === 'BreadcrumbList')!;
    const items = crumbs.itemListElement as Array<{ name: string; item?: string }>;
    // La comparaison ignore la casse : le fil visible porte `text-transform:
    // uppercase`, qui est une mise en forme, pas un libellé. Ce sont les mêmes
    // mots, dans le même ordre.
    const visible = await page.locator('main nav[aria-label]').first().innerText();
    const normalise = (value: string) => value.trim().toLocaleUpperCase('fr-FR');
    expect(items.map((item) => normalise(item.name))).toEqual(visible.split('/').map(normalise));
    for (const item of items) if (item.item) expect(item.item.startsWith('https://')).toBe(true);
  });

  test('la page ville porte son fil d’Ariane structuré', async ({ page }) => {
    await page.goto('/en/catalogue/grasse');
    const crumbs = (await head(page)).jsonLd.find((node) => node['@type'] === 'BreadcrumbList')!;
    expect((crumbs.itemListElement as Array<{ item?: string }>)[0].item).toBe(`${SITE}/en/catalogue`);
  });
});

test.describe('contenu servi aux robots', () => {
  test.use({ javaScriptEnabled: false, userAgent: ROBOT_UA });

  test('la page ville est utile sans JavaScript, dans chaque langue indexée', async ({ page }) => {
    for (const locale of ['fr', 'en']) {
      await page.goto(localized('/catalogue/grasse', locale));
      const body = await page.locator('body').innerText();
      expect(await page.locator('h1').innerText()).toContain('Grasse');
      // Introduction relue de la ville, et faits réels de son catalogue.
      expect(body).toMatch(locale === 'fr' ? /parfum/i : /perfume/i);
      expect(body).toContain('2');
      expect(body).toMatch(/45|35/);
      // Les visites de la ville sont des liens explorables.
      const hrefs = await page.locator('a[href*="/catalogue/grasse/"]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('href')),
      );
      expect(hrefs).toContain(localized(BILINGUE, locale));
    }
  });

  test('la fiche visite relie ville, guide et visites voisines sans JavaScript', async ({ page }) => {
    await page.goto(`/en${BILINGUE}`);
    // Hors du bandeau : le sélecteur de langue pointe délibérément vers les
    // cinq autres versions, français compris. C'est son travail.
    const hrefs = await page
      .locator('main a[href^="/"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));
    expect(hrefs).toContain('/en/catalogue/grasse');
    expect(hrefs).toContain('/en/catalogue');
    expect(hrefs).toContain(`/en${FR_SEULE}`);
    // Aucun lien de contenu ne ramène vers le français depuis la page anglaise.
    const internes = hrefs.filter((href) => /^\/(catalogue|guides)\//.test(href));
    expect(internes).toEqual([]);
  });

  test('le titre et la description sont localisés et dimensionnés', async ({ page }) => {
    for (const [locale, mot] of [['fr', 'visite audio'], ['en', 'audio tour']] as const) {
      await page.goto(localized(BILINGUE, locale));
      const meta = await head(page);
      expect(meta.title).toContain(mot);
      expect(meta.title).toContain('Grasse');
      expect(meta.description!.length).toBeGreaterThanOrEqual(100);
      expect(meta.description!.length).toBeLessThanOrEqual(170);
    }
  });
});

test.describe('navigation entre langues', () => {
  test('changer de langue conserve la ville et la visite', async ({ page }) => {
    await page.goto(TRILINGUE);
    for (const locale of ['en', 'es']) {
      const href = await page.locator(`a[href="${localized(TRILINGUE, locale)}"], a[hreflang="${locale}"]`).first().getAttribute('href');
      expect(href).toBe(localized(TRILINGUE, locale));
    }
  });
});

test.describe('mise en page responsive', () => {
  for (const width of [320, 390, 768, 1440]) {
    test(`aucun débordement horizontal à ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/catalogue', '/catalogue/grasse', BILINGUE]) {
        await page.goto(path);
        const overflow = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        expect(overflow.scroll, `${path} déborde à ${width} px`).toBeLessThanOrEqual(overflow.client + 1);
      }
    });
  }
});
