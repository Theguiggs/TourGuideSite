'use client';
import { checkoutText } from '@/lib/i18n/checkout-copy';
import { LOCALE_FORMATS, type InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';


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
import { buildStripeReturnUrl, clearStripeReturn, readStripeReturn, rememberStripeReturn } from '@/lib/checkout/stripe-return';
import { logger } from '@/lib/logger';

import { useCheckoutLifetime } from './use-checkout-lifetime';
import { VerifyPayment } from './verify-payment';
import { AnalyticsEvents, trackEvent } from '@/lib/analytics';
import { VisitorCheckoutLinks } from './visitor-checkout-links';

const SERVICE_NAME = 'ForfaitPurchaseCard';

interface Props {
  locale?: InterfaceLocale;
}

type Step = 'idle' | 'login' | 'pay' | 'done' | 'error' | 'pending';

function formatPrice(cents: number, locale: InterfaceLocale = 'fr'): string {
  return new Intl.NumberFormat(LOCALE_FORMATS[locale], {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

function PaymentForm({
  paymentIntentId,
  onSuccess,
  onError,
  onPending,
  locale,
}: {
  paymentIntentId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onPending: () => void;
  locale: InterfaceLocale;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!stripe || !elements) {
      logger.error(SERVICE_NAME, 'Stripe.js non initialisé (clé publishable ou script bloqué)');
      onError(
        checkoutText(locale, "Payment is temporarily unavailable. Please try again later."),
      );
      return;
    }
    setBusy(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: buildStripeReturnUrl('forfait') },
      });
      if (error) {
        setBusy(false);
        onError(checkoutText(locale, "Payment declined."));
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        const confirmed = await confirmForfaitPurchase(paymentIntent.id ?? paymentIntentId);
        setBusy(false);
        if (confirmed.ok) onSuccess();
        else onPending();
        return;
      }
      setBusy(false);
      if (paymentIntent?.status === 'processing') { onPending(); return; }
      onError(checkoutText(locale, 'Payment not completed.'));
    } catch (e) {
      setBusy(false);
      logger.error(SERVICE_NAME, 'Payment request failed', { error: e instanceof Error ? e.name : 'unknown' });
      onError(checkoutText(locale, 'Payment error'));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[4] }}>
      <PaymentElement />
      <Button variant="accent" size="lg" fullWidth onClick={pay} disabled={busy}>
        {busy
          ? checkoutText(locale, "Processing…")
          : checkoutText(locale, "Pay")}
      </Button>
    </div>
  );
}

export default function ForfaitPurchaseCard(props: Props) {
  const { user, isAuthenticated } = useAuth();
  return <ForfaitPurchaseCardSession key={`${user?.id ?? isAuthenticated}`} {...props} />;
}

function ForfaitPurchaseCardSession({ locale = 'fr' }: Props) {
  const isCurrent = useCheckoutLifetime();
  const priceLabel = formatPrice(FORFAIT_PRICE_CENTS, locale);
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>('idle');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
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
    if (busy) return;
    if (clientSecret) { setError(null); setStep('pay'); return; }
    setBusy(true);
    setError(null);
    trackEvent(AnalyticsEvents.WEB_CHECKOUT_STARTED, { product: 'forfait', locale });
    const res = await createForfaitPaymentIntent();
    if (!isCurrent()) return;
    setBusy(false);
    if (!res.ok) {
      if (res.error.code === 2638) {
        setAlreadyActive(true);
        setStep('done');
        emitPurchasesChanged();
        return;
      }
      setError(checkoutText(locale, "Payment is temporarily unavailable. Please try again later."));
      setStep('error');
      return;
    }
    if (!res.value.clientSecret) {
      setError(checkoutText(locale, "Payment is unavailable."));
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

  // Retour d'un moyen de paiement à redirection : on confirme côté serveur
  // comme si l'onglet n'avait jamais quitté la page (le webhook crédite de
  // toute façon ; ceci ne sert qu'à le montrer tout de suite).
  useEffect(() => {
    const ret = readStripeReturn('forfait');
    if (!ret || !isAuthenticated) return;
    setPaymentIntentId(ret.paymentIntentId);
    if (ret.status === 'succeeded') {
      if (!isAuthenticated) return;
      setBusy(true);
      confirmForfaitPurchase(ret.paymentIntentId).then((confirmed) => {
        if (!isCurrent()) return;
        setBusy(false);
        if (confirmed.ok) {
          clearStripeReturn(ret.paymentIntentId);
          setStep('done');
          trackEvent(AnalyticsEvents.WEB_CHECKOUT_CONFIRMED, { product: 'forfait', locale });
          emitPurchasesChanged();
        } else {
          setError(checkoutText(locale, "Your payment needs confirmation. Check its status before starting another purchase."));
          setStep('pending');
        }
      }).catch(() => { setBusy(false); setStep('pending'); });
      return;
    }
    setError(
      ret.status === 'processing'
        ? checkoutText(locale, "Your payment is being processed. Use Check payment to confirm access.")
        : checkoutText(locale, "Payment declined."),
    );
    if (ret.status !== 'processing') clearStripeReturn(ret.paymentIntentId);
    setStep(ret.status === 'processing' ? 'pending' : 'error');
    // Lecture unique de l'URL au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);



  // Tous les hooks au-dessus de cette ligne — on ne peut sortir qu'après.
  if (!isStripeConfigured() && !alreadyActive && step !== 'done') {
    return (
      <p
        data-testid="forfait-purchase-in-app"
        style={{ marginTop: tg.space[4], fontFamily: tg.fonts.sans, fontSize: tg.fontSize.body, color: tg.colors.ink80 }}
      >
        {checkoutText(locale, "The pass can be purchased in the Murmure app.")}
      </p>
    );
  }


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
            ✓ {checkoutText(locale, "Pass active")}
          </span>
          <span
            style={{ fontFamily: tg.fonts.sans, fontSize: tg.fontSize.meta, color: tg.colors.ink80 }}
          >
            {checkoutText(locale, "Open Murmure with the same account to listen to every tour.")}
          </span>
        </div>
      )}

      {step === 'idle' && !alreadyActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tg.space[2] }}>
          <Button variant="accent" size="lg" fullWidth onClick={startCheckout} disabled={busy}>
            {checkoutText(locale, 'Get the pass')} — {priceLabel}
          </Button>
          <span
            style={{
              fontFamily: tg.fonts.sans,
              fontSize: tg.fontSize.meta,
              color: tg.colors.ink80,
              textAlign: 'center',
            }}
          >
            {checkoutText(locale, "12 months, no auto-renewal — you will not be charged again.")}
          </span>
        </div>
      )}

      {step === 'login' && <VisitorCheckoutLinks locale={locale} />}

      {step === 'pending' && <VerifyPayment kind="forfait" intentId={paymentIntentId} locale={locale} onConfirmed={() => { setStep('done'); trackEvent(AnalyticsEvents.WEB_CHECKOUT_CONFIRMED, { product: 'forfait', locale }); }} />}

      {step === 'pay' && clientSecret && (
        <Elements stripe={getStripePromise()} options={{ clientSecret, locale }}>
          <PaymentForm
            onPending={() => { if (!isCurrent()) return; rememberStripeReturn('forfait', paymentIntentId); setStep('pending'); }}
            paymentIntentId={paymentIntentId}
            locale={locale}
            onSuccess={() => {
              if (!isCurrent()) return;
              setStep('done');
              trackEvent(AnalyticsEvents.WEB_CHECKOUT_CONFIRMED, { product: 'forfait', locale });
              // Le serveur vient d'écrire l'entitlement (confirmForfaitPurchase a
              // rendu ok). Ce signal rafraîchit la possession — droit permanent
              // COMPRIS — et la redemande du contenu : la visite ouverte derrière
              // cette carte se déverrouille sans rechargement manuel.
              emitPurchasesChanged();
            }}
            onError={(msg) => {
              setError(msg);
              setStep('error');
            }}
          />
        </Elements>
      )}

      {step === 'error' && <Button variant="ghost" fullWidth onClick={() => { setError(null); setStep(clientSecret ? 'pay' : 'idle'); }}>{checkoutText(locale, "Try again")}</Button>}

      {(alreadyActive || step === 'done') && <a className="inline-flex min-h-11 items-center text-ink underline" href={localizePublicPath("/catalogue", locale)}>{checkoutText(locale, "Find a tour to listen to")}</a>}

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
