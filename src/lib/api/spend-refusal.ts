/**
 * LE VOCABULAIRE DU REFUS DE DÉPENSE — partagé par le proxy et son client.
 *
 * Ce module ne dépend de RIEN, et c'est le point : `internal-spend.ts` importe
 * `amplify_outputs.json` et ne doit jamais entrer dans le paquet du navigateur,
 * alors que `microservice-config.ts` y vit. Le seul bien commun est cet en-tête.
 */

/**
 * L'en-tête qui rend le refus TERMINAL pour le client.
 *
 * `submitMicroserviceJob` réessaie cinq fois sur 429 — le bon réflexe face à la
 * contre-pression du microservice, dont la file se vide. Une enveloppe de
 * dépense épuisée, elle, ne se vide pas toute seule : sans ce marqueur, un
 * plafond atteint coûterait vingt secondes d'attente et cinq débits refusés
 * pour aboutir au même refus. Le corps NOMME déjà la cause ; cet en-tête la
 * rend lisible sans consommer le flux de la réponse.
 */
export const ENTETE_REFUS_DEPENSE = 'x-murmure-refus-depense';

/** Les motifs que le proxy sait produire — un vocabulaire fermé, journalisable. */
export type MotifDeRefus =
  | 'enveloppe-interne-epuisee'
  | 'corps-non-mesurable'
  | 'caracteres-refuses'
  | 'identite-refusee'
  | 'registre-en-panne'
  | 'registre-non-deploye';
