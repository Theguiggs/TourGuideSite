/**
 * Lots SEO-4 et SEO-5 — ce que la fiche visite donne aux moteurs :
 *
 * - un maillage vers la ville et les visites voisines, dans la langue de la page ;
 * - un fil d'Ariane structuré identique, mot pour mot, au fil visible ;
 * - un prix structuré qui suit le prix visible, offre de lancement comprise ;
 * - aucun lien interne qui ramène une page ES/DE/IT/NL vers le français.
 */

import { render, screen, cleanup, within } from '@testing-library/react';
import { LocalizedTourDetailPage } from '@/app/catalogue/[city]/[tourSlug]/page';
import { getTourBySlug, getCityBySlug, getAllTours } from '@/lib/api/tours-server';
import { getGuideSlugByGuideId } from '@/lib/api/guides-public-server';
import { SITE_LOCALES, type InterfaceLocale } from '@/lib/i18n/locales';
import { publicPath, publicUrl } from '@/lib/seo/urls';
import { launchFreeAccess } from '@/lib/launch-free-access';
import type { Tour, TourDetail } from '@/types/tour';

jest.mock('@/lib/api/tours-server', () => ({
  getTourBySlug: jest.fn(),
  getCityBySlug: jest.fn(),
  getAllTours: jest.fn(async () => []),
}));
jest.mock('@/lib/api/guides-public-server', () => ({ getGuideSlugByGuideId: jest.fn(async () => null) }));
jest.mock('@/lib/launch-free-access', () => ({ launchFreeAccess: jest.fn(() => ({ active: false })) }));
jest.mock('@/components/TrackPageView', () => ({ __esModule: true, default: () => null }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('@/components/SmartAppLink', () => ({ __esModule: true, default: ({ children }: any) => <span>{children}</span> }));
jest.mock('@/components/checkout/tour-purchase-card', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/checkout/forfait-purchase-card', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/checkout/launch-offer-card', () => ({ LaunchOfferCard: () => null }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('@/components/studio/s3-image', () => ({ S3Image: ({ alt }: any) => <div>{alt}</div> }));
jest.mock('@/app/catalogue/[city]/[tourSlug]/itinerary-list', () => ({ __esModule: true, default: () => null }));

const mockGetTour = getTourBySlug as jest.MockedFunction<typeof getTourBySlug>;
const mockGetCity = getCityBySlug as jest.MockedFunction<typeof getCityBySlug>;
const mockGetCityTours = getAllTours as jest.MockedFunction<typeof getAllTours>;
const mockGuideSlug = getGuideSlugByGuideId as jest.MockedFunction<typeof getGuideSlugByGuideId>;
const mockLaunchOffer = launchFreeAccess as jest.MockedFunction<typeof launchFreeAccess>;

function makeTour(over: Partial<TourDetail> = {}): TourDetail {
  return {
    id: 't1', title: 'Vieux Nice', slug: 'vieux-nice', city: 'Nice', citySlug: 'nice',
    guideId: 'g1', guideName: 'Marie Dupont', description: 'Une visite.', shortDescription: 'Une visite.',
    duration: 45, distance: 2, poiCount: 6, isFree: false, status: 'published',
    purchaseType: 'paid', priceCents: 499, availableLanguages: ['fr'],
    pois: [], reviews: [], averageRating: 0, reviewCount: 0, completionCount: 0,
    ...over,
  };
}

const sibling = (id: string, slug: string, title: string): Tour => ({
  id, title, slug, city: 'Nice', citySlug: 'nice', guideId: 'g1', guideName: 'Marie Dupont',
  description: 'd', shortDescription: 'd', duration: 30, distance: 1, poiCount: 4,
  isFree: true, status: 'published', availableLanguages: ['fr'],
});

async function renderDetail(locale: InterfaceLocale = 'fr', tour = makeTour()) {
  mockGetTour.mockResolvedValue(tour);
  mockGetCity.mockResolvedValue({ id: 'nice', name: 'Nice', slug: 'nice', description: '', tourCount: 3 });
  mockGetCityTours.mockResolvedValue([tour as unknown as Tour, sibling('t2', 'promenade', 'Promenade'), sibling('t3', 'port', 'Le port')]);
  return render(await LocalizedTourDetailPage({
    params: Promise.resolve({ city: tour.citySlug, tourSlug: tour.slug }),
    searchParams: Promise.resolve({}),
    locale,
  }));
}

const jsonLdOf = (container: HTMLElement, type: string) =>
  [...container.querySelectorAll('script[type="application/ld+json"]')]
    .map(node => JSON.parse(node.textContent ?? '{}'))
    .find(node => node['@type'] === type);

beforeEach(() => {
  jest.clearAllMocks();
  mockLaunchOffer.mockReturnValue({ active: false });
  mockGuideSlug.mockResolvedValue(null);
});
afterEach(cleanup);

describe('maillage interne de la fiche visite', () => {
  it.each(SITE_LOCALES)('propose les visites voisines sans quitter la langue en %s', async locale => {
    await renderDetail(locale);
    const section = screen.getByRole('region', { name: /Nice/ });
    const hrefs = within(section).getAllByRole('link').map(link => link.getAttribute('href'));
    expect(hrefs).toContain(publicPath('/catalogue/nice/promenade', locale));
    expect(hrefs).toContain(publicPath('/catalogue/nice/port', locale));
    // La fiche courante ne se propose pas elle-même.
    expect(hrefs).not.toContain(publicPath('/catalogue/nice/vieux-nice', locale));
    // Et la ville reste à un clic.
    expect(hrefs).toContain(publicPath('/catalogue/nice', locale));
  });

  it.each(SITE_LOCALES)('garde tous ses liens internes dans la langue de la page en %s', async locale => {
    mockGuideSlug.mockResolvedValue('marie-dupont');
    const { container } = await renderDetail(locale);
    const prefix = locale === 'fr' ? '' : `/${locale}`;
    const internes = [...container.querySelectorAll('a[href^="/"]')]
      .map(node => node.getAttribute('href') ?? '')
      .filter(href => /^\/(en|es|de|it|nl)?\/?(catalogue|guides)/.test(href));
    expect(internes.length).toBeGreaterThan(0);
    for (const href of internes) expect(href.startsWith(`${prefix}/`)).toBe(true);
    expect(internes).toContain(`${prefix}/guides/marie-dupont`);
  });
});

describe('fil d’Ariane structuré', () => {
  it.each(SITE_LOCALES)('reprend exactement le fil visible en %s', async locale => {
    const { container } = await renderDetail(locale);
    const crumbs = jsonLdOf(container, 'BreadcrumbList');
    const items = crumbs.itemListElement as Array<{ name: string; item?: string; position: number }>;
    // Le fil visible est la première navigation de la page, quelle que soit la
    // langue de son `aria-label`.
    const visible = container.querySelector('nav[aria-label]')!;
    expect(items.map(i => i.name)).toEqual(visible.textContent!.split('/').map(part => part.trim()));
    expect(items[0].item).toBe(publicUrl('/catalogue', locale));
    expect(items[1].item).toBe(publicUrl('/catalogue/nice', locale));
    expect(items[2].item).toBeUndefined();
    expect(items.map(i => i.position)).toEqual([1, 2, 3]);
  });
});

describe('prix structuré et prix visible', () => {
  it('annonce le prix catalogue hors offre de lancement', async () => {
    const { container } = await renderDetail('fr');
    expect(jsonLdOf(container, 'TouristTrip').offers).toMatchObject({ price: '4.99' });
  });

  it('annonce la gratuité pendant l’offre de lancement, comme le badge visible', async () => {
    mockLaunchOffer.mockReturnValue({ active: true, startAt: '2026-01-01T00:00:00.000Z', endAt: '2026-12-31T23:00:00.000Z' });
    const { container } = await renderDetail('fr');
    expect(jsonLdOf(container, 'TouristTrip').offers).toMatchObject({ price: '0.00', priceValidUntil: '2026-12-31' });
    expect(screen.getByText('OFFRE DE LANCEMENT')).toBeInTheDocument();
  });
});
