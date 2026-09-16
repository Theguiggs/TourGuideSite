import { SITE_LOCALES } from '@/lib/i18n/locales';
import { SITE_URL } from '@/lib/site';
import { findArticle } from '@/lib/editorial/articles';
import { hreflangGroup, publicUrl } from '../urls';
import { articleMetadata, tipsIndexMetadata } from '../article-metadata';
import { articleJsonLd } from '../json-ld';

const eze = findArticle('visiter-eze-a-pied')!;
const grasse = findArticle('visiter-grasse-a-pied')!;

describe('articleMetadata', () => {
  it('annonce une canonical absolue et le seul groupe des langues publiées, x-default compris', () => {
    const fr = articleMetadata(eze, 'fr');
    expect(fr.alternates?.canonical).toBe(`${SITE_URL}/conseils/visiter-eze-a-pied`);
    expect(fr.alternates?.languages).toEqual(hreflangGroup('/conseils/visiter-eze-a-pied', ['fr', 'en']));
    expect(fr.alternates?.languages?.['x-default']).toBe(`${SITE_URL}/conseils/visiter-eze-a-pied`);
    expect(fr.robots).toBeUndefined();

    const en = articleMetadata(eze, 'en');
    expect(en.alternates?.canonical).toBe(`${SITE_URL}/en/tips/visiter-eze-a-pied`);
    expect(en.alternates?.languages).toEqual(fr.alternates?.languages);
    expect(en.title).toBe(eze.copy.en!.title);
  });

  it('refuse l’index à une langue non publiée, sans annoncer d’autres langues', () => {
    const de = articleMetadata(eze, 'de');
    expect(de.robots).toEqual({ index: false, follow: true });
    expect(de.alternates?.canonical).toBe(`${SITE_URL}/de/tips/visiter-eze-a-pied`);
    expect(de.alternates?.languages).toBeUndefined();
    // Le texte servi est l'original anglais.
    expect(de.title).toBe(eze.copy.en!.title);
  });

  it('relie un article six langues à ses six variantes', () => {
    for (const locale of SITE_LOCALES) {
      const meta = articleMetadata(grasse, locale);
      expect(meta.robots).toBeUndefined();
      expect(meta.alternates?.canonical).toBe(publicUrl('/conseils/visiter-grasse-a-pied', locale));
      expect(Object.keys(meta.alternates?.languages ?? {})).toHaveLength(SITE_LOCALES.length + 1);
    }
  });

  it('décrit la page en Open Graph avec son image quand elle en a une, sinon celle de la marque', () => {
    const withImage = articleMetadata(grasse, 'en');
    expect(withImage.openGraph).toMatchObject({ type: 'article', url: `${SITE_URL}/en/tips/visiter-grasse-a-pied`, locale: 'en_GB' });
    expect(JSON.stringify(withImage.openGraph)).toContain('/images/grasse/routes-du-parfum.webp');
    const brand = articleMetadata(eze, 'fr');
    expect(JSON.stringify(brand.openGraph)).toContain('/opengraph-image');
  });
});

describe('tipsIndexMetadata', () => {
  it('indexe l’index dans les six langues, avec un titre localisé', () => {
    for (const locale of SITE_LOCALES) {
      const meta = tipsIndexMetadata(locale);
      expect(meta.robots).toBeUndefined();
      expect(meta.alternates?.canonical).toBe(publicUrl('/conseils', locale));
      expect(meta.alternates?.languages?.['x-default']).toBe(`${SITE_URL}/conseils`);
    }
    expect(tipsIndexMetadata('fr').title).not.toBe(tipsIndexMetadata('en').title);
  });
});

describe('articleJsonLd', () => {
  it('décrit l’article, sa langue servie et son lieu, avec des URL absolues', () => {
    const schema = articleJsonLd(eze, 'en');
    expect(schema).toMatchObject({
      '@type': 'Article',
      url: `${SITE_URL}/en/tips/visiter-eze-a-pied`,
      headline: eze.copy.en!.title,
      inLanguage: 'en-GB',
      datePublished: '2026-09-16',
      about: { '@type': 'Place', name: 'Èze', address: { addressCountry: 'FR' } },
    });
    expect(schema.image).toBeUndefined();
  });

  it('sur une langue de repli, déclare la langue du texte, pas celle de l’URL', () => {
    expect(articleJsonLd(eze, 'it').inLanguage).toBe('en-GB');
    expect(articleJsonLd(grasse, 'it')).toMatchObject({ inLanguage: 'it-IT', image: `${SITE_URL}/images/grasse/routes-du-parfum.webp` });
  });
});
