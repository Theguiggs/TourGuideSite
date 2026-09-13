/**
 * LW-2 — la cible du lien de fin d'aperçu.
 *
 * Le lecteur s'arrête sur « Débloquez la visite pour écouter la suite » et
 * renvoie vers `#acheter`. Ce lien ne vaut que si la page pose bien cette
 * ancre : les deux bouts vivent dans deux fichiers, et rien d'autre ne les
 * relie. Ici, on rend la page pour de vrai (les cartes d'achat mockées ne sont
 * que des repères) et on vérifie que la cible existe, qu'elle est focalisable,
 * et qu'elle contient bien le bloc d'achat.
 */

import { render } from '@testing-library/react';
import { LocalizedTourDetailPage } from '@/app/catalogue/[city]/[tourSlug]/page';
import { getTourBySlug, getCityBySlug } from '@/lib/api/tours-server';
import { PURCHASE_ANCHOR, PURCHASE_ANCHOR_ID } from '@/components/catalogue/scene-player/purchase-anchor';
import type { TourDetail } from '@/types/tour';

jest.mock('@/lib/api/tours-server', () => ({
  getTourBySlug: jest.fn(),
  getCityBySlug: jest.fn(),
  getToursByCity: jest.fn(async () => []),
}));

jest.mock('@/lib/api/guides-public-server', () => ({
  getGuideSlugByGuideId: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/components/TrackPageView', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/SmartAppLink', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/checkout/tour-purchase-card', () => ({
  __esModule: true,
  default: () => <div data-testid="tour-purchase-card" />,
}));

jest.mock('@/components/checkout/forfait-purchase-card', () => ({
  __esModule: true,
  default: () => <div data-testid="forfait-purchase-card" />,
}));

jest.mock('@/components/studio/s3-image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S3Image: ({ alt }: any) => <div>{alt}</div>,
}));

jest.mock('@/app/catalogue/[city]/[tourSlug]/itinerary-list', () => ({
  __esModule: true,
  default: () => null,
}));

const mockGetTour = getTourBySlug as jest.MockedFunction<typeof getTourBySlug>;
const mockGetCity = getCityBySlug as jest.MockedFunction<typeof getCityBySlug>;

function makeTour(over: Partial<TourDetail> = {}): TourDetail {
  return {
    id: 't1',
    title: 'Le Caprice de l’Impératrice',
    slug: 'caprice',
    city: 'Biarritz',
    citySlug: 'biarritz',
    guideId: 'g1',
    guideName: 'Marie',
    description: 'Une visite.',
    shortDescription: 'Une visite.',
    duration: 60,
    distance: 2,
    poiCount: 9,
    isFree: false,
    priceCents: 499,
    purchaseType: 'paid',
    status: 'published',
    availableLanguages: ['fr'],
    pois: [],
    reviews: [],
    averageRating: 0,
    reviewCount: 0,
    completionCount: 0,
    ...over,
  };
}

async function renderDetail(tour: TourDetail, locale: 'fr' | 'en' = 'fr') {
  mockGetTour.mockResolvedValue(tour);
  mockGetCity.mockResolvedValue(null);
  const ui = await LocalizedTourDetailPage({
    params: Promise.resolve({ city: tour.citySlug, tourSlug: tour.slug }),
    searchParams: Promise.resolve({}),
    locale,
  });
  return render(ui);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fiche Visite — ancre du bloc d’achat (LW-2)', () => {
  it('l’ancre existe, est focalisable, et porte la carte d’achat à l’unité', async () => {
    const { container } = await renderDetail(makeTour());

    const anchor = container.querySelector(`#${PURCHASE_ANCHOR_ID}`);
    expect(anchor).not.toBeNull();
    // Sans `tabIndex`, le saut d'ancre déplace la vue mais pas le focus.
    expect(anchor).toHaveAttribute('tabindex', '-1');
    expect(anchor?.querySelector('[data-testid="tour-purchase-card"]')).not.toBeNull();
    // Le lien du lecteur vise exactement cet identifiant.
    expect(PURCHASE_ANCHOR).toBe(`#${PURCHASE_ANCHOR_ID}`);
  });

  it('l’ancre porte aussi la carte de forfait', async () => {
    const { container } = await renderDetail(
      makeTour({ purchaseType: 'subscription_only', priceCents: undefined }),
    );

    const anchor = container.querySelector(`#${PURCHASE_ANCHOR_ID}`);
    expect(anchor?.querySelector('[data-testid="forfait-purchase-card"]')).not.toBeNull();
  });

  it('visite gratuite : l’ancre reste posée — un lien de fin ne doit jamais tomber dans le vide', async () => {
    const { container } = await renderDetail(
      makeTour({ isFree: true, purchaseType: 'free', priceCents: undefined }),
    );

    expect(container.querySelector(`#${PURCHASE_ANCHOR_ID}`)).not.toBeNull();
  });

  it('route anglaise : même ancre', async () => {
    const { container } = await renderDetail(makeTour(), 'en');

    expect(container.querySelector(`#${PURCHASE_ANCHOR_ID}`)).not.toBeNull();
  });
});
