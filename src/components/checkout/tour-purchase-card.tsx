'use client';

/**
 * TourPurchaseCard — Story mon-1.3b. Web purchase of an individual tour.
 *
 * Flow (the client never self-grants — the server verifies the payment):
 *  1. If not signed in → inline email/password login (same Cognito pool as the app).
 *  2. createTourPaymentIntent(tourId) → clientSecret (authoritative price server-side).
 *  3. Stripe PaymentElement → confirmPayment(redirect:'if_required', return_url).
 *  4. confirmTourPurchase(paymentIntentId) → server creates the TourPurchase.
 *  5. Success → the tour is owned; the buyer opens it in the app (same account).
 *
 * Deux filets, parce qu'il n'y a pas de webhook Stripe pour les visites :
 *  - l'intent est inscrit dans `pending-tour-confirm` dès sa création, et
 *    rejoué au prochain chargement si l'onglet meurt entre 3 et 4 ;
 *  - un moyen de paiement à redirection revient sur cette page avec
 *    `payment_intent` + `redirect_status`, relus au montage.
 *
 * Only rendered for tours with purchaseType === 'paid'. Requires
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 */

import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button, tg } from '@murmure/design-system/web';
import { getStripePromise, isStripeConfigured } from '@/lib/stripe/client';
import { useAuth } from '@/lib/auth/auth-context';
import { createTourPaymentIntent, confirmTourPurchase, ownsTour } from '@/lib/api/tour-purchase';
import { emitPurchasesChanged } from '@/lib/checkout/purchase-events';
import { addPendingTourConfirm, removePendingTourConfirm } from '@/lib/checkout/pending-tour-confirm';
import { buildStripeReturnUrl, clearStripeReturn, readStripeReturn } from '@/lib/checkout/stripe-return';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'TourPurchaseCard';

interface Props {
  tourId: string;
  title: string;
  priceCents?: number;
  locale?: 'fr' | 'en';
}

type Step = 'idle' | 'login' | 'pay' | 'done' | 'error';

function formatPrice(cents?: number, locale: 'fr' | 'en' = 'fr'): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents) || cents < 0) return '';
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

// --- Inner payment form (must live inside <Elements>) ---
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
    // La cause technique (clé publishable absente au build, Stripe.js bloqué)
    // va au journal ; le visiteur ne lit qu'un message qu'il peut comprendre.
    if (!stripe || !elements) {
      logger.error(SERVICE_NAME, 'Stripe.js non initialisé (clé publishable ou script bloqué)');
      onError(
        locale === 'en'
          ? 'Payment is temporarily unavailable. Please try again later.'
          : 'Le paiement est momentanément indisponible. Réessayez dans quelques instants.',
      );
      return;
    }
    setBusy(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: buildStripeReturnUrl('tour') },
      });
      if (error) {
        setBusy(false);
        onError(error.message ?? (locale === 'en' ? 'Payment declined.' : 'Paiement refusé.'));
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        const confirmed = await confirmTourPurchase(paymentIntent.id ?? paymentIntentId);
        setBusy(false);
        if (confirmed.ok) onSuccess();
        else onError(confirmed.error.message);
        return;
      }
      setBusy(false);
      onError(locale === 'en' ? `Payment not completed (${paymentIntent?.status ?? 'unknown'}).` : `Paiement non finalisé (${paymentIntent?.status ?? 'inconnu'}).`);
    } catch (e) {
      setBusy(false);
      onError(`${locale === 'en' ? 'Payment error' : 'Erreur paiement'}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[4] }}>
      <PaymentElement />
      <Button variant="accent" size="lg" fullWidth onClick={pay} disabled={busy}>
        {busy ? (locale === 'en' ? 'Processing…' : 'Paiement…') : (locale === 'en' ? 'Pay' : 'Payer')}
      </Button>
    </div>
  );
}

export default function TourPurchaseCard({ tourId, title, priceCents, locale = 'fr' }: Props) {
  const { isAuthenticated, signIn } = useAuth();
  const [step, setStep] = useState<Step>('idle');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [owned, setOwned] = useState(false);

  // Already-purchased check: hide the buy CTA + show a badge if the user owns it.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    ownsTour(tourId).then((o) => {
      if (!cancelled && o) setOwned(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, tourId]);

  // Step 2: fetch a PaymentIntent (server resolves the authoritative price).
  async function beginPayment() {
    // Idempotent: once we already have a clientSecret (form mounted), don't re-fetch
    // (guards against the auto-skip effect / StrictMode double-invoke).
    if (clientSecret || busy) return;
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
      setError(locale === 'en' ? 'Payment is unavailable for this tour.' : 'Paiement indisponible pour cette visite.');
      setStep('error');
      return;
    }
    setClientSecret(res.value.clientSecret);
    // clientSecret is "pi_XXX_secret_YYY" → PaymentIntent id is the part before "_secret_".
    const intentId = res.value.clientSecret.split('_secret_')[0];
    setPaymentIntentId(intentId);
    // Filet : si l'onglet meurt entre le débit et confirmTourPurchase, le
    // prochain chargement rejoue la confirmation (idempotente, vérifiée Stripe).
    addPendingTourConfirm(intentId, tourId);
    setStep('pay');
  }

  function grant(intentId: string) {
    removePendingTourConfirm(intentId);
    setOwned(true);
    setStep('done');
    // M5 — notifier le reste du SPA (badges "Acheté", "Mes achats",
    // catalogue) pour rafraîchir la propriété sans hard reload.
    emitPurchasesChanged();
  }

  // Retour d'un moyen de paiement à redirection : Stripe nous ramène ici avec
  // l'intent et son statut ; on confirme côté serveur comme si l'onglet
  // n'avait jamais quitté la page.
  useEffect(() => {
    const ret = readStripeReturn('tour');
    if (!ret) return;
    clearStripeReturn();
    if (ret.status === 'succeeded') {
      if (!isAuthenticated) return; // la session se restaure ; le rejeu global prendra le relais
      setBusy(true);
      confirmTourPurchase(ret.paymentIntentId).then((confirmed) => {
        setBusy(false);
        if (confirmed.ok) grant(ret.paymentIntentId);
        else {
          setError(confirmed.error.message);
          setStep('error');
        }
      });
      return;
    }
    if (ret.status === 'processing') {
      setError(
        locale === 'en'
          ? 'Your payment is being processed. The tour will unlock automatically once it is confirmed.'
          : 'Votre paiement est en cours de traitement. La visite se débloquera automatiquement une fois confirmé.',
      );
      setStep('error');
      return;
    }
    removePendingTourConfirm(ret.paymentIntentId);
    setError(locale === 'en' ? 'Payment declined.' : 'Paiement refusé.');
    setStep('error');
    // Lecture unique de l'URL au montage ; `grant` et `locale` sont stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  function startCheckout() {
    setError(null);
    if (!isAuthenticated) {
      setStep('login');
      return;
    }
    void beginPayment();
  }

  // Auto-skip the login step once the session is recognised (e.g. user clicked
  // "Acheter" before AuthProvider finished restoring the session, or just signed in).
  useEffect(() => {
    if (step === 'login' && isAuthenticated) {
      void beginPayment();
    }
    // beginPayment is stable enough for this guarded one-shot; deps intentionally minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isAuthenticated]);

  // All hooks above this line — only now may we bail out early.
  // Sans clé Stripe au build, ne pas rendre `null` : le visiteur verrait une
  // visite payante sans aucun moyen de l'obtenir.
  if (!isStripeConfigured()) {
    return (
      <p data-testid="tour-purchase-in-app" style={{ marginTop: tg.space[4], ...noteStyle }}>
        {locale === 'en'
          ? 'This tour can be purchased in the Murmure app.'
          : "Cette visite s'achète dans l'application Murmure."}
      </p>
    );
  }

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
    // Authenticated now — go straight to payment (don't re-check the stale flag).
    void beginPayment();
  }

  const label = priceCents
    ? `${locale === 'en' ? 'Buy' : 'Acheter'} — ${formatPrice(priceCents, locale)}`
    : locale === 'en' ? 'Buy this tour' : 'Acheter cette visite';

  return (
    <div style={{ marginTop: tg.space[4] }}>
      {/* Badge "déjà débloquée" — possession existante OU achat qui vient d'aboutir. */}
      {(owned || step === 'done') && (
        <div
          data-testid="tour-owned-badge"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tg.space[1],
            padding: `${tg.space[3]} ${tg.space[4]}`,
            borderRadius: tg.radius.md,
            background: tg.colors.oliveSoft,
            border: `1px solid ${tg.colors.olive}`,
          }}
        >
          <span
            style={{
              fontFamily: tg.fonts.sans,
              fontWeight: 700,
              fontSize: tg.fontSize.body,
              color: tg.colors.olive,
            }}
          >
            ✓ {locale === 'en' ? 'Tour unlocked' : 'Visite débloquée'}
          </span>
          <span style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.meta, color: tg.colors.ink80 }}>
            {locale === 'en'
              ? 'Open Murmure with the same account to listen.'
              : "Ouvrez Murmure avec le même compte pour l'écouter."}
          </span>
        </div>
      )}

      {step === 'idle' && !owned && (
        <Button variant="accent" size="lg" fullWidth onClick={startCheckout} disabled={busy}>
          {label}
        </Button>
      )}

      {step === 'login' && (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: tg.space[3] }}>
          <p style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.body, color: tg.colors.ink80 }}>
            {locale === 'en'
              ? `Sign in with your Murmure account to buy “${title}”.`
              : `Connectez-vous avec votre compte Murmure pour acheter « ${title} ».`}
          </p>
          <label htmlFor="tour-purchase-email" style={labelStyle}>Email</label>
          <input
            id="tour-purchase-email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            style={inputStyle}
          />
          <label htmlFor="tour-purchase-password" style={labelStyle}>
            {locale === 'en' ? 'Password' : 'Mot de passe'}
          </label>
          <input
            id="tour-purchase-password"
            type="password"
            required
            autoComplete="current-password"
            placeholder={locale === 'en' ? 'Password' : 'Mot de passe'}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            style={inputStyle}
          />
          {error && <p style={errorStyle}>{error}</p>}
          <Button variant="accent" size="lg" fullWidth disabled={busy}>
            {busy ? (locale === 'en' ? 'Signing in…' : 'Connexion…') : (locale === 'en' ? 'Sign in and pay' : 'Se connecter et payer')}
          </Button>
        </form>
      )}

      {step === 'pay' && clientSecret && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[3] }}>
          <p style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.body, color: tg.colors.ink80 }}>
            {locale === 'en' ? 'Secure payment' : 'Paiement sécurisé'} — {formatPrice(priceCents, locale)}
          </p>
          <Elements stripe={getStripePromise()} options={{ clientSecret }}>
            <PaymentForm
              paymentIntentId={paymentIntentId}
              onSuccess={() => grant(paymentIntentId)}
              onError={(msg) => {
                setError(msg);
                setStep('error');
              }}
              locale={locale}
            />
          </Elements>
        </div>
      )}

      {step === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[3] }}>
          <p style={errorStyle}>{error ?? (locale === 'en' ? 'An error occurred.' : 'Une erreur est survenue.')}</p>
          <Button variant="ghost" size="md" fullWidth onClick={() => setStep('idle')}>
            {locale === 'en' ? 'Try again' : 'Réessayer'}
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

const labelStyle: React.CSSProperties = {
  fontFamily: tg.fonts.sans,
  fontSize: tg.fontSize.meta,
  color: tg.colors.ink80,
};

const noteStyle: React.CSSProperties = {
  fontFamily: tg.fonts.sans,
  fontSize: tg.fontSize.body,
  color: tg.colors.ink80,
};

const errorStyle: React.CSSProperties = {
  fontFamily: tg.fonts.sans,
  fontSize: tg.fontSize.meta,
  color: tg.colors.grenadine,
};
