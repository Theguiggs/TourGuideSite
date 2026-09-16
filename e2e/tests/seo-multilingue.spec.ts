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

test.describe('conseils de visite', () => {
  const ARTICLE_FR_EN = '/visiter-eze-a-pied';
  const ARTICLE_SIX = '/visiter-grasse-a-pied';
  /** `/conseils` devient `/tips` derrière un préfixe de langue (voir `PUBLIC_ROUTE_PAIRS`). */
  const tips = (slug: string, locale: string) => (locale === 'fr' ? `/conseils${slug}` : `/${locale}/tips${slug}`);

  test('un article FR+EN est indexable dans ses deux langues, et dans aucune autre', async ({ page }) => {
    for (const locale of ['fr', 'en']) {
      await page.goto(tips(ARTICLE_FR_EN, locale));
      const h = await head(page);
      expect(h.canonical).toBe(`${SITE}${tips(ARTICLE_FR_EN, locale)}`);
      expect(h.robots ?? '').not.toContain('noindex');
      expect(Object.keys(h.alternates).sort()).toEqual(['en', 'fr', 'x-default']);
      expect(h.jsonLd.map((s) => s['@type'])).toEqual(expect.arrayContaining(['Article', 'BreadcrumbList']));
      expect(h.h1).toBeTruthy();
    }
    await page.goto(tips(ARTICLE_FR_EN, 'de'));
    const de = await head(page);
    expect(de.robots).toContain('noindex');
    expect(Object.keys(de.alternates)).toHaveLength(0);
  });

  test('l’index et l’article six langues sont au sitemap dans les six langues', async ({ request }) => {
    const urls = new Set(await locs(request));
    for (const locale of ['fr', 'en', 'es', 'de', 'it', 'nl']) {
      expect(urls).toContain(`${SITE}${tips('', locale)}`);
      expect(urls).toContain(`${SITE}${tips(ARTICLE_SIX, locale)}`);
    }
    for (const locale of ['es', 'de', 'it', 'nl']) expect(urls).not.toContain(`${SITE}${tips(ARTICLE_FR_EN, locale)}`);
  });

  test('un article inconnu rend un vrai 404, et l’ancienne adresse anglaise de Grasse redirige', async ({ request }) => {
    expect((await request.get('/conseils/inconnu', { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get('/en/tips/inconnu', { maxRedirects: 0 })).status()).toBe(404);
    const legacy = await request.get('/en/tips/visit-grasse-on-foot', { maxRedirects: 0 });
    expect(legacy.status()).toBe(308);
    expect(legacy.headers()['location']).toContain('/en/tips/visiter-grasse-a-pied');
  });

  test('la fiche visite et la page ville relient l’article dans le HTML servi', async ({ request }) => {
    const html = await (await request.get('/catalogue/grasse', { headers: { 'user-agent': ROBOT_UA } })).text();
    expect(html).toContain(`href="${tips(ARTICLE_SIX, 'fr')}"`);
  });
});

test.describe('codes reels et slugs inconnus', () => {
  /**
   * Les segments du catalogue portent un `loading.tsx` : le code HTTP part
   * avant l'execution de la page, donc un slug inconnu y repond 200 avec une
   * page « introuvable » — et un `noindex, nofollow` explicite, qui est ce qui
   * decide de l'indexation. Les routes localisees, sans `loading.tsx`, rendent
   * un vrai 404. Les deux comportements sont voulus ; aucun n'est indexable.
   */
  test('un slug inconnu n’est jamais indexable, quelle que soit la route', async ({ request }) => {
    for (const path of ['/catalogue/ville-inconnue', '/catalogue/grasse/visite-inconnue', '/en/catalogue/ville-inconnue', '/en/catalogue/grasse/visite-inconnue']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
      expect(await response.text(), path).toMatch(/<meta name="robots" content="noindex[^"]*"/);
    }
  });

  test('les routes localisees rendent un vrai 404', async ({ request }) => {
    for (const path of ['/es/catalogue/ville-inconnue', '/de/catalogue/grasse/visite-inconnue', '/guides/inconnu', '/en/guides/inconnu']) {
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

/**
 * Ce qu'un robot qui n'execute AUCUN script recoit.
 *
 * On lit le corps de la reponse, pas le DOM rendu : les segments du catalogue
 * portent un `loading.tsx`, donc Next diffuse le squelette puis le contenu
 * reel dans un `<div hidden>` que le JavaScript echange. Un navigateur sans
 * script ne voit que le squelette ; un analyseur de HTML, lui, recoit tout.
 * C'est cette seconde lecture qui compte pour l'indexation.
 */
test.describe('contenu servi aux robots', () => {
  const fetchHtml = async (request: APIRequestContext, path: string) => {
    const response = await request.get(path, { headers: { 'user-agent': ROBOT_UA }, maxRedirects: 0 });
    expect(response.status(), path).toBe(200);
    return response.text();
  };

  test('la page ville est utile dans le HTML servi, dans chaque langue indexee', async ({ request }) => {
    for (const locale of ['fr', 'en']) {
      const html = await fetchHtml(request, localized('/catalogue/grasse', locale));
      expect(html).toMatch(/<h1[^>]*>[^<]*Grasse/);
      // Introduction relue de la ville, et faits reels de son catalogue.
      expect(html).toMatch(locale === 'fr' ? /parfum/i : /perfume/i);
      expect(html).toMatch(locale === 'fr' ? /minutes/ : /minutes/);
      // Les visites de la ville sont des liens explorables.
      expect(html).toContain(`href="${localized(BILINGUE, locale)}"`);
      expect(html).toContain(`href="${localized(FR_SEULE, locale === 'fr' ? 'fr' : 'en')}"`);
    }
  });

  test('la fiche visite relie ville, guide et visites voisines dans le HTML servi', async ({ request }) => {
    const html = await fetchHtml(request, `/en${BILINGUE}`);
    expect(html).toContain('href="/en/catalogue/grasse"');
    expect(html).toContain('href="/en/catalogue"');
    expect(html).toContain(`href="/en${FR_SEULE}"`);
    // Le fil d'Ariane structure et la visite elle-meme sont dans la reponse.
    expect(html).toContain('BreadcrumbList');
    expect(html).toContain('TouristTrip');
  });

  test('le titre et la description sont localises et dimensionnes', async ({ request }) => {
    for (const [locale, mot] of [['fr', 'visite audio'], ['en', 'audio tour']] as const) {
      const html = await fetchHtml(request, localized(BILINGUE, locale));
      const titre = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
      expect(titre).toContain(mot);
      expect(titre).toContain('Grasse');
      expect(description.length).toBeGreaterThanOrEqual(100);
      expect(description.length).toBeLessThanOrEqual(170);
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

/**
 * Le bandeau de suggestion : il propose, il ne redirige pas.
 *
 * Le contenu servi doit rester IDENTIQUE quelle que soit la langue reclamee —
 * seul le bandeau s'ajoute. C'est ce qui distingue une suggestion d'une
 * negociation de contenu, et ce qui permet a Google d'explorer chaque variante.
 */
test.describe('suggestion de langue', () => {
  const get = (request: APIRequestContext, path: string, acceptLanguage?: string) =>
    request.get(path, { maxRedirects: 0, headers: acceptLanguage ? { 'accept-language': acceptLanguage } : {} });

  test('propose sa langue au visiteur etranger, sans jamais rediriger', async ({ request }) => {
    const response = await get(request, TRILINGUE, 'de-DE,de;q=0.9,en;q=0.8');
    expect(response.status()).toBe(200);
    const html = await response.text();
    // La visite trilingue n'existe pas en allemand : rien ne doit etre propose.
    expect(html).not.toContain('data-testid="language-suggestion"');

    const espagnol = await get(request, TRILINGUE, 'es-ES,es;q=0.9');
    expect(espagnol.status()).toBe(200);
    const htmlEs = await espagnol.text();
    expect(htmlEs).toContain('data-testid="language-suggestion"');
    expect(htmlEs).toContain('Esta página también está disponible en español.');
    expect(htmlEs).toContain(`href="${localized(TRILINGUE, 'es')}"`);
  });

  test('se tait quand le visiteur est deja dans sa langue', async ({ request }) => {
    const html = await (await get(request, localized(TRILINGUE, 'es'), 'es-ES,es;q=0.9')).text();
    expect(html).not.toContain('data-testid="language-suggestion"');
  });

  test('se tait pour un robot qui ne reclame aucune langue', async ({ request }) => {
    const html = await (await request.get(TRILINGUE, { headers: { 'user-agent': ROBOT_UA } })).text();
    expect(html).not.toContain('data-testid="language-suggestion"');
  });

  test('ne change rien au contenu, ni a la canonical, ni aux hreflang', async ({ request }) => {
    const neutre = await (await get(request, TRILINGUE)).text();
    const espagnol = await (await get(request, TRILINGUE, 'es-ES,es;q=0.9')).text();
    for (const html of [neutre, espagnol]) {
      expect(html).toContain(`<link rel="canonical" href="${SITE}${TRILINGUE}"/>`);
      expect(html).toMatch(/hreflang="x-default"/i);
      expect(html).toMatch(/<h1[^>]*>/);
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
