# Revue EV-1 — Accès visiteur

Date : 13 septembre 2026. Lot local, sans push ni déploiement.

## Revues indépendantes

Trois lectures indépendantes ont porté sur les manques, les cas de bord et les preuves absentes. Corrections intégrées :

- Décalage de l’ancienne action applicative de fiche au-dessus de la navigation mobile ; réservation de place et coordination du consentement et de la bannière PWA.
- Destination complète partagée par le header et le lien Compte de la navigation basse.
- Validation des deux normalisations d’URL pour éviter les boucles d’authentification ; conservation des espaces encodés légitimes dans les paramètres et ancres.
- Étape de formulaire conservée lors d’une bascule FR/EN sans mettre d’email, mot de passe ou code dans l’URL.
- Protection du double envoi, liens internes neutralisés pendant une requête et absence de redirection d’un composant démonté.
- Allers-retours entre connexion, inscription et récupération sur une même route ; réconciliation de l’étape après changement de query.

## Vérifications

Référence avant modification : 282 suites / 2450 tests Jest réussis.

Les premiers contrôles ciblés ont réussi. Une passe globale a signalé uniquement l’origine fictive de normalisation dans l’audit CSP ; les helpers utilisent désormais l’origine canonique déjà définie dans `site.ts`. Aucun élargissement de CSP n’a été nécessaire. La régression CSP a ensuite été vérifiée avec succès.

La première recette de fiche a dépassé son délai de 20 secondes ; la passe suivante, avec un budget cohérent avec les tests LW, a terminé en 10 secondes et validé les commandes et le retour. La recette finale est consignée à la clôture ci-dessous.

ESLint parcourait les traces Playwright pendant leur nettoyage et échouait avec ENOENT. Les répertoires générés `test-results` et `playwright-report` sont désormais exclus de l’analyse, comme les autres sorties de build.

## Limites

Les réponses d’inscription, confirmation et récupération sont simulées dans Playwright ; les transitions de connexion et rôles sont vérifiées dans Jest. Cognito déployé a été inspecté en lecture seule. Les comptes E2E guide/admin sont refusés ; aucune inscription réelle ni achat réel n’a été créé. Les contrôles de largeur dans Chromium ne constituent pas une recette sur Safari iPhone ou Chrome Android physiques. Les suites de paiement réelles et la validation publique restent hors de cette preuve EV-1.

## Clôture

Vérifications finales exécutées sur le code livré :

| Contrôle | Résultat |
| --- | --- |
| `npm test -- --runInBand` | 285 suites / 2485 tests réussis, 123,88 secondes |
| `npm run typecheck` | Réussi, aucune erreur |
| `npm run lint` | Réussi, aucun problème |
| `npm run build` | Build de production réussi |
| Playwright visiteur | 3/3 réussis, 29,4 secondes |
| Playwright PWA | 2/2 réussis, 12,1 secondes |
| `git diff --check` | Aucune erreur d’espace |

La recette visiteur couvre les six routes de compte, sept largeurs de 320 à 1440 pixels et un format paysage 844 × 390 ; contrôle du focus clavier et aucun débordement horizontal. Axe ne signale aucune violation dans le contenu principal des six pages contrôlées. Inscription/confirmation et récupération Cognito simulées, changement de langue après confirmation, allers-retours de formulaire sur la même route, navigation d’une fiche publiée de Nice vers connexion avec query et ancre conservées. La dernière relecture des transitions n’a pas signalé d’autre bug concret.

Captures du serveur local de production inspectées : [connexion téléphone](../docs/verification-ev1/connexion-mobile.png), [connexion ordinateur](../docs/verification-ev1/connexion-ordinateur.png), [navigation sur une fiche](../docs/verification-ev1/navigation-fiche-mobile.png). La fiche conserve encore sa présentation antérieure, dont le titre volumineux ; sa refonte reste EV-3.

Les vérifications PWA confirment l’installation locale, l’accueil hors connexion FR/EN, les exclusions de cache et l’activation choisie d’une mise à jour, sans interruption forcée d’un autre onglet. Aucun résultat n’est présenté comme une validation du domaine public.

Commande de reproduction après `npm run build` : `npx playwright test --config=playwright.visitor.config.ts`. Cette configuration démarre son serveur local sur le port 3101 et ne nécessite pas les comptes E2E guide/admin.
