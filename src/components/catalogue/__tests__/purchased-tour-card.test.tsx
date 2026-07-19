/**
 * "Mes achats" presentational pieces: PurchasedTourCard (date + amount + link)
 * and MyPurchasesStrip (hidden when empty, links to /mes-visites).
 */

import { render, screen } from '@testing-library/react';
import { PurchasedTourCard } from '@/components/catalogue/purchased-tour-card';
import { MyPurchasesStrip } from '@/components/catalogue/my-purchases-strip';
import { __resetOwnedTourIdsCache } from '@/hooks/use-owned-tour-ids';
import type { PurchasedTour } from '@/types/purchase';
import type { Tour } from '@/types/tour';

// Badge dependencies — guest by default so the card shows the price badge, not "Acheté".
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));
jest.mock('@/lib/api/tour-purchase', () => ({
  listOwnedTourIds: jest.fn().mockResolvedValue(new Set()),
}));
jest.mock('@/components/studio/s3-image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S3Image: ({ alt }: any) => <div data-testid="s3-image">{alt}</div>,
}));

function tour(over: Partial<Tour> & Pick<Tour, 'id'>): Tour {
  return {
    title: 'Grasse — Les Routes du Parfum', slug: 'les-routes-du-parfum',
    city: 'Grasse', citySlug: 'grasse', guideId: 'g', guideName: 'G',
    description: '', shortDescription: '', duration: 51, distance: 2.2, poiCount: 7,
    isFree: false, status: 'published', ...over,
  };
}

function purchase(over?: Partial<PurchasedTour>): PurchasedTour {
  return {
    tour: tour({ id: 't1', priceCents: 899 }),
    purchasedAt: '2026-05-12T10:00:00.000Z',
    amountCents: 899,
    ...over,
  };
}

beforeEach(() => __resetOwnedTourIdsCache());

describe('<PurchasedTourCard>', () => {
  it('shows the purchase date and amount paid, linking to the tour', () => {
    render(<PurchasedTourCard purchase={purchase()} />);
    const card = screen.getByTestId('purchase-card-t1');
    expect(card).toHaveAttribute('href', '/catalogue/grasse/les-routes-du-parfum');
    expect(card).toHaveTextContent('Acheté le 12/05/2026');
    expect(card).toHaveTextContent('8,99 €');
  });

  it('does not link an owned-but-unpublished tour (catalogue page would 404)', () => {
    render(
      <PurchasedTourCard
        purchase={purchase({ tour: tour({ id: 't1', priceCents: 899, status: 'archived' }) })}
      />,
    );
    const card = screen.getByTestId('purchase-card-t1');
    expect(card).not.toHaveAttribute('href');
    expect(card).toHaveTextContent('Indisponible au catalogue');
  });

  it('localises the English card and catalogue link', () => {
    render(<PurchasedTourCard purchase={purchase()} locale="en" />);
    const card = screen.getByTestId('purchase-card-t1');
    expect(card).toHaveAttribute('href', '/en/catalogue/grasse/les-routes-du-parfum');
    expect(card).toHaveTextContent('Purchased on 12/05/2026');
    expect(card).toHaveTextContent('€8.99');
  });

  it('omits the meta line when no date/amount is available', () => {
    render(
      <PurchasedTourCard
        purchase={purchase({ purchasedAt: '', amountCents: undefined })}
      />,
    );
    expect(screen.getByTestId('purchase-card-t1')).not.toHaveTextContent('Acheté le');
  });
});

describe('<MyPurchasesStrip>', () => {
  it('renders nothing when there are no purchases', () => {
    const { container } = render(<MyPurchasesStrip purchases={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a count, a "Voir tout" link and one thumbnail per purchase', () => {
    render(
      <MyPurchasesStrip
        purchases={[
          purchase({ tour: tour({ id: 'a' }) }),
          purchase({ tour: tour({ id: 'b' }) }),
        ]}
      />,
    );
    expect(screen.getByText('Mes achats (2)')).toBeInTheDocument();
    expect(screen.getByText('Voir tout →')).toHaveAttribute('href', '/mes-visites');
    expect(screen.getByTestId('purchase-strip-a')).toBeInTheDocument();
    expect(screen.getByTestId('purchase-strip-b')).toBeInTheDocument();
  });
});
