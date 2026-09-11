/**
 * Filets de l'achat de visite (revue web 2026-09-11, critique n°1) :
 * sans webhook Stripe côté visite, un onglet qui meurt entre le débit et
 * `confirmTourPurchase` laissait un acheteur payé sans visite. Le rattrapage
 * existait mais n'était jamais alimenté ; et sans `return_url`, tout moyen de
 * paiement à redirection était refusé par Stripe.
 */

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockIsConfigured = jest.fn(() => true);
jest.mock('@/lib/stripe/client', () => ({
  isStripeConfigured: () => mockIsConfigured(),
  getStripePromise: () => Promise.resolve({}),
}));

const mockConfirmPayment = jest.fn();
jest.mock('@stripe/react-stripe-js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Elements: ({ children }: any) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element" />,
  useStripe: () => ({ confirmPayment: (...a: unknown[]) => mockConfirmPayment(...a) }),
  useElements: () => ({}),
}));

const mockCreateIntent = jest.fn();
const mockConfirmPurchase = jest.fn();
const mockOwnsTour = jest.fn();
jest.mock('@/lib/api/tour-purchase', () => ({
  createTourPaymentIntent: (...a: unknown[]) => mockCreateIntent(...a),
  confirmTourPurchase: (...a: unknown[]) => mockConfirmPurchase(...a),
  ownsTour: () => mockOwnsTour(),
}));

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, signIn: jest.fn() }),
}));

import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import TourPurchaseCard from '../tour-purchase-card';
import { listPendingTourConfirms } from '@/lib/checkout/pending-tour-confirm';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';

const props = { tourId: 'tour-1', title: 'Promenade', priceCents: 499 };

async function openPaymentForm() {
  render(<TourPurchaseCard {...props} />);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Acheter/ }));
  });
  await waitFor(() => expect(screen.getByTestId('payment-element')).toBeInTheDocument());
}

describe('TourPurchaseCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', '/catalogue/nice/promenade');
    mockIsConfigured.mockReturnValue(true);
    mockOwnsTour.mockResolvedValue(false);
    mockCreateIntent.mockResolvedValue({ ok: true, value: { clientSecret: 'pi_42_secret_abc' } });
    mockConfirmPayment.mockResolvedValue({ paymentIntent: { id: 'pi_42', status: 'succeeded' } });
    mockConfirmPurchase.mockResolvedValue({ ok: true, value: { tourId: 'tour-1' } });
  });

  it("inscrit l'intent au rattrapage dès sa création, et l'en retire une fois la visite accordée", async () => {
    await openPaymentForm();
    expect(listPendingTourConfirms()).toEqual([
      expect.objectContaining({ paymentIntentId: 'pi_42', tourId: 'tour-1' }),
    ]);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    });

    expect(mockConfirmPurchase).toHaveBeenCalledWith('pi_42');
    expect(screen.getByTestId('tour-owned-badge')).toBeInTheDocument();
    expect(listPendingTourConfirms()).toEqual([]);
  });

  it("garde l'intent en attente quand le serveur n'a pas confirmé : le prochain chargement rejouera", async () => {
    mockConfirmPurchase.mockResolvedValue({ ok: false, error: { code: 2630, message: 'Réseau' } });
    await openPaymentForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    });
    expect(listPendingTourConfirms()).toHaveLength(1);
    expect(screen.queryByTestId('tour-owned-badge')).not.toBeInTheDocument();
  });

  it('donne à Stripe une URL de retour marquée « visite », exigée par les moyens à redirection', async () => {
    await openPaymentForm();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    });
    const call = mockConfirmPayment.mock.calls[0][0] as { confirmParams?: { return_url?: string } };
    const url = new URL(call.confirmParams!.return_url!);
    expect(url.pathname).toBe('/catalogue/nice/promenade');
    expect(url.searchParams.get('murmure_pay')).toBe('tour');
  });

  it('au retour d’une redirection réussie, confirme côté serveur et accorde la visite', async () => {
    window.history.replaceState(
      {},
      '',
      '/catalogue/nice/promenade?murmure_pay=tour&payment_intent=pi_77&payment_intent_client_secret=s&redirect_status=succeeded',
    );
    const changed = jest.fn();
    window.addEventListener(PURCHASES_CHANGED_EVENT, changed);

    await act(async () => {
      render(<TourPurchaseCard {...props} />);
    });

    await waitFor(() => expect(screen.getByTestId('tour-owned-badge')).toBeInTheDocument());
    expect(mockConfirmPurchase).toHaveBeenCalledWith('pi_77');
    expect(mockCreateIntent).not.toHaveBeenCalled();
    expect(changed).toHaveBeenCalled();
    // L'URL est nettoyée : un rechargement ne rejoue pas la confirmation.
    expect(window.location.search).toBe('');
    window.removeEventListener(PURCHASES_CHANGED_EVENT, changed);
  });

  it('ignore le retour destiné à la carte forfait', async () => {
    window.history.replaceState(
      {},
      '',
      '/catalogue/nice/promenade?murmure_pay=forfait&payment_intent=pi_77&redirect_status=succeeded',
    );
    await act(async () => {
      render(<TourPurchaseCard {...props} />);
    });
    expect(mockConfirmPurchase).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Acheter/ })).toBeInTheDocument();
  });

  it('au retour d’une redirection refusée, le dit au visiteur sans rien accorder', async () => {
    window.history.replaceState(
      {},
      '',
      '/catalogue/nice/promenade?murmure_pay=tour&payment_intent=pi_77&redirect_status=failed',
    );
    await act(async () => {
      render(<TourPurchaseCard {...props} />);
    });
    expect(mockConfirmPurchase).not.toHaveBeenCalled();
    expect(screen.getByText('Paiement refusé.')).toBeInTheDocument();
    expect(listPendingTourConfirms()).toEqual([]);
  });

  it("sans clé Stripe au build, dit que la visite s'achète dans l'app plutôt que de disparaître", () => {
    mockIsConfigured.mockReturnValue(false);
    render(<TourPurchaseCard {...props} />);
    expect(screen.getByTestId('tour-purchase-in-app')).toHaveTextContent("s'achète dans l'application");
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it("n'expose jamais le nom de la variable d'environnement au visiteur", () => {
    const source = String(TourPurchaseCard);
    expect(source).not.toContain('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  });
});
