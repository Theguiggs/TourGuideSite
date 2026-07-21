/**
 * Badge "Gratuit / Acheté / Prix" on the per-city tour list (/catalogue/[city]).
 *
 * - Gratuit + Prix come straight from the SSR Tour data (isFree / priceCents).
 * - Acheté is per-user, resolved client-side after hydration via listOwnedTourIds().
 */

import { render, screen, waitFor } from '@testing-library/react';
import { TourListWithFilter } from '@/app/catalogue/[city]/tour-list-filter';
import { listOwnedTourIds } from '@/lib/api/tour-purchase';
import { __resetOwnedTourIdsCache } from '@/hooks/use-owned-tour-ids';
import type { Tour } from '@/types/tour';

// Controllable auth state across tests.
let mockAuthed = false;
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: mockAuthed, user: mockAuthed ? { id: 'u1' } : null }),
}));

jest.mock('@/lib/api/tour-purchase', () => ({
  listOwnedTourIds: jest.fn(),
}));

jest.mock('@/components/studio/s3-image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S3Image: ({ alt }: any) => <div data-testid="s3-image">{alt}</div>,
}));

const mockListOwned = listOwnedTourIds as jest.MockedFunction<typeof listOwnedTourIds>;

function makeTour(over: Partial<Tour> & Pick<Tour, 'id' | 'slug' | 'title'>): Tour {
  return {
    city: 'Grasse',
    citySlug: 'grasse',
    guideId: 'g1',
    guideName: 'Marie',
    description: '',
    shortDescription: '',
    duration: 45,
    distance: 2,
    poiCount: 6,
    isFree: false,
    status: 'published',
    ...over,
  };
}

const TOURS: Tour[] = [
  makeTour({ id: 'free-1', slug: 'gratuite', title: 'Visite gratuite', purchaseType: 'free' }),
  makeTour({ id: 'paid-1', slug: 'payante', title: 'Visite payante', purchaseType: 'paid', priceCents: 499 }),
  makeTour({ id: 'paid-2', slug: 'achetee', title: 'Visite achetee', purchaseType: 'paid', priceCents: 999 }),
];

beforeEach(() => {
  mockAuthed = false;
  mockListOwned.mockResolvedValue(new Set());
  __resetOwnedTourIdsCache();
});

describe('<TourListWithFilter> badges', () => {
  it('shows GRATUIT for free tours and the price for paid tours', async () => {
    render(<TourListWithFilter tours={TOURS} citySlug="grasse" />);

    expect(screen.getByTestId('badge-free-free-1')).toHaveTextContent('GRATUIT');
    expect(screen.getByTestId('badge-price-paid-1')).toHaveTextContent('4,99 €');
    expect(screen.getByTestId('badge-price-paid-2')).toHaveTextContent('9,99 €');
  });

  it('does not query ownership for guests', () => {
    render(<TourListWithFilter tours={TOURS} citySlug="grasse" />);
    expect(mockListOwned).not.toHaveBeenCalled();
    expect(screen.queryByTestId('badge-owned-paid-1')).toBeNull();
  });

  it('replaces the price badge with "Acheté" for owned tours after hydration', async () => {
    mockAuthed = true;
    mockListOwned.mockResolvedValue(new Set(['paid-2']));

    render(<TourListWithFilter tours={TOURS} citySlug="grasse" />);

    // Owned tour flips to the "Acheté" badge once the client check resolves.
    await waitFor(() => expect(screen.getByTestId('badge-owned-paid-2')).toBeInTheDocument());
    expect(screen.getByTestId('badge-owned-paid-2')).toHaveTextContent('Acheté');
    expect(screen.queryByTestId('badge-price-paid-2')).toBeNull();

    // Non-owned paid tour keeps its price badge; free tour stays GRATUIT.
    expect(screen.getByTestId('badge-price-paid-1')).toHaveTextContent('4,99 €');
    expect(screen.getByTestId('badge-free-free-1')).toBeInTheDocument();
    expect(mockListOwned).toHaveBeenCalledTimes(1);
  });
});
