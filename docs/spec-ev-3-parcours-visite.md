# EV-3 — Fiche, achat et écoute

13 septembre 2026. Réalisation locale autorisée dans la continuité EV-1/EV-2.

## Intention et limites

Placer l’écoute avant les longs textes, proposer l’achat sur le site et conserver les accès au compte public. Réutiliser le lecteur unique, les confirmations serveur et les liens historiques. Aucun achat réel, aucune modification des droits ni URL audio signée dans le HTML ou le stockage. La recette Stripe réelle dépend de comptes de test opérationnels ; distinguer simulation et paiement réel.

## Présentation

Conserver les tokens et polices Murmure décrits dans la spécification EV-2. Une colonne sur téléphone, résumé puis itinéraire/écoute puis description et guide ; panneau d’achat adjacent sur ordinateur. La barre mobile propose l’itinéraire et l’achat, sans doubler le lecteur. L’application reste une option secondaire pour la marche.

```text
Téléphone                 Ordinateur
Titre / résumé            Titre / résumé
Écoute / itinéraire       Écoute / itinéraire | Achat
Description / guide       Description / guide | Application
Écouter | Acheter         Avis
Navigation visiteur
```

## Carte du code et tâches

- `src/app/catalogue/[city]/tour-list-filter.tsx:142` : diagnostiquer la navigation vide depuis une carte, vérifier sans préchargement.
- `src/app/catalogue/[city]/[tourSlug]/page.tsx:333` : ordre des blocs, accès immédiat à l’itinéraire, achat web et barre mobile.
- `src/components/checkout/tour-purchase-card.tsx:113` et `forfait-purchase-card.tsx` : accès inscription/récupération publics, confirmation serveur, issue d’écoute, reprise après erreur.
- `e2e/tests/visitor-auth.spec.ts:76` : reproduire puis vérifier l’ouverture de fiche.

## Matrice et acceptation

| Cas | Résultat attendu |
| --- | --- |
| Carte de catalogue, navigation cliente | Fiche et lecteur réellement rendus |
| Visiteur déconnecté | Extrait public, connexion/inscription/récupération avec retour |
| Achat confirmé serveur | Contenu rafraîchi, accès explicite à l’écoute |
| Paiement en attente/refusé | Message utile, pas de succès présumé ni nouvel intent involontaire |
| Compte changé | Aucun état de possession hérité du précédent compte |
| Téléphone 320–430 / ordinateur | Actions accessibles, aucune seconde instance audio |

Tests ciblés checkout/fiche, régression navigateur, typecheck/lint/build ; trois revues indépendantes avant commit. Les cas physiques et les services de test indisponibles sont consignés dans EV-6.

## Garde-fou backend découvert à la revue

Correction locale dans le dépôt voisin `TourGuideApp` : `amplify/functions/create-tour-payment-intent/{handler,data-access}.ts` et câblage `amplify/backend.ts`. Lire la publication de manière cohérente, refuser l’achat d’une visite retirée ou déjà accessible (propriétaire, achat actif, abonnement valide dans l’environnement autorisé). Réutiliser les lecteurs de droits existants, refuser la création si leur lecture échoue. Aucun changement de schéma ni déploiement. Tests : publication, achat/propriétaire, abonnement expiré/autre environnement, erreur de lecture, prix serveur. Deux tentatives simultanées distinctes restent une question de commande serveur transactionnelle, hors de ce correctif ; aucune garantie d’exclusion entre onglets n’est revendiquée.
