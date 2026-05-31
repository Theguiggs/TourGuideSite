'use client';

/**
 * TourPurchaseCard — Story mon-1.3b. Web purchase of an individual tour.
 *
 * Flow (the client never self-grants — the server verifies the payment):
 *  1. If not signed in → inline email/password login (same Cognito pool as the app).
 *  2. createTourPaymentIntent(tourId) → clientSecret (authoritative price server-side).
 *  3. Stripe PaymentElement → confirmPayment(redirect:'if_required').
 *  4. confirmTourPurchase(paymentIntentId) → server creates the TourPurchase.
 *  5. Success → the tour is owned; the buyer opens it in the app (same account).
 *
 * Only rendered for tours with purchaseType === 'paid'. Requires
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 */

import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button, tg } from '@murmure/design-system/web';
import { getStripePromise, isStripeConfigured } from '@/lib/stripe/client';
import { useAuth } from '@/lib/auth/auth-context';
import { createTourPaymentIntent, confirmTourPurchase } from '@/lib/api/tour-purchase';

interface Props {
  tourId: string;
  title: string;
  priceCents?: number;
}

type Step = 'idle' | 'login' | 'pay' | 'done' | 'error';

function formatPrice(cents?: number): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents) || cents < 0) return '';
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

// --- Inner payment form (must live inside <Elements>) ---
function PaymentForm({
  paymentIntentId,
  onSuccess,
  onError,
}: {
  paymentIntentId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      setBusy(false);
      onError(error.message ?? 'Paiement refusé.');
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      const confirmed = await confirmTourPurchase(paymentIntentId);
      setBusy(false);
      if (confirmed.ok) onSuccess();
      else onError(confirmed.error.message);
      return;
    }
    setBusy(false);
    onError(`Paiement non finalisé (${paymentIntent?.status ?? 'inconnu'}).`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[4] }}>
      <PaymentElement />
      <Button variant="accent" size="lg" fullWidth onClick={pay} disabled={busy}>
        {busy ? 'Paiement…' : 'Payer'}
      </Button>
    </div>
  );
}

export default function TourPurchaseCard({ tourId, title, priceCents }: Props) {
  const { isAuthenticated, signIn } = useAuth();
  const [step, setStep] = useState<Step>('idle');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isStripeConfigured()) return null;

  // Step 2: fetch a PaymentIntent (server resolves the authoritative price).
  async function beginPayment() {
    setBusy(true);
    setError(null);
    const res = await createTourPaymentIntent(tourId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      setStep('error');
      return;
    }
    if (!res.value.clientSecret) {
      setError('Paiement indisponible pour cette visite.');
      setStep('error');
      return;
    }
    setClientSecret(res.value.clientSecret);
    // clientSecret is "pi_XXX_secret_YYY" → PaymentIntent id is the part before "_secret_".
    setPaymentIntentId(res.value.clientSecret.split('_secret_')[0]);
    setStep('pay');
  }

  function startCheckout() {
    setError(null);
    if (!isAuthenticated) {
      setStep('login');
      return;
    }
    void beginPayment();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await signIn(email, password);
    if (!r.ok) {
      setBusy(false);
      setError(r.error ?? 'Connexion échouée.');
      return;
    }
    setBusy(false);
    // Authenticated now — go straight to payment (don't re-check the stale flag).
    void beginPayment();
  }

  const label = priceCents ? `Acheter — ${formatPrice(priceCents)}` : 'Acheter cette visite';

  return (
    <div style={{ marginTop: tg.space[4] }}>
      {step === 'idle' && (
        <Button variant="accent" size="lg" fullWidth onClick={startCheckout} disabled={busy}>
          {label}
        </Button>
      )}

      {step === 'login' && (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: tg.space[3] }}>
          <p style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.body, color: tg.colors.ink80 }}>
            Connectez-vous avec votre compte Murmure pour acheter « {title} ».
          </p>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            required
            placeholder="Mot de passe"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            style={inputStyle}
          />
          {error && <p style={errorStyle}>{error}</p>}
          <Button variant="accent" size="lg" fullWidth disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter et payer'}
          </Button>
        </form>
      )}

      {step === 'pay' && clientSecret && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[3] }}>
          <p style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.body, color: tg.colors.ink80 }}>
            Paiement sécurisé — {formatPrice(priceCents)}
          </p>
          <Elements stripe={getStripePromise()} options={{ clientSecret }}>
            <PaymentForm
              paymentIntentId={paymentIntentId}
              onSuccess={() => setStep('done')}
              onError={(msg) => {
                setError(msg);
                setStep('error');
              }}
            />
          </Elements>
        </div>
      )}

      {step === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[2] }}>
          <p style={{ fontFamily: tg.fonts.display, fontSize: tg.fontSize.h6, color: tg.colors.ink }}>
            Merci ! La visite est débloquée.
          </p>
          <p style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.body, color: tg.colors.ink80 }}>
            Ouvrez Murmure avec le même compte pour la retrouver.
          </p>
        </div>
      )}

      {step === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[3] }}>
          <p style={errorStyle}>{error ?? 'Une erreur est survenue.'}</p>
          <Button variant="ghost" size="md" fullWidth onClick={() => setStep('idle')}>
            Réessayer
          </Button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: tg.fonts.sans,
  fontSize: tg.fontSize.body,
  padding: `${tg.space[3]} ${tg.space[4]}`,
  borderRadius: tg.radius.md,
  border: `1px solid ${tg.colors.line}`,
  background: tg.colors.paper,
  color: tg.colors.ink,
};

const errorStyle: React.CSSProperties = {
  fontFamily: tg.fonts.sans,
  fontSize: tg.fontSize.meta,
  color: tg.colors.grenadine,
};
