/**
 * mon-1.3b recovery: replay a pending confirmTourPurchase on load so a payment
 * taken just before a tab death still grants the tour.
 */

import { render, waitFor } from '@testing-library/react';
import { PendingTourConfirmRecovery } from '@/components/checkout/pending-tour-confirm-recovery';
import { confirmTourPurchase } from '@/lib/api/tour-purchase';
import {
  addPendingTourConfirm,
  listPendingTourConfirms,
} from '@/lib/checkout/pending-tour-confirm';

let mockAuthed = true;
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: mockAuthed }),
}));
jest.mock('@/lib/api/tour-purchase', () => ({
  confirmTourPurchase: jest.fn(),
}));

const mockConfirm = confirmTourPurchase as jest.MockedFunction<typeof confirmTourPurchase>;

beforeEach(() => {
  localStorage.clear();
  mockAuthed = true;
  mockConfirm.mockReset();
});

describe('pending-tour-confirm storage', () => {
  it('adds, lists and dedupes by paymentIntentId', () => {
    addPendingTourConfirm('pi_1', 'grasse');
    addPendingTourConfirm('pi_1', 'grasse'); // dedupe
    addPendingTourConfirm('pi_2', 'nice');
    expect(listPendingTourConfirms().map((p) => p.paymentIntentId).sort()).toEqual(['pi_1', 'pi_2']);
  });
});

describe('<PendingTourConfirmRecovery>', () => {
  it('replays a pending confirm, clears it and signals a purchase change on success', async () => {
    addPendingTourConfirm('pi_ok', 'grasse');
    mockConfirm.mockResolvedValue({ ok: true, value: { tourId: 'grasse', alreadyOwned: false } });
    const onChanged = jest.fn();
    window.addEventListener('murmure:purchases-changed', onChanged);

    render(<PendingTourConfirmRecovery />);

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith('pi_ok'));
    await waitFor(() => expect(listPendingTourConfirms()).toHaveLength(0));
    expect(onChanged).toHaveBeenCalled();
    window.removeEventListener('murmure:purchases-changed', onChanged);
  });

  it('keeps the pending record on a transient (network) error for a later retry', async () => {
    addPendingTourConfirm('pi_net', 'grasse');
    mockConfirm.mockResolvedValue({ ok: false, error: { code: 2624, message: 'network' } });

    render(<PendingTourConfirmRecovery />);

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith('pi_net'));
    expect(listPendingTourConfirms()).toHaveLength(1); // not dropped
  });

  it('does nothing for a guest (no auth)', async () => {
    mockAuthed = false;
    addPendingTourConfirm('pi_guest', 'grasse');

    render(<PendingTourConfirmRecovery />);

    await new Promise((r) => setTimeout(r, 0));
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(listPendingTourConfirms()).toHaveLength(1);
  });
});
