# Spécification EV-1 — Connexion et inscription visiteur

Date : 13 septembre 2026 ; écrite avant implémentation. Source : plan-experience-visiteur.md.

## Intention et périmètre

Livrer les accès publics FR/EN et une navigation reconnaissable. Ajouter `/connexion`, `/inscription`, `/mot-de-passe-oublie` et leurs variantes `/en/sign-in`, `/en/sign-up`, `/en/reset-password`. Conserver les pages historiques guide pour le contexte Studio ; les liens publics utilisent les nouvelles pages. Les visiteurs déjà authentifiés peuvent continuer ou changer de compte explicitement.

L’inscription demande uniquement email et mot de passe. Après confirmation, demander la connexion dans le même écran, destination conservée ; ne pas conserver un mot de passe pendant la saisie du code, ni dans une URL ou le stockage. Le compte non confirmé à la connexion rejoint la saisie/renvoi du code. Aucun changement de schéma, de Lambda, de paiement ou de moteur audio prévu.

## Carte du code initial

- `src/components/Header.tsx:45` : navigation commune ; entrée guide et achats conditionnés à la session.
- `src/components/SiteChrome.tsx:18` : choix de langue, shell public et exclusion du Studio.
- `src/lib/auth/auth-context.tsx:46` : contrat de connexion ; `:100` reconnaissance tourist sans GuideProfile ; résultat Amplify à contrôler avant résolution de session.
- `src/lib/auth/return-to.ts:18` : validation et URL historique de connexion.
- `src/lib/auth/cognito-errors.ts:65` : messages Cognito actuellement français.
- `src/lib/i18n/public-routes.ts:17` : correspondance FR/EN.
- `src/app/guide/signup/page.tsx:156` : inscription guide et création explicite de profil, conservées.
- `src/components/catalogue/mes-visites-content.tsx:76` : lien public vers connexion.
- `src/app/mes-achats/page.tsx` et `src/app/en/my-purchases/page.tsx` : intitulés à aligner sur Mes visites, bibliothèque EV-4 différée.
- `../TourGuideApp/amplify/auth/resource.ts:10` : email obligatoire, aucun déclencheur déclaré. Lecture du code uniquement ; l’état déployé sera vérifié séparément si accessible sans modification.

## Matrice d’entrée et de bord

| Entrée | Résultat attendu |
| --- | --- |
| Connexion publique sans retour, tout rôle | Bibliothèque dans la langue courante ; Studio accessible séparément |
| Connexion depuis fiche avec query et ancre | Retour à la même fiche et au même contexte |
| Lien historique guide | Destination par rôle et retour explicite existants conservés |
| Retour externe, encodé dangereux, chemin normalisé vers auth | Refus, repli bibliothèque |
| Inscription nouvelle | Cognito uniquement, confirmation, puis connexion |
| Email existant | Message neutre et liens connexion/récupération |
| Connexion compte non confirmé | Saisie de code et renvoi possibles sans recréer de compte |
| Code invalide ou expiré | Erreur traduite, nouvelle tentative/renvoi disponibles |
| Mot de passe à réinitialiser | Récupération avec destination conservée |
| Récupération email inconnu | Même écran de saisie du code que pour email connu |
| Étape Cognito supplémentaire non gérée | Message explicite, aucun succès ni droits supposés |
| Erreur résolution AppSync après connexion | Erreur récupérable, formulaire déverrouillé |
| Double clic | Une requête en cours, actions désactivées |
| Compte déjà connecté | Continuer, accès créateur selon droits, déconnexion explicite |
| Langue changée dans auth | Mode et retour conservés dans les liens ; aucun secret transféré |

## Tâches et validation

1. Documenter les écrans de référence et les routes de recette.
2. Ajouter les routes/formulaire visiteur et helpers d’URL ; traduire les erreurs sans exposer les erreurs brutes.
3. Traiter les nextStep Amplify sans casser les utilisateurs historiques du contexte d’authentification.
4. Adapter le header et la navigation mobile, aligner les liens de bibliothèque. Préserver query et ancre au clic vers la connexion.
5. Tester transitions, retours hostiles, erreurs et navigation ; vérifier les formats dans un navigateur de test avec Cognito simulé.
6. Typecheck, lint, Jest, build et revues indépendantes ; corriger et consigner les preuves. Ne pas déclarer la confirmation réelle d’email ni les téléphones physiques validés par des simulations.

## Présentation et accessibilité

Formulaire borné en largeur sur ordinateur, pleine largeur utile sur téléphone ; champs de taille body, libellés explicites, autocomplete et code à clavier numérique, erreurs annoncées, focus sur le titre lors d’une transition. Pas d’alignement vertical qui masque le haut avec le clavier ouvert. Commandes principales avec hauteur minimale 44 pixels. Sur les pages de compte, navigation basse masquée pour laisser la place au clavier ; l’en-tête conserve les accès publics. Sur les autres pages publiques, espace réservé à la navigation basse ; bannière PWA placée au-dessus.

Les maquettes filaires de préparation sont des références de hiérarchie, sans promesse de données ni de rendu final pour EV-2/3/4.
