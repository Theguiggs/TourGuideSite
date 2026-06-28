/**
 * Pending tour-purchase confirmations (mon-1.3b robustness, "web→app loop").
 *
 * Without a Stripe webhook backstop, the only grant path is the client calling
 * confirmTourPurchase after Stripe takes the payment. If the tab dies in that
 * window, the user paid but isn't granted. We persist the paymentIntentId at
 * payment start and replay confirmTourPurchase on the next load — it's idempotent
 * and verifies the payment with Stripe (status=succeeded + caller match), so a
 * replay of an unpaid/abandoned PI simply fails and is dropped.
 *
 * localStorage-backed, SSR-safe (no-op without `window`).
 */

const KEY = 'murmure:pendingTourConfirms';
/** Cleanup horizon — drop anything older than this regardless of state. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PendingTourConfirm {
  paymentIntentId: string;
  tourId: string;
  /** Epoch ms when the payment was initiated. */
  ts: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function read(): PendingTourConfirm[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(
      (p): p is PendingTourConfirm =>
        !!p &&
        typeof p === 'object' &&
        typeof (p as PendingTourConfirm).paymentIntentId === 'string' &&
        typeof (p as PendingTourConfirm).tourId === 'string' &&
        typeof (p as PendingTourConfirm).ts === 'number' &&
        now - (p as PendingTourConfirm).ts < MAX_AGE_MS,
    );
  } catch {
    return [];
  }
}

function write(list: PendingTourConfirm[]): void {
  if (!isBrowser()) return;
  try {
    if (list.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode — best effort */
  }
}

/** Record an in-flight confirmation (deduped by paymentIntentId). */
export function addPendingTourConfirm(paymentIntentId: string, tourId: string): void {
  if (!paymentIntentId) return;
  const list = read().filter((p) => p.paymentIntentId !== paymentIntentId);
  list.push({ paymentIntentId, tourId, ts: Date.now() });
  write(list);
}

/** Drop a confirmation once granted (or definitively abandoned). */
export function removePendingTourConfirm(paymentIntentId: string): void {
  write(read().filter((p) => p.paymentIntentId !== paymentIntentId));
}

export function listPendingTourConfirms(): PendingTourConfirm[] {
  return read();
}
