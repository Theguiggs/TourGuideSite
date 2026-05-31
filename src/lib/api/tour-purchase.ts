/**
 * Tour purchase API — Story mon-1.3b (web sale of an individual tour).
 *
 * Two-step secure flow (the client NEVER self-grants):
 *  1. createTourPaymentIntent(tourId) → Lambda reads the authoritative price from
 *     GuideTour and returns a Stripe clientSecret.
 *  2. (UI confirms the payment with Stripe Elements)
 *  3. confirmTourPurchase(paymentIntentId) → Lambda verifies the PaymentIntent
 *     with Stripe (succeeded + belongs to caller) and creates the server-only
 *     TourPurchase. Idempotent.
 *
 * Mirrors language-purchase.ts (stub in dev/tests, real AppSync mutations in prod).
 */

import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'TourPurchaseAPI';

export interface TourPaymentIntentResult {
  clientSecret: string | null;
  amountCents: number;
}

export interface ConfirmTourPurchaseResult {
  tourId: string;
  alreadyOwned: boolean;
}

export interface ApiError {
  code: number;
  message: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: ApiError };

/** Surface a meaningful string from an Amplify/GraphQL error (avoid logging `{}`). */
function describeError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    if (Array.isArray(o.errors)) {
      return o.errors.map((er) => (er as { message?: string })?.message ?? String(er)).join('; ');
    }
    try {
      return JSON.stringify(o);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

/**
 * Shape returned by the Lambda-backed mutations (`a.json()`):
 * `{ ok, value?, error? }`.
 */
interface LambdaEnvelope<T> {
  ok: boolean;
  value?: T;
  error?: ApiError;
}

function parseEnvelope<T>(raw: unknown, fallbackCode = 2614): Result<T> {
  // `a.json()` mutations sometimes return the payload as a JSON STRING — parse it.
  let env: unknown = raw;
  if (typeof env === 'string') {
    try {
      env = JSON.parse(env);
    } catch {
      /* keep as string */
    }
  }
  const e = (env ?? {}) as LambdaEnvelope<T>;
  if (e.ok && e.value !== undefined) {
    return { ok: true, value: e.value };
  }
  if (e.error) {
    return { ok: false, error: e.error };
  }
  // Unexpected shape — surface the raw payload (truncated) for diagnosis.
  const snippet =
    typeof raw === 'string' ? raw.slice(0, 300) : JSON.stringify(raw ?? null).slice(0, 300);
  return { ok: false, error: { code: fallbackCode, message: `Réponse inattendue: ${snippet}` } };
}

/**
 * Step 1: create a Stripe PaymentIntent for buying `tourId`. The amount is the
 * AUTHORITATIVE catalog price (resolved server-side) — never supplied here.
 */
export async function createTourPaymentIntent(
  tourId: string,
): Promise<Result<TourPaymentIntentResult>> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      ok: true,
      value: { clientSecret: `pi_stub_secret_${Date.now()}`, amountCents: 499 },
    };
  }

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).mutations.createTourPaymentIntent(
      { tourId },
      { authMode: 'userPool' },
    );
    if (result?.errors?.length) {
      const detail = describeError(result);
      logger.error(SERVICE_NAME, 'createTourPaymentIntent GraphQL error', { detail });
      return { ok: false, error: { code: 2614, message: detail } };
    }
    return parseEnvelope<TourPaymentIntentResult>(result?.data);
  } catch (error) {
    const detail = describeError(error);
    logger.error(SERVICE_NAME, 'createTourPaymentIntent failed', { detail });
    return { ok: false, error: { code: 2614, message: detail || 'createTourPaymentIntent failed' } };
  }
}

/**
 * Step 3: after Stripe confirms the payment client-side, ask the server to verify
 * it and grant the tour (create TourPurchase). Idempotent — safe to retry.
 */
export async function confirmTourPurchase(
  paymentIntentId: string,
): Promise<Result<ConfirmTourPurchaseResult>> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 400));
    return { ok: true, value: { tourId: 'stub-tour', alreadyOwned: false } };
  }

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).mutations.confirmTourPurchase(
      { paymentIntentId },
      { authMode: 'userPool' },
    );
    if (result?.errors?.length) {
      const detail = describeError(result);
      logger.error(SERVICE_NAME, 'confirmTourPurchase GraphQL error', { detail });
      return { ok: false, error: { code: 2624, message: detail } };
    }
    return parseEnvelope<ConfirmTourPurchaseResult>(result?.data);
  } catch (error) {
    const detail = describeError(error);
    logger.error(SERVICE_NAME, 'confirmTourPurchase failed', { detail });
    return { ok: false, error: { code: 2624, message: detail || 'confirmTourPurchase failed' } };
  }
}

/**
 * Does the current (authenticated) user already own this tour? Owner-based auth
 * (`ownerDefinedIn('userId')`) scopes the list to the caller, so we only filter
 * by tourId + active. Returns false for guests/stub/errors (fail-open to "buyable").
 */
export async function ownsTour(tourId: string): Promise<boolean> {
  if (shouldUseStubs()) {
    return false;
  }
  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).models.TourPurchase.list({
      filter: { tourId: { eq: tourId }, status: { eq: 'active' } },
      authMode: 'userPool',
    });
    const rows = (result?.data ?? []) as unknown[];
    return rows.length > 0;
  } catch (error) {
    logger.warn(SERVICE_NAME, 'ownsTour check failed', { detail: describeError(error) });
    return false;
  }
}
