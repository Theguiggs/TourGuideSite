import { SITE_LOCALES } from '@/lib/i18n/locales';
import { SITE_URL } from '@/lib/site';
import { hreflangGroup, orderLocales, publicPath, publicUrl, seoAlternates, sitemapEntries, xDefaultLocale } from '../urls';

const SOURCE = '/catalogue/nice/vieux-nice';

describe('publicPath / publicUrl', () => {
  it('garde le français sans préfixe et préfixe les cinq autres langues', () => {
    expect(publicPath(SOURCE, 'fr')).toBe(SOURCE);
    for (const locale of SITE_LOCALES.filter(l => l !== 'fr')) {
      expect(publicPath(SOURCE, locale)).toBe(`/${locale}${SOURCE}`);
    }
  });

  it('rend des URL absolues sur le domaine du site', () => {
    expect(publicUrl(SOURCE, 'de')).toBe(`${SITE_URL}/de${SOURCE}`);
    // Racine sans barre oblique : la forme que Next inscrit dans la canonical.
    expect(publicUrl('/', 'fr')).toBe(SITE_URL);
    expect(publicUrl('/', 'en')).toBe(`${SITE_URL}/en`);
  });

  it('conserve la ville et la visite d’une langue à l’autre', () => {
    const paths = SITE_LOCALES.map(locale => publicPath(SOURCE, locale));
    for (const path of paths) expect(path).toContain('/catalogue/nice/vieux-nice');
    expect(new Set(paths).size).toBe(SITE_LOCALES.length);
  });
});

describe('hreflangGroup', () => {
  it('est absolu, auto-référent et complété par x-default', () => {
    const group = hreflangGroup(SOURCE, ['en', 'fr']);
    expect(group).toEqual({
      fr: `${SITE_URL}${SOURCE}`,
      en: `${SITE_URL}/en${SOURCE}`,
      'x-default': `${SITE_URL}${SOURCE}`,
    });
    for (const href of Object.values(group)) expect(href.startsWith('https://')).toBe(true);
  });

  it('est réciproque : chaque variante annonce le même groupe', () => {
    const published = ['fr', 'en', 'de'] as const;
    const groups = published.map(locale => ({ locale, group: seoAlternates({ sourcePath: SOURCE, locale, published }).alternates.languages }));
    for (const { locale, group } of groups) {
      expect(group).toEqual(groups[0].group);
      expect(Object.values(group ?? {})).toContain(publicUrl(SOURCE, locale));
    }
  });

  it('désigne le français en repli, sinon la première langue publiée', () => {
    expect(xDefaultLocale(['en', 'fr', 'de'])).toBe('fr');
    expect(xDefaultLocale(['nl', 'de'])).toBe('de');
    expect(xDefaultLocale([])).toBeUndefined();
    expect(hreflangGroup(SOURCE, [])).toEqual({});
  });

  it('classe les langues dans l’ordre du site, sans doublon', () => {
    expect(orderLocales(['nl', 'fr', 'nl', 'en'])).toEqual(['fr', 'en', 'nl']);
  });
});

describe('seoAlternates', () => {
  it('donne une canonical auto-référente à chaque langue publiée', () => {
    for (const locale of SITE_LOCALES) {
      const { alternates, robots } = seoAlternates({ sourcePath: SOURCE, locale, published: SITE_LOCALES });
      expect(alternates.canonical).toBe(publicUrl(SOURCE, locale));
      expect(alternates.languages?.[locale]).toBe(alternates.canonical);
      expect(robots).toBeUndefined();
    }
  });

  it('interdit l’index d’une variante non publiée sans couper le suivi des liens', () => {
    const { alternates, robots } = seoAlternates({ sourcePath: SOURCE, locale: 'it', published: ['fr'] });
    expect(alternates.canonical).toBe(publicUrl(SOURCE, 'it'));
    expect(alternates.languages).toBeUndefined();
    expect(robots).toEqual({ index: false, follow: true });
  });
});

describe('sitemapEntries', () => {
  it('produit une URL canonical par langue publiée, toutes porteuses du groupe', () => {
    const entries = sitemapEntries(SOURCE, ['fr', 'en'], { priority: 0.7 });
    expect(entries.map(e => e.url)).toEqual([`${SITE_URL}${SOURCE}`, `${SITE_URL}/en${SOURCE}`]);
    for (const entry of entries) {
      expect(entry.alternates.languages).toEqual(hreflangGroup(SOURCE, ['fr', 'en']));
      expect(entry.priority).toBe(0.7);
    }
  });

  it('ne liste rien quand aucune variante n’est publiée', () => {
    expect(sitemapEntries(SOURCE, [], {})).toEqual([]);
  });
});
