/**
 * L'achat abouti doit émettre le signal que la fiche Visite écoute.
 *
 * Toute la promesse « payez, la visite s'ouvre derrière la carte » tient à cet
 * unique appel : sans lui, le serveur écrit bien le droit, mais rien à l'écran
 * ne bouge jusqu'à un rechargement manuel. Les épreuves de la fiche synthétisent
 * l'événement elles-mêmes — elles ne vérifient donc que la moitié réceptrice.
 */

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockStripeConfigured = jest.fn(() => true);
jest.mock('@/lib/stripe/client', () => ({
  isStripeConfigured: () => mockStripeConfigured(),
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
const mockHasActiveForfait = jest.fn();
jest.mock('@/lib/api/forfait-purchase', () => ({
  createForfaitPaymentIntent: () => mockCreateIntent(),
  confirmForfaitPurchase: (...a: unknown[]) => mockConfirmPurchase(...a),
  hasActiveForfait: () => mockHasActiveForfait(),
  FORFAIT_PRICE_CENTS: 1990,
}));

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, signIn: jest.fn() }),
}));

import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import ForfaitPurchaseCard from '../forfait-purchase-card';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';

describe('ForfaitPurchaseCard', () => {
  let changed: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasActiveForfait.mockResolvedValue(false);
    mockCreateIntent.mockResolvedValue({
      ok: true,
      value: { clientSecret: 'pi_42_secret_abc', amountCents: 1990 },
    });
    mockConfirmPayment.mockResolvedValue({ paymentIntent: { id: 'pi_42', status: 'succeeded' } });
    mockConfirmPurchase.mockResolvedValue({
      ok: true,
      value: { expiresAtMs: Date.now() + 365 * 86400000, alreadyActive: false },
    });
    changed = jest.fn();
    window.addEventListener(PURCHASES_CHANGED_EVENT, changed);
  });

  afterEach(() => {
    window.removeEventListener(PURCHASES_CHANGED_EVENT, changed);
  });

  it("annonce l'achat abouti, pour que la visite ouverte derrière se déverrouille", async () => {
    render(<ForfaitPurchaseCard />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Prendre le forfait/ }));
    });
    await waitFor(() => expect(screen.getByTestId('payment-element')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    });

    expect(mockConfirmPurchase).toHaveBeenCalledWith('pi_42');
    expect(changed).toHaveBeenCalled();
    expect(screen.getByTestId('forfait-active-badge')).toBeInTheDocument();
  });

  it("n'annonce rien quand le serveur refuse de confirmer", async () => {
    // Le paiement Stripe a beau être passé, tant que le serveur n'a pas écrit le
    // droit il n'y a rien à déverrouiller : prétendre le contraire afficherait
    // une visite ouverte que le serveur refuserait de servir.
    mockConfirmPurchase.mockResolvedValue({
      ok: false,
      error: { code: 2630, message: 'Authentication required' },
    });
    render(<ForfaitPurchaseCard />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Prendre le forfait/ }));
    });
    await waitFor(() => expect(screen.getByTestId('payment-element')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    });

    expect(changed).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Authentication required');
  });
});

describe('ForfaitPurchaseCard — retour de redirection Stripe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasActiveForfait.mockResolvedValue(false);
    mockCreateIntent.mockResolvedValue({ ok: true, value: { clientSecret: 'pi_42_secret_abc', amountCents: 1990 } });
    mockConfirmPayment.mockResolvedValue({ paymentIntent: { id: 'pi_42', status: 'succeeded' } });
    mockConfirmPurchase.mockResolvedValue({ ok: true, value: { expiresAtMs: Date.now() + 1000, alreadyActive: false } });
  });

  afterEach(() => window.history.replaceState({}, '', '/'));

  it('donne à Stripe une URL de retour marquée « forfait »', async () => {
    window.history.replaceState({}, '', '/catalogue/nice/promenade');
    render(<ForfaitPurchaseCard />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Prendre le forfait/ }));
    });
    await waitFor(() => expect(screen.getByTestId('payment-element')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Payer' }));
    });
    const call = mockConfirmPayment.mock.calls[0][0] as { confirmParams?: { return_url?: string } };
    expect(new URL(call.confirmParams!.return_url!).searchParams.get('murmure_pay')).toBe('forfait');
  });

  it('au retour d’une redirection réussie, confirme et affiche le forfait actif', async () => {
    window.history.replaceState(
      {},
      '',
      '/catalogue/nice/promenade?murmure_pay=forfait&payment_intent=pi_77&redirect_status=succeeded',
    );
    await act(async () => {
      render(<ForfaitPurchaseCard />);
    });
    await waitFor(() => expect(screen.getByTestId('forfait-active-badge')).toBeInTheDocument());
    expect(mockConfirmPurchase).toHaveBeenCalledWith('pi_77');
    expect(window.location.search).toBe('');
  });

  it("sans clé Stripe au build, dit que le forfait s'achète dans l'app", () => {
    mockStripeConfigured.mockReturnValue(false);
    render(<ForfaitPurchaseCard />);
    expect(screen.getByTestId('forfait-purchase-in-app')).toBeInTheDocument();
    mockStripeConfigured.mockReturnValue(true);
  });
});
