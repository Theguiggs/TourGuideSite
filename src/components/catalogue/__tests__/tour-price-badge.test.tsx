/**
 * Shared catalogue badge (Acheté > Gratuit > Prix) + one-request ownership fetch.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { TourPriceBadge } from '@/components/catalogue/tour-price-badge';
import { listOwnedTourIds } from '@/lib/api/tour-purchase';
import { __resetOwnedTourIdsCache } from '@/hooks/use-owned-tour-ids';
import type { Tour } from '@/types/tour';

let mockAuthed = false;
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: mockAuthed, user: mockAuthed ? { id: 'u1' } : null }),
}));

jest.mock('@/lib/api/tour-purchase', () => ({
  listOwnedTourIds: jest.fn(),
}));

const mockListOwned = listOwnedTourIds as jest.MockedFunction<typeof listOwnedTourIds>;

function tour(over: Partial<Tour> & Pick<Tour, 'id'>): Tour {
  return {
    title: 't', slug: 's', city: 'C', citySlug: 'c', guideId: 'g', guideName: 'G',
    description: '', shortDescription: '', duration: 30, distance: 1, poiCount: 3,
    isFree: false, status: 'published', ...over,
  };
}

beforeEach(() => {
  mockAuthed = false;
  mockListOwned.mockReset();
  mockListOwned.mockResolvedValue(new Set());
  __resetOwnedTourIdsCache();
});

describe('<TourPriceBadge>', () => {
  it('renders GRATUIT for a free tour (purchaseType free)', () => {
    render(<TourPriceBadge tour={tour({ id: 'a', purchaseType: 'free' })} />);
    expect(screen.getByTestId('badge-free-a')).toHaveTextContent('GRATUIT');
  });

  it('renders GRATUIT when purchaseType is absent (beta back-compat, mirrors the app)', () => {
    // Server mappers hard-code isFree:false — the badge must NOT trust it.
    render(<TourPriceBadge tour={tour({ id: 'legacy', isFree: false })} />);
    expect(screen.getByTestId('badge-free-legacy')).toHaveTextContent('GRATUIT');
  });

  it('renders the formatted price for a paid tour', () => {
    render(<TourPriceBadge tour={tour({ id: 'b', purchaseType: 'paid', priceCents: 1250 })} />);
    expect(screen.getByTestId('badge-price-b')).toHaveTextContent('12,50 €');
  });

  it('renders nothing for a paid tour without a price', () => {
    const { container } = render(
      <TourPriceBadge tour={tour({ id: 'c', purchaseType: 'paid' })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows Acheté once ownership resolves for an authenticated owner', async () => {
    mockAuthed = true;
    mockListOwned.mockResolvedValue(new Set(['d']));
    render(<TourPriceBadge tour={tour({ id: 'd', purchaseType: 'paid', priceCents: 499 })} />);
    await waitFor(() => expect(screen.getByTestId('badge-owned-d')).toBeInTheDocument());
    expect(screen.queryByTestId('badge-price-d')).toBeNull();
  });

  it('fetches ownership ONCE for many badges on the same page', async () => {
    mockAuthed = true;
    mockListOwned.mockResolvedValue(new Set(['x2']));
    render(
      <>
        <TourPriceBadge tour={tour({ id: 'x1', purchaseType: 'paid', priceCents: 499 })} />
        <TourPriceBadge tour={tour({ id: 'x2', purchaseType: 'paid', priceCents: 499 })} />
        <TourPriceBadge tour={tour({ id: 'x3', purchaseType: 'paid', priceCents: 499 })} />
      </>,
    );
    await waitFor(() => expect(screen.getByTestId('badge-owned-x2')).toBeInTheDocument());
    expect(mockListOwned).toHaveBeenCalledTimes(1);
  });
});
