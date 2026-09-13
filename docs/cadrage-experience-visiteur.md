# Préparation des écrans et de la recette EV

Date : 13 septembre 2026. Référence : [plan](plan-experience-visiteur.md).

## Écrans

[Maquettes filaires téléphone et ordinateur](maquettes-experience-visiteur.html) : accueil, fiche, compte, bibliothèque. Elles fixent l’ordre des informations et les actions, sans se substituer aux captures de l’implémentation. Seul le compte et la navigation sont réalisés dans EV-1 ; accueil, fiche commerciale et bibliothèque complète suivent dans EV-2/3/4.

## Inventaire des routes et états

| Zone | Français | Anglais | États prioritaires |
| --- | --- | --- | --- |
| Accueil | `/` | `/en` | Anonyme, connecté, lien de découverte |
| Catalogue | `/catalogue`, `/catalogue/[city]` | `/en/catalogue`, `/en/catalogue/[city]` | Recherche, filtre, vide, retour de fiche |
| Fiche | `/catalogue/[city]/[tourSlug]` | `/en/catalogue/[city]/[tourSlug]` | Extrait, acheté, réseau, langue, GPS, reprise |
| Bibliothèque | `/mes-achats` | `/en/my-purchases` | Anonyme, chargement, vide, achats, erreur |
| Connexion EV-1 | `/connexion` | `/en/sign-in` | Connexion, session active, compte non confirmé, récupération imposée |
| Inscription EV-1 | `/inscription` | `/en/sign-up` | Inscription, confirmation, code invalide/expiré, renvoi |
| Récupération EV-1 | `/mot-de-passe-oublie` | `/en/reset-password` | Demande, code et nouveau mot de passe, retour connexion |
| Aide | `/aide` | `/en/help` | Visiteur et créateur, liens vers les fonctions disponibles |
| Hors connexion | `/hors-ligne` | `/en/hors-ligne` | Accueil autonome et réessai, sans audio hors ligne |
| Studio historique | `/guide/login`, `/guide/signup`, `/guide/reset-password` | Même route, locale Studio | Création de profil guide et accès selon rôle conservés |

Les achats de visite et de forfait sont des composants de parcours existants : ils seront raccordés à l’authentification publique dans EV-3. Aucune nouvelle route de paiement n’est nécessaire à EV-1. Les URL historiques de bibliothèque restent stables ; leur intitulé visible devient Mes visites / My tours.

## Données et limites de la préparation

Les fiches existantes exposent déjà prix, langues, durée et itinéraire ; le catalogue possède la recherche par ville et le filtre de langue. EV-3/5 vérifieront, champ par champ, la présence et la qualité des valeurs avant affichage de distance ou ajout de filtres. Aucun thème ni donnée manquante n’est inventé dans les maquettes.

La reprise provient du stockage local du lecteur LW : la bibliothèque EV-4 devra lire cette information dans le contexte du compte et conserver la purge à la déconnexion. Elle ne sera pas présentée comme une synchronisation entre appareils.

## Préparation de l’identité et des essais

- Code backend consulté en lecture seule : `TourGuideApp/amplify/auth/resource.ts`, sans déclencheur déclaré.
- Configuration du pool Cognito déployé lue via DescribeUserPool : aucun déclencheur Lambda ; mot de passe minimum 8 caractères, majuscule, minuscule, chiffre et symbole requis. Aucun changement distant effectué.
- Les identifiants de recette guide et administrateur présents dans `.env.e2e` sont refusés par Cognito (`NotAuthorizedException` pour chacun). Aucun token, mot de passe ou email n’est consigné ici.
- La configuration de la suite E2E générale exige également `APPSYNC_API_ID` pour ses semis et nettoyages. Aucun semis n’a été exécuté dans ce lot.
- Une configuration Playwright EV séparée teste le serveur local de production, les réponses Cognito simulées et le catalogue existant en lecture seule. Elle ne prouve pas la livraison d’un email réel ni une connexion réelle de bout en bout.
- Les appareils physiques Android/iPhone et la recette publique après déploiement restent à prévoir. Le site public n’est pas modifié par les travaux locaux.

## Contrôle de chaque lot suivant

Conserver les références 390 et 1440 pixels pour les écrans principaux ; vérifier les limites 320, 360, 430, 768 et 1024. Étendre la recette à portrait/paysage, clavier virtuel et agrandissement du texte sur appareils physiques. Les tests de compte EV-1 servent de socle ; ils ne valident pas à eux seuls les futurs achats et reprises EV-3/4.
