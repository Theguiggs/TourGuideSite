import { cityMetadata } from '../city-metadata';
import { SITE_LOCALES, LOCALE_FORMATS } from '@/lib/i18n/locales';
import { publicUrl } from '@/lib/seo/urls';

it.each(SITE_LOCALES)('identifies the actual city and sets localized social metadata in %s', locale => {
  const result = cityMetadata({ name: 'Nice', slug: 'nice', tourCount: 7 }, locale);
  expect(result.title).toContain('Nice');
  expect(result.description).toContain('Nice');
  expect(result.description).toContain('7');
  expect(result.alternates?.canonical).toBe(publicUrl('/catalogue/nice', locale));
  // Six langues publiées + `x-default`.
  expect(Object.keys(result.alternates?.languages ?? {})).toHaveLength(7);
  expect(result.alternates?.languages?.['x-default']).toBe(publicUrl('/catalogue/nice', 'fr'));
  expect(result.robots).toBeUndefined();
  expect(result.openGraph).toMatchObject({ title: result.title, description: result.description, locale: LOCALE_FORMATS[locale].replace('-', '_'),
    url: result.alternates?.canonical,
    images: [{ url: locale === 'fr' ? '/opengraph-image' : `/${locale}/opengraph-image`, alt: result.title }] });
  expect(result.twitter).toMatchObject({ title: result.title, description: result.description });
});

describe('contrat d’indexation', () => {
  it('n’annonce que les langues où la ville a du contenu', () => {
    const result = cityMetadata({ name: 'Nice', slug: 'nice', tourCount: 2 }, 'en', ['fr', 'en']);
    expect(Object.keys(result.alternates?.languages ?? {}).sort()).toEqual(['en', 'fr', 'x-default']);
    expect(result.alternates?.languages?.['x-default']).toBe(publicUrl('/catalogue/nice', 'fr'));
    expect(result.robots).toBeUndefined();
  });

  it('sert la variante non publiée sans l’indexer ni l’annoncer', () => {
    const result = cityMetadata({ name: 'Nice', slug: 'nice', tourCount: 2 }, 'nl', ['fr', 'en']);
    expect(result.alternates?.canonical).toBe(publicUrl('/catalogue/nice', 'nl'));
    expect(result.alternates?.languages).toBeUndefined();
    expect(result.robots).toEqual({ index: false, follow: true });
  });
});
