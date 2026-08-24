/**
 * La possession reconnaît DEUX canaux — l'achat à l'unité et le droit permanent.
 *
 * Le forfait annuel n'écrit aucune ligne `TourPurchase` : une possession qui ne
 * lisait que cette table laissait un porteur de forfait strictement égal à un
 * anonyme. Ce fichier fige *quel* droit ouvre l'affichage, ce qu'aucun test
 * n'assertait.
 */

import { render, screen, act, waitFor } from '@testing-library/react';
import {
  useOwnsTour,
  useHasActiveEntitlement,
  __resetOwnedTourIdsCache,
} from '../use-owned-tour-ids';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';

let authState: { isAuthenticated: boolean; user: { id: string } | null } = {
  isAuthenticated: true,
  user: { id: 'user-1' },
};

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => authState,
}));

const mockListOwnedTourIds = jest.fn();
jest.mock('@/lib/api/tour-purchase', () => ({
  listOwnedTourIds: () => mockListOwnedTourIds(),
}));

const mockHasActiveForfait = jest.fn();
jest.mock('@/lib/api/forfait-purchase', () => ({
  hasActiveForfait: () => mockHasActiveForfait(),
}));

function OwnsProbe({ tourId = 'tour-1' }: { tourId?: string }) {
  const owns = useOwnsTour(tourId);
  return <span data-testid="owns">{owns ? 'oui' : 'non'}</span>;
}

function EntitlementProbe() {
  const entitled = useHasActiveEntitlement();
  return <span data-testid="entitled">{entitled ? 'oui' : 'non'}</span>;
}

async function expectOwns(value: 'oui' | 'non') {
  await waitFor(() => expect(screen.getByTestId('owns')).toHaveTextContent(value));
}

describe('possession du visiteur', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetOwnedTourIdsCache();
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockListOwnedTourIds.mockResolvedValue(new Set<string>());
    mockHasActiveForfait.mockResolvedValue(false);
  });

  it('reconnaît un droit permanent actif, sans aucun achat à l’unité', async () => {
    mockHasActiveForfait.mockResolvedValue(true);

    render(<OwnsProbe />);

    await expectOwns('oui');
    // Le canal qui ouvre est bien le droit permanent : la table des achats à
    // l'unité, elle, n'a rien rendu.
    await expect(mockListOwnedTourIds.mock.results[0]?.value).resolves.toEqual(new Set());
  });

  it('reconnaît toujours l’achat à l’unité', async () => {
    mockListOwnedTourIds.mockResolvedValue(new Set(['tour-1']));

    render(<OwnsProbe />);

    await expectOwns('oui');
  });

  it('ne possède rien sans droit ni achat', async () => {
    render(<OwnsProbe />);

    await expectOwns('non');
    // Laisse toutes les promesses se résoudre avant de conclure.
    await act(async () => {});
    expect(screen.getByTestId('owns')).toHaveTextContent('non');
  });

  it('ne lit rien du tout pour un visiteur anonyme', async () => {
    authState = { isAuthenticated: false, user: null };

    render(<OwnsProbe />);

    await expectOwns('non');
    await act(async () => {});
    expect(mockHasActiveForfait).not.toHaveBeenCalled();
    expect(mockListOwnedTourIds).not.toHaveBeenCalled();
  });

  it('un achat qui vient d’aboutir rouvre la possession sans rechargement', async () => {
    render(<EntitlementProbe />);
    await waitFor(() => expect(screen.getByTestId('entitled')).toHaveTextContent('non'));

    mockHasActiveForfait.mockResolvedValue(true);
    await act(async () => {
      window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT));
    });

    await waitFor(() => expect(screen.getByTestId('entitled')).toHaveTextContent('oui'));
  });

  it('ne laisse pas fuir le droit d’un compte vers le suivant', async () => {
    mockHasActiveForfait.mockResolvedValue(true);
    const view = render(<EntitlementProbe />);
    await waitFor(() => expect(screen.getByTestId('entitled')).toHaveTextContent('oui'));

    mockHasActiveForfait.mockResolvedValue(false);
    authState = { isAuthenticated: true, user: { id: 'user-2' } };
    view.rerender(<EntitlementProbe />);

    await waitFor(() => expect(screen.getByTestId('entitled')).toHaveTextContent('non'));
  });
});
