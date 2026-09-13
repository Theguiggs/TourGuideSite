'use client';
import { checkoutText } from '@/lib/i18n/checkout-copy';
import { type InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';


import { useState } from 'react';
import { confirmTourPurchase } from '@/lib/api/tour-purchase';
import { confirmForfaitPurchase } from '@/lib/api/forfait-purchase';
import { emitPurchasesChanged } from '@/lib/checkout/purchase-events';
import { removePendingTourConfirm } from '@/lib/checkout/pending-tour-confirm';
import { clearStripeReturn } from '@/lib/checkout/stripe-return';
import { useCheckoutLifetime } from './use-checkout-lifetime';

/** Une vérification explicite de l’intent existant, jamais une nouvelle commande. */
export function VerifyPayment({ kind, intentId, tourId, locale, onConfirmed }: {
  kind: 'tour' | 'forfait'; intentId: string; tourId?: string; locale: InterfaceLocale; onConfirmed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const isCurrent = useCheckoutLifetime();
  async function verify() {
    if (busy) return;
    setBusy(true);
    try {
      const result = kind === 'tour' ? await confirmTourPurchase(intentId) : await confirmForfaitPurchase(intentId);
      if (!isCurrent()) return;
      if (result.ok) {
        clearStripeReturn(intentId);
        emitPurchasesChanged();
        if (kind === 'tour') removePendingTourConfirm(intentId);
        if (kind === 'tour' && (!('tourId' in result.value) || result.value.tourId !== tourId)) {
          setMessage(checkoutText(locale, "This payment is for another tour. Check My tours."));
        } else onConfirmed();
      } else setMessage(checkoutText(locale, "Confirmation is not available yet. Check again later or contact support before paying again."));
    } catch {
      setMessage(checkoutText(locale, "Unable to check right now. Please try again."));
    } finally { setBusy(false); }
  }
  return <div className="space-y-3 text-body">
    <p role="status">{message || (checkoutText(locale, "Your payment needs confirmation. Check its status before starting another purchase."))}</p>
    <button className="min-h-11 px-4 rounded-pill bg-grenadine text-paper font-semibold" disabled={busy} onClick={verify}>{busy ? (checkoutText(locale, "Checking…")) : (checkoutText(locale, "Check payment"))}</button>
    <a className="min-h-11 flex items-center text-grenadine underline" href={localizePublicPath("/mes-achats", locale)}>{checkoutText(locale, "My tours")}</a>
  </div>;
}
