# EV-1 — Entrée visiteur et compte commun

Statut : implemented — réalisé et vérifié en production locale ; confirmation réelle d’email et essais sur téléphones physiques restants. Dépendance : socle LW local.

En tant que visiteur, je veux trouver où me connecter, créer un compte sans devenir guide et revenir à la visite choisie sur téléphone comme sur ordinateur.

Spécification : [spec-ev-1](../docs/spec-ev-1-acces-visiteur.md). Plan : [expérience visiteur](../docs/plan-experience-visiteur.md).

## Acceptation

- Connexion et Mes visites visibles avant authentification, navigation adaptée à la largeur.
- Pages FR/EN de connexion, inscription avec confirmation/renvoi de code et récupération de mot de passe.
- Un compte commun à l’application ; aucun GuideProfile créé par l’inscription visiteur.
- Conservation de la destination et de la langue ; rejet des destinations externes et boucles de connexion.
- Comptes non confirmés, erreurs réseau, codes invalides/expirés et réinitialisation imposée avec issue utilisable.
- Accès Studio historique conservé, droits serveur et lecteur LW inchangés.
- Contrôles automatisés, revue indépendante et limites de recette consignés avant commit local.

## Livraison

EV-2 à EV-6 restent planifiés. Aucun push ni déploiement.

Vérification : 285 suites / 2485 tests Jest ; typecheck et lint sans erreur ; build de production réussi ; Playwright visiteur 3/3, PWA 2/2. Détails et limites : [revue](revue-ev-1.md).

Fichiers :

- Six nouvelles pages `src/app/{connexion,inscription,mot-de-passe-oublie}/page.tsx` et `src/app/en/{sign-in,sign-up,reset-password}/page.tsx`.
- `src/components/auth/{visitor-auth,visitor-bottom-nav}.tsx` et tests du formulaire.
- `src/lib/auth/{visitor-routes,use-visitor-return}.ts`, `auth-context.tsx`, `cognito-errors.ts`, `return-to.ts` et tests de routes/étapes.
- `src/components/{Header,SiteChrome,CookieConsentBanner}.tsx`, test Header et `src/components/pwa/pwa-registration.tsx`.
- `src/app/globals.css`, fiche `src/app/catalogue/[city]/[tourSlug]/page.tsx` (placement de la barre mobile uniquement).
- Pages `mes-achats`, `en/my-purchases` et `src/components/catalogue/mes-visites-content.tsx`.
- `src/lib/{analytics.ts,i18n/public-routes.ts}`.
- `e2e/tests/visitor-auth.spec.ts`, `playwright.visitor.config.ts`, exclusions dans `playwright.config.ts` et `eslint.config.mjs`.
- Analyse, plan, cadrage, maquettes filaires, spécification et captures dans `docs/`.
