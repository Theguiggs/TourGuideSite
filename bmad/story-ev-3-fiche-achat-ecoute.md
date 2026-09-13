# EV-3 — Fiche, achat et écoute mobile

Statut : implémenté localement ; recette consolidée dans EV-6. Aucun push ni déploiement.

L’itinéraire précède les textes longs, la fiche propose un accès direct à l’audio, la barre mobile mène à l’écoute web et à l’achat. Le titre s’adapte au téléphone. Le préchargement des cartes de visite a été désactivé après reproduction d’une navigation vide et vérification de sa correction.

Les achats utilisent les routes de compte EV-1 ; aucun paiement ne démarre à la connexion seule. Refus carte : reprise du même formulaire. Confirmation incertaine : vérification de l’intent existant, conservée au rechargement sans secret. Sessions et réponses tardives isolées ; nettoyage limité à l’intent concerné. Écoute proposée après confirmation serveur. Un paiement d’une autre visite n’accorde aucun succès à la fiche courante.

Le backend local `TourGuideApp`, commit `940b6e2`, interdit les visites retirées et les accès existants ; son code 2615 est reconnu par le portail.

Fichiers principaux : `src/app/catalogue/[city]/[tourSlug]/page.tsx`, `src/components/checkout/`, `src/lib/checkout/`, `src/lib/auth/use-visitor-return.ts`, `src/components/home/home-catalogue.tsx`. La carte ville et la configuration navigateur sont consolidées avec EV-5/EV-6.

Spécification et matrice : [EV-3](../docs/spec-ev-3-parcours-visite.md). Trois relecteurs indépendants ont examiné manques, cas de bord et preuves ; les défauts détectés sont corrigés et repris dans les tests. Rapport : [recette EV-6](revue-ev-6.md).
