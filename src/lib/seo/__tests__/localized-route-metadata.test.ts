jest.mock('@/components/home/visitor-home', () => ({ VisitorHome: () => null }));
jest.mock('@/components/auth/visitor-auth', () => ({ VisitorAuth: () => null }));
jest.mock('@/components/catalogue/mes-visites-content', () => ({ MesVisitesContent: () => null }));
jest.mock('@/app/catalogue/page', () => ({ LocalizedCataloguePage: () => null }));
jest.mock('@/app/catalogue/[city]/page', () => ({ LocalizedCityPage: () => null }));
jest.mock('@/app/catalogue/[city]/[tourSlug]/page', () => ({ LocalizedTourDetailPage: () => null }));
jest.mock('@/app/guides/[guideSlug]/page', () => ({ LocalizedGuidePage: () => null, guideMetadata: () => ({}) }));
jest.mock('@/components/legal/localized-legal-pages', () => ({}));
jest.mock('@/app/aide/localized-help', () => ({}));
jest.mock('@/components/home/creator-home', () => ({}));
jest.mock('@/lib/api/tours-server', () => ({ getCityBySlug: async () => ({ name: 'Nice', slug: 'nice', tourCount: 3 }), getTourBySlug: async () => null }));

import { generateMetadata } from '@/app/[locale]/[[...segments]]/page';

it.each(['es', 'de', 'it', 'nl'])('keeps private routes out of indexes and resolves real city metadata in %s', async locale => {
  for (const route of ['sign-in', 'sign-up', 'reset-password', 'my-purchases']) {
    const result = await generateMetadata({ params: Promise.resolve({ locale, segments: [route] }), searchParams: Promise.resolve({}) });
    expect(result.robots).toEqual({ index: false, follow: false });
  }
  const city = await generateMetadata({ params: Promise.resolve({ locale, segments: ['catalogue', 'nice'] }), searchParams: Promise.resolve({}) });
  expect(city.title).toContain('Nice');
  expect(city.openGraph).toMatchObject({ title: city.title });
  expect(city.robots).toBeUndefined();
});
