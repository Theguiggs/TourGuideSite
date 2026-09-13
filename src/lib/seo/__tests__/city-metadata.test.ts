import { cityMetadata } from '../city-metadata';
import { SITE_LOCALES, LOCALE_FORMATS } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';

it.each(SITE_LOCALES)('identifies the actual city and sets localized social metadata in %s', locale => {
  const result = cityMetadata({ name: 'Nice', slug: 'nice', tourCount: 7 }, locale);
  expect(result.title).toContain('Nice');
  expect(result.description).toContain('Nice');
  expect(result.description).toContain('7');
  expect(result.alternates?.canonical).toBe(localizePublicPath('/catalogue/nice', locale));
  expect(Object.keys(result.alternates?.languages ?? {})).toHaveLength(6);
  expect(result.openGraph).toMatchObject({ title: result.title, description: result.description, locale: LOCALE_FORMATS[locale].replace('-', '_'),
    images: [{ url: locale === 'fr' ? '/opengraph-image' : `/${locale}/opengraph-image`, alt: result.title }] });
  expect(result.twitter).toMatchObject({ title: result.title, description: result.description });
});
