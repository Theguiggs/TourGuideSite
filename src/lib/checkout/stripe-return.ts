/**
 * Retour de redirection Stripe (`confirmParams.return_url`).
 *
 * Sans `return_url`, Stripe refuse la confirmation de tout moyen de paiement à
 * redirection (« return_url is required »). Et quand la redirection aboutit,
 * la page revient SANS le composant qui attendait `confirmPayment` : le
 * paiement est pris, l'accès jamais accordé côté serveur.
 *
 * Stripe ajoute lui-même `payment_intent`, `payment_intent_client_secret` et
 * `redirect_status` à l'URL de retour. On y ajoute `murmure_pay` pour savoir
 * QUELLE carte doit reprendre la main — la fiche visite en monte deux (visite
 * et forfait).
 */

export type StripeReturnKind = 'tour' | 'forfait';

const KIND_PARAM = 'murmure_pay';
const STRIPE_PARAMS = ['payment_intent', 'payment_intent_client_secret', 'redirect_status'];

export interface StripeReturn {
  paymentIntentId: string;
  /** `succeeded`, `processing`, `failed`… tel que rendu par Stripe. */
  status: string;
}

/** URL de retour pour la page courante, marquée du type de carte. */
export function buildStripeReturnUrl(kind: StripeReturnKind): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const url = new URL(window.location.href);
  for (const p of STRIPE_PARAMS) url.searchParams.delete(p);
  url.searchParams.set(KIND_PARAM, kind);
  url.hash = '';
  return url.toString();
}

/** Ce que Stripe a laissé dans l'URL pour CETTE carte, ou null. */
export function readStripeReturn(kind: StripeReturnKind): StripeReturn | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get(KIND_PARAM) !== kind) return null;
  const paymentIntentId = params.get('payment_intent');
  const status = params.get('redirect_status');
  if (!paymentIntentId || !status) return null;
  return { paymentIntentId, status };
}

/** Nettoie l'URL pour qu'un rechargement ne rejoue pas le retour. */
export function clearStripeReturn(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  for (const p of [...STRIPE_PARAMS, KIND_PARAM]) url.searchParams.delete(p);
  window.history.replaceState(window.history.state, '', url.toString());
}
