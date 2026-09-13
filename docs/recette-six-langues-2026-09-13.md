# Recette des six langues et contrôle Stripe — 13 septembre 2026

## Livraison locale

FR, EN, ES, DE, IT et NL couvrent navigation, compte visiteur, catalogue,
bibliothèque, lecture, achat, aide, documents légaux, Studio et administration.
Le même site adapte sa présentation au téléphone et à l’ordinateur.

Les routes FR/EN restent compatibles. La préférence est conservée entre le
site public et le Studio, y compris en mémoire lorsque le stockage est bloqué.
Le document annonce la langue après une navigation côté client. Les pages
hors ligne des espaces protégés reprennent également cette préférence.

Les titres et descriptions de visites utilisent les traductions réellement
publiées. Les textes de scènes qui ne sont pas servis dans une autre langue
restent signalés comme contenus dans leur langue source. Aucune disponibilité
audio n’est déduite de la langue de l’interface. Pas d’enchaînement automatique
des audios ; une seule étape d’aperçu pour les visites verrouillées.

## Vérifications

- Trois revues indépendantes : fonctionnelle, cas limites et lacunes de tests.
  Corrections du consentement, des erreurs, de la persistance de langue, des
  projections de métadonnées, du référencement et des replis hors ligne.
- Recette initiale Chromium : 96 rendus publics (8 pages × 6 langues ×
  largeurs 320 et 1440), HTTP 200, langue et titres vérifiés. Les débordements
  des titres allemand/néerlandais ont été corrigés et recontrôlés.
- Administration : 30 rendus de listes/états vides dans les six langues ;
  confirmations avec motifs saisis inchangés et critères de modération localisés.
- Paiement simulé dans les vrais composants : retour en traitement, refus de
  confirmation, destination de bibliothèque localisée, absence de nouvel intent
  et de droit annoncé prématurément. Les liens de changement de langue gardent
  l’identifiant, le produit et le statut de retour, sans secret client.
- Replis hors ligne : aucune page privée, réponse API ou URL signée mise en cache.
  Seul le code de langue est conservé en plus des ressources publiques prévues.

- Suite globale Web : 298 suites et 2 658 tests réussis. Typage source et lint
  réussis, puis compilation de production optimisée réussie.
- Recette Chromium finale : 96 rendus publics généraux et 12 rendus de la fiche
  d’Aix (six langues × 320/1440 px). Aucun 404, débordement, décalage de langue
  ou erreur JavaScript. La fiche expose six étapes, en verrouille cinq, charge sa
  couverture et ne présente qu’un bouton d’écoute avant achat.

Les contrôles de Studio/admin utilisent des données simulées : ils ne constituent
pas une connexion réelle à un compte guide ou administrateur distant.

## Stripe : état observé et prérequis

Le backend a été corrigé dans le commit local `bb6c9d1` de TourGuideApp.
Les confirmations contrôlent mode, devise, montant et produit. Les octrois
résistent au rejeu et aux confirmations concurrentes. Les achats de langues
sont réellement persistés, avec reprise après écriture partielle.
Preuves : 71 suites backend / 1763 tests, typage Amplify et recettes DynamoDB
Local avec signature Stripe réelle, concurrence et reprise du même événement.

Le contrôle distant en lecture seule a constaté :

- aucune clé publique Stripe dans la configuration Web inspectée ;
- des clés secrètes **de test** dans AWS, mais une pile déclarée **production** ;
- un webhook Stripe de test activé, destiné au backend actuellement configuré.

La recette d’un paiement navigateur n’est donc pas validée. Il faut d’abord
une configuration cohérente : clé publique et clé secrète du même compte et du
même mode, pile correspondant à ce mode et webhook associé. Ne pas contourner
la protection de production pour accepter une clé de test.

Les remboursements Stripe ne sont pas automatiquement traités par le webhook
actuel. Deux paiements distincts ouverts avant l’attribution du premier droit
ne disposent pas d’une réservation globale. Ces limites sont documentées dans
[le rapport Stripe](../../TourGuideApp/docs/controle-stripe-2026-09-13.md).

## Intégration ultérieure

Aucun push ni déploiement réalisé. Préparer les configurations Stripe, intégrer
les commits via revue, puis déployer le backend avant le Web pour le contrat
`hasFullAccess`. Le Web dispose d’un repli limité aux anciens schémas GraphQL,
mais le nouveau champ permet de reconnaître correctement une visite payée
ne contenant que deux étapes. Effectuer ensuite la recette de paiement sur
l’environnement configuré et vérifier les droits depuis un compte visiteur.
