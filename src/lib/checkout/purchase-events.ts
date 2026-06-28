/**
 * Cross-component signal that the current user's tour ownership changed
 * (purchase completed, pending confirmation recovered). Listened to by
 * useOwnedTourIds to refresh "Acheté" badges without a page reload.
 */

export const PURCHASES_CHANGED_EVENT = 'murmure:purchases-changed';

export function emitPurchasesChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT));
  }
}
