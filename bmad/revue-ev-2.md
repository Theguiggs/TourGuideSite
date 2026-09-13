# Revue EV-2 — Accueil visiteur

Date : 13 septembre 2026. Développement et vérification locaux ; aucun push ni déploiement.

## Résultat

Accueil FR/EN avec recherche de ville, lien Mes visites, destinations et trois suggestions issues du catalogue publié. Chargement des suggestions isolé par Suspense : le titre et le formulaire ne dépendent pas de leur résultat. Une liste vide ou une erreur laisse un accès au catalogue.

La recherche GET initialise le catalogue et reste utilisable sans JavaScript. Le catalogue peut aussi soumettre une nouvelle recherche nativement. Les pages de création sont accessibles en FR/EN ; l’accès au Studio et à l’inscription historiques reste disponible, avec la langue transmise au Studio lors du clic.

Titres, descriptions, images de partage, routes de langue, sitemap et pied de page sont alignés. Aucune donnée, vente, note ou statistique fictive n’a été ajoutée. Les visites sont présentées par titres et blocs colorés selon le système visuel Murmure.

## Trois revues indépendantes

Constats corrigés :

- Le lien Studio renvoyait un guide déjà connecté au formulaire de connexion. Il cible maintenant `/guide/studio`, dont le contrôle d’accès gère les personnes déconnectées.
- Une phrase promettait de retrouver toute écoute gratuite dans Mes visites, alors que cette bibliothèque liste actuellement les achats. Elle a été reformulée sans promettre cet ajout.
- Le filtrage défensif vérifie explicitement le type des slugs avant comparaison et tri.
- Le lien d’écoute mémorisée utilisait `#ecouter`, qui peut lancer le lecteur lorsqu’une ancienne scène n’est plus disponible. Il utilise désormais l’ancre neutre `#itineraire`, sans déclenchement audio.
- Les accents et tirets de quatre textes alternatifs OG avaient été altérés par l’encodage du terminal. Ils ont été corrigés et les balises produites font partie de la recette navigateur.

## Ajustements issus des tests

- Axe a détecté le contraste insuffisant du badge Gratuit hérité : texte en encre sur fond olive doux. Le numéro de version du pied de page a également été rendu plus lisible.
- Le montant du badge de prix utilise désormais la locale reçue.
- La garde SEO qui cherchait une déclaration de titre directement dans le fichier page a été adaptée à la fonction commune de métadonnées. Elle continue d’exiger un titre absolu contenant une seule fois la marque ; le navigateur vérifie aussi le titre réellement servi.
- Le test natif initial supposait qu’Èze était présente dans le catalogue vivant. Cette destination n’y était pas disponible pendant l’essai ; la recette utilise Nice avec une saisie accentuée pour vérifier le pliage des accents sans modifier les données.

## Vérifications et limites

Régression EV-1 relancée : deux scénarios compte réussissent ; le troisième échoue à l’ouverture d’une fiche depuis une carte de Nice, puis échoue encore lors d’une relance ciblée. La trace montre le titre et la navigation, mais un contenu principal vide ; aucun bouton de lecture n’apparaît en 60 secondes. Les réponses RSC de préchargement observées sont partielles ; la cause n’est pas établie. Le scénario EV-2 d’accès à une fiche depuis la reprise réussit. Cet écart reste ouvert et doit être traité en priorité dans EV-3 ; la recette globale n’est pas déclarée entièrement verte.

La suite complète Jest a réussi : 288 suites, 2497 tests, 131,892 secondes. Les tests couvrent notamment la sélection publiée/dédupliquée, les données malformées, le repli d’API, la reprise périmée ou illisible, la purge à la déconnexion, la recherche initiale et les ancres de l’aide créateur.

Compilation de production, lint et vérification TypeScript : réussis. Recette navigateur EV-2 : quatre scénarios réussis en 23,7 secondes. Vérification des largeurs 320, 360, 390, 430, 768, 1024 et 1440 pixels sans débordement horizontal ; recherche visible au premier écran, soumission sans JavaScript, métadonnées et images OG servies, reprise sans autoplay. Axe ne remonte aucune violation sur les accueils et pages créateur FR/EN contrôlés.

Captures inspectées : [accueil FR téléphone](../docs/verification-ev2/accueil-fr-mobile.png), [accueil FR ordinateur](../docs/verification-ev2/accueil-fr-ordinateur.png), [accueil EN téléphone](../docs/verification-ev2/accueil-en-mobile.png), [accueil EN ordinateur](../docs/verification-ev2/accueil-en-ordinateur.png).

La recette utilise le catalogue distant existant en lecture seule, sans semis ni nouveau compte. Les comptes E2E historiques restent indisponibles comme documenté dans EV-1 ; aucune connexion réelle ni aucun paiement n’est revendiqué ici. Les essais sur iPhone/Android physiques et le domaine public restent à effectuer après les étapes correspondantes. La fiche et le paiement complets restent EV-3.

Reproduction : `npm run build`, puis `npx playwright test --config=playwright.home.config.ts`. La configuration démarre un serveur local sur le port 3102.
