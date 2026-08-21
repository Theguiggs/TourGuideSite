/**
 * Forfait « visites IA » — achat sur le web (Stripe).
 *
 * Forfait annuel SANS reconduction : 19,90 €, douze mois d'accès, puis
 * expiration automatique. Aucun prélèvement récurrent.
 *
 * Même flux sécurisé en deux temps que tour-purchase.ts — le client ne s'accorde
 * JAMAIS l'accès lui-même :
 *  1. createForfaitPaymentIntent() → le Lambda impose le montant (constante
 *     serveur, jamais transmise d'ici) et renvoie un clientSecret Stripe.
 *  2. (l'UI confirme le paiement avec Stripe Elements)
 *  3. confirmForfaitPurchase(paymentIntentId) → le Lambda revérifie le
 *     PaymentIntent chez Stripe puis écrit le UserEntitlement. Idempotent.
 *
 * Si l'onglet meurt entre 2 et 3, le webhook Stripe crédite malgré tout.
 */

import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import type { Result } from '@/lib/api/tour-purchase';

const SERVICE_NAME = 'ForfaitPurchaseAPI';

/** Prix affiché. Le montant réellement débité est imposé côté serveur. */
export const FORFAIT_PRICE_CENTS = 1990;

export interface ForfaitPaymentIntentResult {
  clientSecret: string | null;
  amountCents: number;
}

export interface ConfirmForfaitResult {
  expiresAtMs: number;
  alreadyActive: boolean;
}

function describeError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (e && typeof e === 'object') {
    const withErrors = e as { errors?: Array<{ message?: string }> };
    if (Array.isArray(withErrors.errors) && withErrors.errors.length) {
      return withErrors.errors.map((x) => x?.message ?? '?').join(' | ');
    }
    try {
      return JSON.stringify(e).slice(0, 300);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

/** Les Lambdas renvoient une enveloppe {ok, value, error} sérialisée en JSON. */
function parseEnvelope<T>(raw: unknown, fallbackCode: number): Result<T> {
  const payload = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
  if (payload && typeof payload === 'object' && 'ok' in payload) {
    const envelope = payload as { ok: boolean; value?: T; error?: { code: number; message: string } };
    if (envelope.ok && envelope.value !== undefined) return { ok: true, value: envelope.value };
    return {
      ok: false,
      error: envelope.error ?? { code: fallbackCode, message: 'Erreur inconnue' },
    };
  }
  const snippet = JSON.stringify(payload ?? null).slice(0, 300);
  return { ok: false, error: { code: fallbackCode, message: `Réponse inattendue: ${snippet}` } };
}

/**
 * Le visiteur a-t-il déjà un forfait actif ?
 *
 * `UserEntitlement` est lisible par son propriétaire (`ownerDefinedIn('userId')`),
 * donc le client lit le sien sans passer par un Lambda. On accepte n'importe quel
 * entitlement actif et non expiré : le forfait acheté sur le web (`ai_tours_pass`)
 * comme celui venu de Play via RevenueCat (`premium_access`) — exactement la même
 * règle que `isEntitled` côté serveur.
 *
 * Purement cosmétique : ça masque le bouton d'achat. L'accès réel reste décidé
 * par le serveur.
 */
export async function hasActiveForfait(): Promise<boolean> {
  if (shouldUseStubs()) return false;

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (client as any).models.UserEntitlement.list({ authMode: 'userPool' });
    const now = Date.now();
    return (res?.data ?? []).some(
      (e: { active?: boolean; expiresAtMs?: number | null }) =>
        e?.active === true && (e.expiresAtMs == null || e.expiresAtMs > now),
    );
  } catch (error) {
    // Ne jamais bloquer l'achat sur cette lecture : en cas d'échec on affiche le
    // bouton. Un achat en double serait de toute façon idempotent côté serveur.
    logger.warn(SERVICE_NAME, 'hasActiveForfait failed', { detail: describeError(error) });
    return false;
  }
}

/** Étape 1 — créer le PaymentIntent. Aucun argument : le prix vient du serveur. */
export async function createForfaitPaymentIntent(): Promise<Result<ForfaitPaymentIntentResult>> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      ok: true,
      value: { clientSecret: `pi_stub_forfait_${Date.now()}`, amountCents: FORFAIT_PRICE_CENTS },
    };
  }

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).mutations.createForfaitPaymentIntent(
      {},
      { authMode: 'userPool' },
    );
    if (result?.errors?.length) {
      const detail = describeError(result);
      logger.error(SERVICE_NAME, 'createForfaitPaymentIntent GraphQL error', { detail });
      return { ok: false, error: { code: 2632, message: detail } };
    }
    return parseEnvelope<ForfaitPaymentIntentResult>(result?.data, 2632);
  } catch (error) {
    const detail = describeError(error);
    logger.error(SERVICE_NAME, 'createForfaitPaymentIntent failed', { detail });
    return {
      ok: false,
      error: { code: 2632, message: detail || 'createForfaitPaymentIntent failed' },
    };
  }
}

/** Étape 3 — faire vérifier le paiement et accorder le forfait. Idempotent. */
export async function confirmForfaitPurchase(
  paymentIntentId: string,
): Promise<Result<ConfirmForfaitResult>> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      ok: true,
      value: { expiresAtMs: Date.now() + 365 * 24 * 3600 * 1000, alreadyActive: false },
    };
  }

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).mutations.confirmForfaitPurchase(
      { paymentIntentId },
      { authMode: 'userPool' },
    );
    if (result?.errors?.length) {
      const detail = describeError(result);
      logger.error(SERVICE_NAME, 'confirmForfaitPurchase GraphQL error', { detail });
      return { ok: false, error: { code: 2637, message: detail } };
    }
    return parseEnvelope<ConfirmForfaitResult>(result?.data, 2637);
  } catch (error) {
    const detail = describeError(error);
    logger.error(SERVICE_NAME, 'confirmForfaitPurchase failed', { detail });
    return { ok: false, error: { code: 2637, message: detail || 'confirmForfaitPurchase failed' } };
  }
}
