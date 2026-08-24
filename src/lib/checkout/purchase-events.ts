/**
 * Cross-component signal that the current user's tour ownership changed
 * (purchase completed, pending confirmation recovered).
 *
 * « Possession » couvre les DEUX canaux, et le signal aussi : l'achat à l'unité
 * (`TourPurchase`) comme le droit permanent (`UserEntitlement` — forfait annuel,
 * abonnement). Un forfait n'écrit jamais de ligne `TourPurchase` : un auditeur
 * qui ne rafraîchirait que cette table verrait passer le signal sans rien changer.
 *
 * Écouté par `usePurchasesRefreshTick` (hooks/use-owned-tour-ids), d'où
 * dépendent les badges « Acheté », le flou de l'itinéraire et la redemande du
 * contenu complet — l'accès s'ouvre donc d'un seul tenant, sans rechargement.
 */

export const PURCHASES_CHANGED_EVENT = 'murmure:purchases-changed';

export function emitPurchasesChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT));
  }
}
