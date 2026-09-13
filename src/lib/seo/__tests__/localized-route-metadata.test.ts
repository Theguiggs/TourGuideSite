jest.mock('@/components/home/visitor-home', () => ({ VisitorHome: () => null }));
jest.mock('@/components/auth/visitor-auth', () => ({ VisitorAuth: () => null }));
jest.mock('@/components/catalogue/mes-visites-content', () => ({ MesVisitesContent: () => null }));
jest.mock('@/app/catalogue/page', () => ({ LocalizedCataloguePage: () => null }));
jest.mock('@/app/catalogue/[city]/page', () => ({
  LocalizedCityPage: () => null,
  // La route localisée doit produire les VRAIES métadonnées ville : seule la
  // lecture AppSync est remplacée.
  cityPageMetadata: async (citySlug: string, locale: 'es' | 'de' | 'it' | 'nl') =>
    jest.requireActual('@/lib/seo/city-metadata').cityMetadata({ name: 'Nice', slug: citySlug, tourCount: 3 }, locale),
}));
jest.mock('@/app/catalogue/[city]/[tourSlug]/page', () => ({ LocalizedTourDetailPage: () => null, tourPageMetadata: async () => ({}) }));
jest.mock('@/app/guides/[guideSlug]/page', () => ({ LocalizedGuidePage: () => null, guideMetadata: () => ({}) }));
jest.mock('@/components/legal/localized-legal-pages', () => ({}));
jest.mock('@/app/aide/localized-help', () => ({}));
jest.mock('@/components/home/creator-home', () => ({}));
jest.mock('@/lib/api/tours-server', () => ({ getCityBySlug: async () => ({ name: 'Nice', slug: 'nice', tourCount: 3 }), getTourBySlug: async () => null }));

import { generateMetadata } from '@/app/[locale]/[[...segments]]/page';
import { publicUrl } from '@/lib/seo/urls';

it.each(['es', 'de', 'it', 'nl'] as const)('keeps private routes out of indexes and resolves real city metadata in %s', async locale => {
  for (const route of ['sign-in', 'sign-up', 'reset-password', 'my-purchases']) {
    const result = await generateMetadata({ params: Promise.resolve({ locale, segments: [route] }), searchParams: Promise.resolve({}) });
    expect(result.robots).toEqual({ index: false, follow: false });
  }
  const city = await generateMetadata({ params: Promise.resolve({ locale, segments: ['catalogue', 'nice'] }), searchParams: Promise.resolve({}) });
  expect(city.title).toContain('Nice');
  expect(city.openGraph).toMatchObject({ title: city.title });
  expect(city.robots).toBeUndefined();

  // Le catalogue a désormais ses propres métadonnées dans les six langues.
  const catalogue = await generateMetadata({ params: Promise.resolve({ locale, segments: ['catalogue'] }), searchParams: Promise.resolve({}) });
  expect(catalogue.alternates?.canonical).toBe(publicUrl('/catalogue', locale));
  expect(catalogue.alternates?.languages?.['x-default']).toBe(publicUrl('/catalogue', 'fr'));
  expect(catalogue.openGraph).toMatchObject({ title: catalogue.title });
});
