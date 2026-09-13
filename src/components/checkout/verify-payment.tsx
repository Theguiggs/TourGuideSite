'use client';

import { useState } from 'react';
import { confirmTourPurchase } from '@/lib/api/tour-purchase';
import { confirmForfaitPurchase } from '@/lib/api/forfait-purchase';
import { emitPurchasesChanged } from '@/lib/checkout/purchase-events';
import { removePendingTourConfirm } from '@/lib/checkout/pending-tour-confirm';
import { clearStripeReturn } from '@/lib/checkout/stripe-return';
import { useCheckoutLifetime } from './use-checkout-lifetime';

/** Une vérification explicite de l’intent existant, jamais une nouvelle commande. */
export function VerifyPayment({ kind, intentId, tourId, locale, onConfirmed }: {
  kind: 'tour' | 'forfait'; intentId: string; tourId?: string; locale: 'fr' | 'en'; onConfirmed: () => void;
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
          setMessage(locale === 'en' ? 'This payment is for another tour. Check My tours.' : 'Ce paiement concerne une autre visite. Consultez Mes visites.');
        } else onConfirmed();
      } else setMessage(locale === 'en' ? 'Confirmation is not available yet. Check again later or contact support before paying again.' : 'La confirmation n’est pas encore disponible. Vérifiez plus tard ou contactez l’aide avant de payer à nouveau.');
    } catch {
      setMessage(locale === 'en' ? 'Unable to check right now. Please try again.' : 'Vérification impossible pour le moment. Réessayez.');
    } finally { setBusy(false); }
  }
  return <div className="space-y-3 text-body">
    <p role="status">{message || (locale === 'en' ? 'Your payment needs confirmation. Check its status before starting another purchase.' : 'Votre paiement reste à confirmer. Vérifiez son état avant de recommencer un achat.')}</p>
    <button className="min-h-11 px-4 rounded-pill bg-grenadine text-paper font-semibold" disabled={busy} onClick={verify}>{busy ? (locale === 'en' ? 'Checking…' : 'Vérification…') : (locale === 'en' ? 'Check payment' : 'Vérifier le paiement')}</button>
    <a className="min-h-11 flex items-center text-grenadine underline" href={locale === 'en' ? '/en/my-purchases' : '/mes-achats'}>{locale === 'en' ? 'My tours' : 'Mes visites'}</a>
  </div>;
}
