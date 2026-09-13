# Plan de mise en œuvre — expérience visiteur Murmure

Date : 13 septembre 2026. Statut : développement EV-1 à EV-6 réalisé localement. Recette automatisée publique réussie ; validation intégrée authentifiée, appareils physiques et domaine public restants. Livraison non validée, aucun déploiement.

Suivi : [cadrage](cadrage-experience-visiteur.md), [spécification EV-1](spec-ev-1-acces-visiteur.md), [revue et preuves EV-1](../bmad/revue-ev-1.md).

Accueil : [spécification EV-2](spec-ev-2-accueil-visiteur.md), [revue et preuves EV-2](../bmad/revue-ev-2.md).

Clôture de développement : [rapport EV-6, commits, preuves et limites](../bmad/revue-ev-6.md). Fiche/achat : [EV-3](spec-ev-3-parcours-visite.md) ; bibliothèque : [EV-4](spec-ev-4-mes-visites.md) ; catalogue/aide : [EV-5](spec-ev-5-catalogue-aide.md) ; recette : [EV-6](spec-ev-6-recette.md).

Source : [analyse de l’expérience visiteur](analyse-experience-visiteur-2026-09-13.md). Socle : les six LW réalisées localement ; leur recette publique et sur téléphones physiques reste à terminer.

## Objectif et résultat attendu

Permettre à une personne découvrant Murmure de trouver une visite, écouter un extrait, créer son compte ou se connecter, acheter et écouter sur le site. Permettre à une personne qui revient de retrouver immédiatement ses visites et reprendre son écoute.

Toutes les pages de ce parcours s’adaptent automatiquement au téléphone, à la tablette et à l’ordinateur, en français et en anglais. Le visiteur n’a pas à choisir une version mobile.

Parcours de référence : **Découvrir → Choisir une visite → Écouter un extrait → Se connecter ou s’inscrire → Acheter → Écouter → Reprendre depuis Mes visites**.

## Décisions de mise en œuvre

- Un compte Murmure commun au site et à l’application. Aucun choix de rôle obligatoire à la connexion. L’inscription visiteur ne crée pas de profil guide ; un guide conserve ses droits et peut aussi visiter.
- Accueil public consacré aux visites ; argumentaire de création sur une page dédiée, accessible en lien secondaire. Le Studio reste accessible aux créateurs.
- Navigation ordinateur : Découvrir les visites, Mes visites, Aide, Se connecter / Mon compte.
- Navigation téléphone : Explorer, Mes visites, Compte. La connexion reste visible dès l’arrivée ; aide, langue et création restent accessibles.
- Découverte et extraits publics accessibles sans compte. Les droits d’écoute et d’achat restent vérifiés côté serveur.
- Réutilisation du lecteur LW et de son unique instance audio. Une barre mobile contextuelle porte l’action d’achat ou les commandes de lecture ; aucune accumulation de barres concurrentes.
- La reprise reste limitée aux capacités existantes sur l’appareil. Aucune promesse de synchronisation entre appareils ni d’audio hors ligne.
- Conservation des anciennes URL et des liens de retour, de la langue et de la visite choisie. Les noms finaux des routes seront alignés sur les conventions du dépôt avant modification.

## Ordre, dépendances et livrables

| Étape | Lot | Dépendances | Livrable observable |
| --- | --- | --- | --- |
| 0 | Cadrage des écrans et de la recette | Analyse existante | Inventaire des routes, états et maquettes filaires téléphone/ordinateur |
| 1 | EV-1 — Accès visiteur et compte | Étape 0 | Connexion visible, inscription visiteur et retour au bon endroit |
| 2 | EV-2 — Accueil consacré aux visites | EV-1, navigation commune | Une entrée immédiate vers les destinations et les visites |
| 3 | EV-3 — Fiche, achat et écoute mobile | EV-1 ; socle LW | Extrait visible, achat accessible, écoute après paiement |
| 4 | EV-4 — Mes visites et reprise | EV-1 et EV-3 | Bibliothèque orientée écoute et reprise disponible |
| 5 | EV-5 — Catalogue et aide | EV-2 ; vocabulaire EV-3/EV-4 | Recherche conservée, filtres utiles, assistance cohérente |
| 6 | EV-6 — Recette complète et mesures | EV-1 à EV-5 | Rapport de validation, écarts restants et version prête à livrer |

Ordre d’exécution recommandé : 0 → EV-1 → EV-2 → EV-3 → EV-4 → EV-5 → EV-6. Les tests, les traductions et l’adaptation mobile font partie de chaque lot ; EV-6 consolide leurs résultats.

## Étape 0 — Préparer les écrans et la recette

1. Inventorier les routes publiques françaises et anglaises : accueil, catalogue, ville, fiche, forfait, compte, achats, aide et pages hors connexion. Identifier les redirections et liens historiques.
2. Dessiner les écrans clés en 390 et 1440 pixels : accueil, fiche, connexion/inscription et bibliothèque. Définir le placement du lecteur, de la navigation basse et de l’action principale.
3. Décrire les états : visiteur déconnecté, compte non confirmé, visiteur connecté sans achat, visite achetée, guide connecté, chargement, erreur, session expirée et réseau absent.
4. Vérifier les données disponibles pour durée, distance, langue, prix et reprise. Afficher uniquement les informations fiables ; aucun champ fictif pour compléter une maquette.
5. Vérifier la configuration de test Cognito/AppSync et Stripe. Le précédent lancement de la suite E2E générale était bloqué par sa configuration ; le résoudre avant de compter sur ses résultats. Les tests avec services simulés et les tests réels seront identifiés séparément.

Sortie : écrans de référence et matrice routes/états de test, attachés au travail EV. Cette étape est une préparation de réalisation, sans nouveau cycle de validation imposé à l’utilisateur.

## EV-1 — Trouver son compte et se connecter

Travaux :

- EV-1.1 : navigation publique commune, entrée Mes visites visible avant connexion, compte sur téléphone, états connecté/déconnecté.
- EV-1.2 : connexion neutre et récupération de mot de passe ; composants partagés avec les accès existants ; parcours créateur conservé.
- EV-1.3 : inscription visiteur minimale, confirmation d’email, renvoi du code et gestion des comptes déjà existants. Vérifier les déclencheurs Cognito applicables pour s’assurer qu’aucun profil guide n’est créé indirectement.
- EV-1.4 : retour après connexion, inscription et confirmation vers la visite ou la bibliothèque demandée, avec langue conservée. Réutiliser la validation des destinations internes.

Zones concernées : `Header.tsx`, pages `guide/login` et `guide/signup`, nouvelles routes publiques de compte, `src/lib/auth/`, traductions et liens vers Mes visites.

Critères de validation :

- Depuis l’accueil et une fiche, une personne déconnectée identifie une entrée explicitement appelée « Se connecter ».
- Un nouveau visiteur crée et confirme son compte sans fournir de ville ni créer de GuideProfile.
- Un compte de l’application fonctionne sur le site ; un guide conserve l’accès au Studio.
- Une connexion commencée sur une fiche revient à cette fiche, dans la langue prévue. Une destination externe injectée n’est pas suivie.
- Erreurs de mot de passe, confirmation expirée et session expirée sont compréhensibles ; aucun accès payant n’est débloqué par l’interface seule.
- Formulaires utilisables au clavier, sur téléphone avec clavier virtuel, et en anglais.

## EV-2 — Comprendre et découvrir dès l’accueil

Travaux :

- EV-2.1 : promesse visiteur, recherche de destination, bouton « Trouver une visite », sélection de visites réellement publiées et explication en trois étapes.
- EV-2.2 : lien Mes visites pour le retour ; lien de reprise seulement lorsqu’une reprise exploitable existe.
- EV-2.3 : déplacement du contenu créateur vers une page dédiée ; mise à jour des liens, des métadonnées, des variantes anglaises et des aperçus de partage.

Zones concernées : `src/app/page.tsx`, `src/app/en/page.tsx`, composants d’accueil, navigation et métadonnées.

Critères de validation : la première zone visible en 390 pixels présente la promesse et l’action de découverte ; le catalogue s’ouvre sans compte ; le parcours de recrutement guide reste accessible ; les textes restent lisibles à 320 pixels et après agrandissement.

## EV-3 — Choisir, acheter et écouter sur téléphone

Travaux :

- EV-3.1 : réordonner la fiche : titre et bénéfice, données pratiques disponibles, extrait, itinéraire, guide et avis. Conserver les informations de confiance et le détail des étapes.
- EV-3.2 : action principale selon les droits et l’état réel : extrait, achat, écoute ou reprise. Sur téléphone, réserver l’espace nécessaire à la barre contextuelle et à la navigation basse ; sur ordinateur, garder un panneau d’action proche du résumé.
- EV-3.3 : réutiliser l’authentification EV-1 dans l’achat de visite et de forfait, avec inscription et récupération accessibles. Préserver le produit choisi et la langue.
- EV-3.4 : gérer le paiement confirmé, en attente, annulé ou échoué ; proposer « Écouter maintenant » après vérification des droits serveur et actualisation du contenu autorisé.
- EV-3.5 : conserver l’extrait et l’écoute sans autoplay ; intégrer les commandes du lecteur existant à la présentation mobile, sans créer une seconde instance audio.

Zones concernées : fiches catalogue FR/EN, composants `checkout`, `itinerary-list`, `scene-player` et présentations de forfaits.

Critères de validation :

- L’extrait et l’action principale sont trouvables avant les longs textes et les avis sur téléphone.
- Un acheteur nouveau ou existant termine le parcours dans l’environnement de paiement de test et peut ensuite lancer l’écoute.
- Un simple retour depuis Stripe ne suffit pas à déclarer un achat réussi ; l’attente de confirmation offre une issue compréhensible.
- Un paiement annulé permet de revenir à la visite ; le rechargement ne provoque pas de nouvelle commande involontaire.
- La barre, le clavier, les zones sûres du téléphone et la bannière PWA ne masquent ni les commandes ni le contenu.
- Le changement de langue, les liens d’écoute, les droits d’accès et la carte LW restent fonctionnels.

## EV-4 — Retrouver et reprendre ses visites

Travaux :

- EV-4.1 : bibliothèque « Mes visites », avec reprise identifiable puis visites disponibles ; conserver l’accès à l’historique commercial s’il est présent.
- EV-4.2 : rendre la reprise locale exploitable par la bibliothèque, sans enregistrer d’URL audio signée et sans présenter la progression d’un autre compte après déconnexion/changement de compte.
- EV-4.3 : cartes avec actions Écouter/Reprendre, états vide et erreur utiles, lien de découverte, connexion avec retour à la bibliothèque.

Zones concernées : routes `mes-achats`, `mes-visites-content.tsx`, cartes de bibliothèque et état de reprise du lecteur.

Critères de validation : un achat confirmé est retrouvable ; la reprise ouvre la bonne visite, scène et langue lorsqu’elles sont encore disponibles ; une progression absente ou devenue invalide permet de commencer normalement ; les URL historiques restent utilisables ; les cartes s’adaptent sans texte tronqué bloquant.

## EV-5 — Affiner la découverte et l’aide

Travaux :

- EV-5.1 : filtres de langue, durée et prix/gratuité selon les données réellement disponibles ; compteur de résultats, effacement et état sans résultat.
- EV-5.2 : conserver recherche et filtres dans l’URL lors du retour depuis une fiche ; filtres compacts sur téléphone et accessibles au clavier.
- EV-5.3 : aide visiteur : compte commun avec l’application, achat, écoute web, langues, reprise et limites hors connexion. Harmoniser les messages de la fiche, des forfaits et du pied de page.

Zones concernées : `catalogue-view-cities.tsx`, `tour-list-filter.tsx`, pages d’aide FR/EN et pied de page.

Critères de validation : une URL filtrée retrouve les mêmes résultats ; le retour depuis une fiche conserve le choix ; aucun résultat vide ne laisse sans action ; les contenus d’aide correspondent aux capacités web effectivement livrées. Les thèmes sont différés si les données ne permettent pas un filtre fiable.

## Exigences mobiles communes à tous les lots

- Mise en page pilotée par la largeur disponible, sans détection du modèle de téléphone ni rechargement nécessaire lors d’un redimensionnement.
- Vérification aux largeurs 320, 360, 390, 430, 768, 1024 et 1440 pixels CSS. Parcours complets sur les formats représentatifs ; contrôle des limites et composants sur les autres.
- Une colonne sur petit écran quand nécessaire ; ordre de lecture et de tabulation cohérent avec l’ordre visuel.
- Aucun débordement horizontal de page ; carte contenue dans sa propre zone déplaçable.
- Corps et champs lisibles, titres fluides bornés, images adaptées avec dimensions réservées. Objectif ergonomique de 44 × 44 pixels CSS pour les actions principales.
- Navigation, achat et lecteur coordonnés ; prise en compte du bas de l’écran, du clavier et des bannières.
- Aucun contenu essentiel réservé au survol. Focus visible, libellés de champs, messages d’erreur annoncés et contrastes vérifiés.
- Français et anglais, longs titres, textes agrandis, portrait/paysage et zoom inclus dans la recette.
- Chargement différé de la carte et médias à la demande conservés. Mesurer avant/après dans les mêmes conditions et corriger les régressions introduites.

## EV-6 — Vérifier et préparer la livraison

### Contrôles au fil des lots

Tests ciblés des changements de logique : droits, destinations après connexion, inscription visiteur, états du paiement, reprise et filtres. Tests de composants pour les états interactifs et d’accessibilité pertinents. Captures de référence des écrans clés aux formats téléphone et ordinateur.

À la fin de chaque lot, consigner les fichiers modifiés, les critères satisfaits, les vérifications exécutées et les limites. Préparer des commits locaux en français, limités aux changements du lot ; préserver les modifications de contenu déjà présentes.

### Parcours de recette de fin

1. Nouveau visiteur : accueil → recherche → fiche → extrait sans compte → inscription et confirmation → achat de test → écoute.
2. Visiteur existant : connexion → Mes visites → reprise ; variante compte déjà utilisé dans l’application.
3. Échecs et récupération : mauvais mot de passe, compte non confirmé, confirmation expirée, paiement annulé, confirmation différée, session expirée et réseau interrompu.
4. Guide existant : connexion dans le contexte Studio puis dans le contexte visiteur ; droits conservés dans les deux parcours.
5. Parcours français et anglais sur téléphone ; navigation clavier et lecteur d’écran sur les écrans principaux.
6. Non-régression LW : lecture et enchaînement, reprise, langues, droits payants, carte avec permission GPS refusée/accordée, accueil hors connexion et mise à jour PWA sans interruption forcée.

### Exécution technique prévue

Depuis `TourGuideWeb` :

```powershell
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
npm run e2e
npx playwright test --config=playwright.pwa.config.ts
```

La suite E2E générale nécessite une configuration et des comptes de test opérationnels. La suite PWA utilise son serveur de production local selon sa configuration ; elle s’exécute après le build. Ne pas déclarer la recette réussie si une suite requise n’a pas pu démarrer. Ne pas réaliser d’achat réel pour ces tests.

Compléter sur Safari iPhone et Chrome Android physiques : clavier, rotation, gros texte, barre basse, démarrage audio par geste utilisateur, retour à l’application web et écran verrouillé. Distinguer les limites des plateformes d’une régression du site et les consigner.

### Mesure du parcours

Définir les événements avant EV-1 et les intégrer dans le lot concerné : découverte vers fiche, lancement d’extrait, début/succès de connexion ou inscription, début/confirmation d’achat, première écoute et reprise. Réutiliser les événements LW existants pour éviter les doublons. Respecter les mécanismes de consentement existants ; ne pas transmettre identifiants sensibles, mots de passe, URL signées ou coordonnées GPS précises.

Comparer mobile et ordinateur après livraison, avec une période et un volume explicités. Aucun objectif de gain de conversion chiffré n’est promis sans mesure initiale. Faire aussi réaliser les tâches principales à quelques personnes découvrant le site et relever hésitations et impasses.

## Jalons de livraison

| Jalon | Contenu | Condition de sortie |
| --- | --- | --- |
| A — Accès visiteur | Étape 0 + EV-1 | Compte visible, inscription/connexion et retours validés sur téléphone |
| B — Parcours principal | EV-2 + EV-3 | Découverte, achat de test et première écoute complets |
| C — Retour et découverte | EV-4 + EV-5 | Reprise et catalogue validés, aide harmonisée |
| D — Version prête | EV-6 | Contrôles requis réussis, preuves et limites consignées |

Le travail se prépare localement. Aucun push ni déploiement n’est inclus dans cette demande de plan. Lorsqu’une mise en ligne sera autorisée, identifier le commit de livraison, conserver la version précédente comme retour arrière, puis vérifier sur HTTPS les parcours critiques et le service worker. Un retour arrière du site doit tenir compte du cycle de mise à jour PWA ; ne pas supposer que tous les clients changent immédiatement de version.

## Points à résoudre pendant la préparation

- Compatibilité effective de l’inscription visiteur avec la configuration Cognito et ses éventuels déclencheurs.
- Configuration de la recette E2E et disponibilité des comptes et moyens de paiement de test.
- Données réellement exposées pour les filtres, durée, distance et progression locale.
- Accès aux téléphones physiques pour la recette finale et vérification ultérieure sur le domaine public.

Ces points n’empêchent pas de préparer les écrans et les composants. Ils conditionnent les validations concernées et doivent être rendus visibles dans le suivi. Le chiffrage pourra être affiné après l’étape 0 ; les lots et critères ci-dessus constituent l’ordre de travail dès maintenant.
