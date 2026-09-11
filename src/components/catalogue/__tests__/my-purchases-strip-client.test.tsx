/**
 * Lot 3.4 — la bande « Mes achats » réservait zéro place puis surgissait
 * au-dessus de la grille des villes, qui sautait.
 */
const mockAuth = { isAuthenticated: true, isLoading: false, user: { id: 'u1' } };
jest.mock('@/lib/auth/auth-context', () => ({ useAuth: () => mockAuth }));

let resolvePurchases: (v: { purchases: unknown[] }) => void = () => {};
jest.mock('@/lib/api/purchases-client', () => ({
  getMyPurchasesClient: () =>
    new Promise((r) => {
      resolvePurchases = r;
    }),
}));
jest.mock('@/components/studio/s3-image', () => ({ S3Image: () => null }));

import { render, screen, act } from '@testing-library/react';
import { MyPurchasesStripClient } from '../my-purchases-strip-client';

describe('MyPurchasesStripClient', () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;
  });

  it('réserve la place pendant la lecture, puis montre la bande', async () => {
    render(<MyPurchasesStripClient />);
    expect(screen.getByTestId('my-purchases-strip-skeleton')).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      resolvePurchases({
        purchases: [
          { tour: { id: 't1', title: 'Promenade', citySlug: 'nice', slug: 'promenade', imageUrl: null } },
        ],
      });
    });

    expect(screen.queryByTestId('my-purchases-strip-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('purchase-strip-t1')).toBeInTheDocument();
  });

  it('ne rend rien du tout pour un visiteur anonyme, ni squelette ni bande', () => {
    mockAuth.isAuthenticated = false;
    const { container } = render(<MyPurchasesStripClient />);
    expect(container).toBeEmptyDOMElement();
  });

  it('disparaît sans achat', async () => {
    render(<MyPurchasesStripClient />);
    await act(async () => {
      resolvePurchases({ purchases: [] });
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
