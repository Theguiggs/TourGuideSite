/**
 * LW-2 — l'ancre du bloc d'achat de la fiche Visite.
 *
 * Le lecteur (client) y renvoie à la fin de l'aperçu gratuit ; la page
 * (serveur) la pose sur le conteneur de `TourPurchaseCard` /
 * `ForfaitPurchaseCard`. Les deux bouts du contrat vivent donc ici, dans un
 * module SANS `'use client'` : un composant serveur qui importerait cette
 * constante d'un module client recevrait une référence de client, pas la chaîne.
 */

/** `id` du conteneur d'achat, sans dièse. */
export const PURCHASE_ANCHOR_ID = 'acheter';

/** Cible de lien vers le bloc d'achat. */
export const PURCHASE_ANCHOR = `#${PURCHASE_ANCHOR_ID}`;
