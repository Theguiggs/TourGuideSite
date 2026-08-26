'use client';

import { useEffect, useState } from 'react';
import { listOwnedTourIds } from '@/lib/api/tour-purchase';
import { hasActiveForfait } from '@/lib/api/forfait-purchase';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * Ce que le visiteur possède — résolu côté client (les pages catalogue rendues
 * serveur ignorent qui regarde, les jetons vivant dans `localStorage`).
 *
 * Deux canaux, pas un :
 *  - `TourPurchase` : l'achat à l'unité, une ligne par visite ;
 *  - `UserEntitlement` : un droit permanent actif — le forfait annuel acheté sur
 *    le web comme l'abonnement venu de Play. Il n'écrit AUCUNE ligne
 *    `TourPurchase`, si bien qu'une possession qui ne lisait que cette table
 *    rendait le forfait invisible : payé, mais rien de déverrouillé.
 *
 * Ces valeurs n'ouvrent aucun accès et n'en déverrouillent aucun affichage : le
 * badge « Acheté » et les appels à l'achat s'y accrochent, rien d'autre. Ce que
 * le visiteur peut lire est accordé ou tronqué par le serveur, qui juge sur
 * l'identité de la requête ; l'itinéraire se défloute d'après la réponse reçue,
 * jamais d'après ce que le navigateur croit posséder.
 *
 * Caches de module indexés par utilisateur : toutes les îles montées sur une même
 * page partagent UNE requête au lieu d'une chacune. Vidés au changement
 * d'identité pour ne jamais fuir d'un compte à l'autre.
 */
let cacheKey: string | null = null;
let cachePromise: Promise<Set<string>> | null = null;
let entitlementKey: string | null = null;
let entitlementPromise: Promise<boolean> | null = null;

/** Test-only: drop the module cache so each test starts clean. */
export function __resetOwnedTourIdsCache(): void {
  cacheKey = null;
  cachePromise = null;
  entitlementKey = null;
  entitlementPromise = null;
}

/**
 * Compteur incrémenté sur `murmure:purchases-changed` (achat abouti, confirmation
 * en attente récupérée). Tout ce qui dépend de la possession s'y accroche — le
 * badge, le flou, et la redemande de contenu — pour que l'accès s'ouvre d'un
 * seul tenant, sans rechargement manuel.
 */
export function usePurchasesRefreshTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChanged = () => {
      cacheKey = null;
      cachePromise = null;
      entitlementKey = null;
      entitlementPromise = null;
      setTick((t) => t + 1);
    };
    window.addEventListener(PURCHASES_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(PURCHASES_CHANGED_EVENT, onChanged);
  }, []);
  return tick;
}

/** Set of tourIds bought individually by the current user. */
export function useOwnedTourIds(): Set<string> {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? null;
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const refreshTick = usePurchasesRefreshTick();

  useEffect(() => {
    let cancelled = false;
    // Resolve via a promise in every branch so setOwned is only ever called from
    // an async callback (never synchronously in the effect body).
    if (!isAuthenticated || !userId) {
      cacheKey = null;
      cachePromise = null;
    } else if (cacheKey !== userId || !cachePromise) {
      cacheKey = userId;
      // Un rejet ne doit pas rester en cache : sans ce rattrapage, une panne
      // passagère se figerait pour toute la session, chaque consommateur
      // ré-attendant le même échec.
      cachePromise = listOwnedTourIds().catch(() => {
        if (cacheKey === userId) {
          cacheKey = null;
          cachePromise = null;
        }
        return new Set<string>();
      });
    }
    const pending = cachePromise ?? Promise.resolve(new Set<string>());
    pending.then((ids) => {
      if (!cancelled) setOwned(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, refreshTick]);

  return owned;
}

/**
 * Le visiteur porte-t-il un droit permanent actif (forfait annuel, abonnement) ?
 *
 * `hasActiveForfait()` applique l'état du droit comme `isEntitled` côté serveur :
 * `active === true` et non expiré. Un forfait expiré retombe donc à `false`,
 * comme un visiteur sans droit.
 *
 * LA PARITÉ S'ARRÊTE LÀ. Depuis l'environnement des droits, le serveur exige en
 * plus que l'achat vienne de SA pile : un droit `SANDBOX` lu sur la production
 * ne déverrouille plus rien côté serveur, alors qu'il rend `true` ici. Un
 * testeur en bac à sable verra donc « Forfait actif » sur du contenu que le
 * serveur sert tronqué. Écart assumé : cette lecture ne décide d'aucun accès —
 * elle masque le bouton d'achat et allume le badge. Le jour où on veut la parité,
 * c'est `environment` qu'il faut projeter et comparer ici aussi.
 */
export function useHasActiveEntitlement(): boolean {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? null;
  const [entitled, setEntitled] = useState(false);
  const refreshTick = usePurchasesRefreshTick();

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !userId) {
      entitlementKey = null;
      entitlementPromise = null;
    } else if (entitlementKey !== userId || !entitlementPromise) {
      entitlementKey = userId;
      // Même précaution que ci-dessus : un rejet vidé du cache pour que la
      // lecture suivante reparte, au lieu de servir un échec figé.
      entitlementPromise = hasActiveForfait().catch(() => {
        if (entitlementKey === userId) {
          entitlementKey = null;
          entitlementPromise = null;
        }
        return false;
      });
    }
    const pending = entitlementPromise ?? Promise.resolve(false);
    pending.then((active) => {
      if (!cancelled) setEntitled(active);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId, refreshTick]);

  return entitled;
}

/**
 * Possession d'une visite donnée : un droit permanent actif OU un achat à
 * l'unité. Le forfait est le canal principal, pas un cas particulier.
 */
export function useOwnsTour(tourId: string): boolean {
  const owned = useOwnedTourIds();
  const entitled = useHasActiveEntitlement();
  return entitled || owned.has(tourId);
}
