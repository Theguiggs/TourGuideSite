'use client';

/**
 * ForfaitPurchaseCard — achat du forfait « visites IA » sur le web.
 *
 * Forfait annuel SANS reconduction : 19,90 €, douze mois, puis expiration
 * automatique. Aucun prélèvement récurrent — c'est un argument commercial, pas
 * un détail technique : on l'affiche.
 *
 * Flux (le client ne s'accorde jamais l'accès — le serveur vérifie le paiement) :
 *  1. Pas connecté → connexion en ligne (même pool Cognito que l'app).
 *  2. createForfaitPaymentIntent() → clientSecret (montant imposé côté serveur).
 *  3. Stripe PaymentElement → confirmPayment(redirect:'if_required').
 *  4. confirmForfaitPurchase(paymentIntentId) → le serveur écrit l'entitlement.
 *  5. Si l'onglet meurt entre 3 et 4, le webhook Stripe crédite quand même.
 *
 * Nécessite NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (inlinée au build).
 */

import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button, tg } from '@murmure/design-system/web';
import { getStripePromise, isStripeConfigured } from '@/lib/stripe/client';
import { useAuth } from '@/lib/auth/auth-context';
import {
  createForfaitPaymentIntent,
  confirmForfaitPurchase,
  hasActiveForfait,
  FORFAIT_PRICE_CENTS,
} from '@/lib/api/forfait-purchase';
import { emitPurchasesChanged } from '@/lib/checkout/purchase-events';

interface Props {
  locale?: 'fr' | 'en';
}

type Step = 'idle' | 'login' | 'pay' | 'done' | 'error';

function formatPrice(cents: number, locale: 'fr' | 'en' = 'fr'): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

function PaymentForm({
  paymentIntentId,
  onSuccess,
  onError,
  locale,
}: {
  paymentIntentId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
  locale: 'fr' | 'en';
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!stripe || !elements) {
      onError(
        locale === 'en'
          ? 'Payment is not ready. Please try again later.'
          : 'Paiement non prêt — Stripe.js non initialisé. Vérifie NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.',
      );
      return;
    }
    setBusy(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        setBusy(false);
        onError(error.message ?? (locale === 'en' ? 'Payment declined.' : 'Paiement refusé.'));
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        const confirmed = await confirmForfaitPurchase(paymentIntent.id ?? paymentIntentId);
        setBusy(false);
        if (confirmed.ok) onSuccess();
        else onError(confirmed.error.message);
        return;
      }
      setBusy(false);
      onError(
        locale === 'en'
          ? `Payment not completed (${paymentIntent?.status ?? 'unknown'}).`
          : `Paiement non finalisé (${paymentIntent?.status ?? 'inconnu'}).`,
      );
    } catch (e) {
      setBusy(false);
      onError(
        `${locale === 'en' ? 'Payment error' : 'Erreur paiement'}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[4] }}>
      <PaymentElement />
      <Button variant="accent" size="lg" fullWidth onClick={pay} disabled={busy}>
        {busy
          ? locale === 'en'
            ? 'Processing…'
            : 'Paiement…'
          : locale === 'en'
            ? 'Pay'
            : 'Payer'}
      </Button>
    </div>
  );
}

export default function ForfaitPurchaseCard({ locale = 'fr' }: Props) {
  const { isAuthenticated, signIn } = useAuth();
  const [step, setStep] = useState<Step>('idle');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [alreadyActive, setAlreadyActive] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    hasActiveForfait().then((active) => {
      if (!cancelled && active) setAlreadyActive(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  async function beginPayment() {
    if (clientSecret || busy) return;
    setBusy(true);
    setError(null);
    const res = await createForfaitPaymentIntent();
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      setStep('error');
      return;
    }
    if (!res.value.clientSecret) {
      setError(locale === 'en' ? 'Payment is unavailable.' : 'Paiement indisponible.');
      setStep('error');
      return;
    }
    setClientSecret(res.value.clientSecret);
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

  // Reprend automatiquement dès que la session est reconnue (clic avant que
  // AuthProvider ait fini de restaurer, ou connexion qui vient d'aboutir).
  useEffect(() => {
    if (step === 'login' && isAuthenticated) {
      void beginPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isAuthenticated]);

  // Tous les hooks au-dessus de cette ligne — on ne peut sortir qu'après.
  if (!isStripeConfigured()) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await signIn(email, password);
    if (!r.ok) {
      setBusy(false);
      setError(r.error ?? (locale === 'en' ? 'Sign-in failed.' : 'Connexion échouée.'));
      return;
    }
    setBusy(false);
    void beginPayment();
  }

  const priceLabel = formatPrice(FORFAIT_PRICE_CENTS, locale);

  return (
    <div style={{ marginTop: tg.space[4] }}>
      {(alreadyActive || step === 'done') && (
        <div
          data-testid="forfait-active-badge"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tg.space[1],
            padding: `${tg.space[3]} ${tg.space[4]}`,
            borderRadius: tg.radius.md,
            background: tg.colors.olive ? `${tg.colors.olive}1A` : '#E8EFE0',
            border: `1px solid ${tg.colors.olive ?? '#7E8C5A'}`,
          }}
        >
          <span
            style={{
              fontFamily: tg.fonts.sans,
              fontWeight: 700,
              fontSize: tg.fontSize.body,
              color: tg.colors.olive ?? '#5E6B3E',
            }}
          >
            ✓ {locale === 'en' ? 'Pass active' : 'Forfait actif'}
          </span>
          <span
            style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.meta, color: tg.colors.ink80 }}
          >
            {locale === 'en'
              ? 'Open Murmure with the same account to listen to every tour.'
              : 'Ouvrez Murmure avec le même compte pour écouter toutes les visites.'}
          </span>
        </div>
      )}

      {step === 'idle' && !alreadyActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[2] }}>
          <Button variant="accent" size="lg" fullWidth onClick={startCheckout} disabled={busy}>
            {locale === 'en' ? `Get the pass — ${priceLabel}` : `Prendre le forfait — ${priceLabel}`}
          </Button>
          <span
            style={{
              fontFamily: tg.fonts.sans,
              fontSize: tg.fontSize.meta,
              color: tg.colors.ink80,
              textAlign: 'center',
            }}
          >
            {locale === 'en'
              ? '12 months, no auto-renewal — you will not be charged again.'
              : '12 mois, sans reconduction — vous ne serez pas prélevé à nouveau.'}
          </span>
        </div>
      )}

      {step === 'login' && (
        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: tg.space[3] }}
        >
          <p
            style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.body, color: tg.colors.ink80 }}
          >
            {locale === 'en'
              ? 'Sign in to link the pass to your account.'
              : 'Connectez-vous pour rattacher le forfait à votre compte.'}
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            autoComplete="email"
            required
            style={{ padding: tg.space[3], borderRadius: tg.radius.sm }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={locale === 'en' ? 'password' : 'mot de passe'}
            autoComplete="current-password"
            required
            style={{ padding: tg.space[3], borderRadius: tg.radius.sm }}
          />
          <Button variant="accent" size="lg" fullWidth disabled={busy}>
            {busy
              ? locale === 'en'
                ? 'Signing in…'
                : 'Connexion…'
              : locale === 'en'
                ? 'Sign in'
                : 'Se connecter'}
          </Button>
        </form>
      )}

      {step === 'pay' && clientSecret && (
        <Elements stripe={getStripePromise()} options={{ clientSecret }}>
          <PaymentForm
            paymentIntentId={paymentIntentId}
            locale={locale}
            onSuccess={() => {
              setStep('done');
              emitPurchasesChanged();
            }}
            onError={(msg) => {
              setError(msg);
              setStep('error');
            }}
          />
        </Elements>
      )}

      {error && (
        <p
          role="alert"
          style={{
            marginTop: tg.space[3],
            fontFamily: tg.fonts.sans,
            fontSize: tg.fontSize.meta,
            color: tg.colors.grenadine,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
