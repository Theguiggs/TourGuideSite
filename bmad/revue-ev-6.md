# EV-6 — Recette de l’expérience visiteur

13 septembre 2026. Développement local EV-1 à EV-5 terminé. Recette automatisée publique réalisée ; validation intégrée avec comptes réels et appareils physiques non terminée. Aucun push, déploiement ni achat réel.

## Résultat et commits

| Lot | Résultat | Commit local |
| --- | --- | --- |
| EV-1 | Compte public, inscription/récupération, navigation responsive | `19e5af24` |
| EV-2 | Accueil visiteur, recherche, suggestions publiées, création séparée | `55d519c8` |
| EV-3 | Fiche orientée écoute, achat web, attente et reprise du paiement | `55a3ee60` |
| EV-4 | Bibliothèque, reprise locale et isolation des comptes | `00e98492` |
| EV-5 | Filtres persistants, langue et aide visiteur | `7f8d6c9e` |
| Backend EV-3 | Publication et accès vérifiés avant création Stripe | `940b6e2` dans TourGuideApp |

EV-6 ajoute la suite navigateur intégrée, les captures et ce rapport, ainsi que le correctif final de synchronisation de l’historique décrit ci-dessous. Les branches locales sont `feat/lw-1-lecteur-scene` pour le portail et `chore/play-review-prep` pour le backend.

## Vérifications exécutées

| Contrôle | Résultat |
| --- | --- |
| Jest complet portail | 289 suites, 2507 tests réussis, 130,844 s |
| Régression ciblée après correction finale de l’historique | 11 suites, 94 tests réussis, 14,334 s ; sous-ensemble, non additionné au total |
| TypeScript portail | Réussi ; compilation de production vérifiée également |
| Lint portail | Réussi, sans erreur ni avertissement |
| Build production portail | Réussi |
| `playwright.experience.config.ts` | 11 scénarios réussis, 1,1 min |
| `playwright.pwa.config.ts` | 2 scénarios réussis, 10,7 s |
| Backend création d’achat + câblage | 3 suites, 26 tests réussis |
| TypeScript Amplify | Réussi |
| Lint backend ciblé | Aucune erreur ; quatre avertissements `no-new` du câblage CDK existant |
| E2E authentifié, lancement `smoke-auth` | Bloqué dans la préparation commune : identifiants Cognito refusés ; aucun scénario authentifié exécuté |

La préparation E2E échoue avec `Incorrect username or password`. Le nettoyage signale aussi une cible absente : `APPSYNC_API_ID` non défini. Aucun semis n’a été effectué par ce lancement ; le nettoyage a refusé de choisir un backend par défaut. Ces erreurs de configuration restent ouvertes, elles ne sont pas comptées comme des tests réussis.

## Ce que les preuves couvrent

Les scénarios publics contrôlent FR/EN, recherche native sans JavaScript, filtre invalide, durée, rechargement, retour depuis une fiche, liens de langue conservant les filtres, absence de débordement entre 320 et 1440 pixels, bibliothèque déconnectée, aide et lecteur unique au repos. La reprise d’une scène retirée ne provoque aucun autoplay. Les captures FR téléphone/ordinateur ont été inspectées ; les quatre captures de fiche sont archivées.

Axe ne relève aucune violation sur les accueils et pages créateur FR/EN de la recette EV-2, sur la section d’aide visiteur et sur la page hors connexion contrôlées. Ce constat ne constitue pas un audit complet de l’accessibilité de toutes les fiches ni du paiement Stripe.

Les tests unitaires simulent Stripe/Cognito et les réponses de bibliothèque : ils couvrent refus puis réessai sans nouvel intent, attente puis rechargement, confirmation d’un autre produit, changement de compte, réponse tardive après navigation, erreur de bibliothèque et purge des reprises. Ils ne prouvent pas un débit Stripe réel suivi d’un droit disponible dans l’environnement distant.

## Trois revues indépendantes et corrections

Trois relecteurs distincts ont examiné les manques, les cas de bord et les preuves de chaque lot EV-3/4/5, puis la recette EV-6 et le correctif backend.

- Navigation de carte vide : préchargement désactivé sur les liens concernés, régression navigateur reproduite puis corrigée.
- Paiement après connexion dans une instance démontée : remplacement du formulaire inline par les routes publiques EV-1, sans démarrage automatique au retour.
- Refus carte : réaffichage du même formulaire ; confirmation incertaine : vérification de l’intent existant, conservée dans l’URL sans secret au rechargement.
- Réponse tardive : garde de montage, session et chemin ; nettoyage limité à l’intent attendu.
- Retour Stripe d’un autre produit : aucun succès attribué à la fiche courante.
- Publication/droits : garde serveur, refus sur erreur de lecture, code 2615 spécifique pour proposer l’écoute en cas d’accès existant.
- Ordre mobile : itinéraire avant description et guide ; titre responsive et liens directs vers écoute/achat.
- Bibliothèque : annulation des réponses tardives et séparation par compte ; reprises publiées et stockage facultatif.
- Filtres : langue invalide neutralisée, paramètres conservés lors de la bascule FR/EN.
- Synchronisation finale : recopier l’état interne `__NA` dans `replaceState` empêchait Next de notifier `useSearchParams`. Une écriture externe avec `null` laisse Next recopier son état et actualiser le menu ; la recette navigateur épingle ce cas.
- Aide : anciennes FAQ harmonisées pour ne plus promettre le téléchargement audio depuis le site.

## Mesure et limites de livraison

Les événements d’accueil, catalogue, fiche, compte et lecteur sont conservés. `web_checkout_started` et `web_checkout_confirmed` passent par le mécanisme de consentement existant. Leurs propriétés portent sur le produit, la visite et la langue, sans secret Stripe, URL audio, email ni coordonnées GPS. Une confirmation observée côté navigateur n’est pas un registre de ventes et peut être rejouée lors d’une reprise ; utiliser Stripe/backend pour les comptes de ventes. Aucun gain de conversion mesuré n’est revendiqué avant déploiement.

Restent à valider : comptes Cognito E2E opérationnels, cible de nettoyage explicite, parcours Stripe de test réel, appareils iPhone/Safari et Android/Chrome physiques (clavier, rotation, gros texte et écran verrouillé), puis domaine public après autorisation de déploiement. Le correctif backend doit accompagner la version Web pour que le garde-fou soit actif en ligne.

Le contrôle d’accès existant ne verrouille pas deux nouvelles tentatives simultanées ouvertes dans plusieurs onglets : une garantie transactionnelle de commande dépasse ce correctif. La recette intégrée complète et l’autorisation de livraison restent donc distinctes du développement local terminé.

## Aperçus et reproduction

[Fiche téléphone FR](../docs/verification-experience/fiche-fr-mobile.png) · [Fiche ordinateur FR](../docs/verification-experience/fiche-fr-ordinateur.png) · [Fiche téléphone EN](../docs/verification-experience/fiche-en-mobile.png) · [Fiche ordinateur EN](../docs/verification-experience/fiche-en-ordinateur.png).

[Accueil téléphone](../docs/verification-ev2/accueil-fr-mobile.png) · [Accueil ordinateur](../docs/verification-ev2/accueil-fr-ordinateur.png).

Depuis TourGuideWeb : `npm run build`, puis `npx playwright test --config=playwright.experience.config.ts`, puis `npx playwright test --config=playwright.pwa.config.ts`. Exécuter ces suites successivement car elles utilisent le même dossier de résultats. Pour parcourir le site localement : `npm run dev`, puis ouvrir `http://localhost:3000`.
