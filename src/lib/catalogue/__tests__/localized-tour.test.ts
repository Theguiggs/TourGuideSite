import type { Tour } from '@/types/tour';
import { localizeTour, METADATA_FALLBACK_COPY } from '../localized-tour';
import { SITE_LOCALES } from '@/lib/i18n/locales';

const original = {
  city: 'Nice', citySlug: 'nice', guideId: 'guide', guideName: 'Guide', duration: 20,
  distance: 1, poiCount: 2, isFree: false, status: 'published',
  id: 'tour', title: 'Une histoire', description: 'Le récit original', shortDescription: 'Le récit',
  sourceLanguage: 'fr', availableLanguages: ['fr', 'de'], priceCents: 499, purchaseType: 'paid',
  slug: 'une-histoire', translatedTitles: { de: 'Eine Geschichte', es: 'Una historia' },
  translatedDescriptions: { de: 'Die ursprüngliche Geschichte' },
} as Tour;

it('uses published metadata without altering source, routes, prices or audio inventory', () => {
  const result = localizeTour(original, 'de');
  expect(result).toMatchObject({ title: 'Eine Geschichte', description: 'Die ursprüngliche Geschichte', metadataFallback: false,
    sourceLanguage: 'fr', availableLanguages: ['fr', 'de'], slug: 'une-histoire', priceCents: 499 });
  expect(original.title).toBe('Une histoire');
});

it('signals partial translation and never invents missing content or Spanish audio', () => {
  expect(localizeTour(original, 'es')).toMatchObject({ title: 'Una historia', description: original.description, metadataFallback: true, availableLanguages: ['fr', 'de'] });
});

it.each(SITE_LOCALES)('has an explicit fallback message for %s', locale => {
  expect(METADATA_FALLBACK_COPY[locale].length).toBeGreaterThan(20);
  if (locale !== 'fr' && locale !== 'de') expect(localizeTour(original, locale).metadataFallback).toBe(true);
});

it('keeps the original language text without a false fallback warning', () => {
  expect(localizeTour(original, 'fr')).toMatchObject({ title: original.title, metadataFallback: false });
});
