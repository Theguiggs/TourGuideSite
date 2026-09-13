# PWA Murmure

LW-5 conserve uniquement un accueil hors ligne, des icônes, une police publique et les ressources immuables Next. Les pages de visite/compte/Studio ne sont jamais enregistrées dans CacheStorage. Aucun audio hors ligne, aucune API en cache, aucun suivi GPS en arrière-plan.

## Mise à jour

À chaque publication qui doit proposer un rechargement, changer `VERSION` dans `public/sw.js`. La modification du worker déclenche une nouvelle installation et son précache. Elle reste en attente jusqu’au clic « Recharger ». L’activation ne recharge que l’onglet où ce clic a lieu ; le cache statique partagé reste disponible pour les autres onglets. Un fichier à modifier dans le shell exige également de changer VERSION. Le cache statique est borné à 120 entrées et les fichiers Next portent leurs propres empreintes.

Le script est servi avec `Cache-Control: no-cache` par Next et Caddy ; enregistrement avec `updateViaCache: none`. L’enregistrement est actif en production, désactivé en développement sauf `NEXT_PUBLIC_PWA_TEST=true`. Les refus navigateur ne bloquent pas le site.

## Vérification locale

1. `npm run build`
2. `npx playwright test --config playwright.pwa.config.ts --reporter=list`

La configuration lance un serveur de production local sur 3100. Le test actualise temporairement la version de `public/sw.js` puis restaure le fichier dans `finally` ; ne pas lancer simultanément une autre publication ou une modification de ce fichier. La capture mobile du manifest est régénérée depuis /hors-ligne. Les tests PWA sont exclus de la configuration générale qui utilise un serveur de développement et les comptes E2E.

Le test vérifie installation Chrome, absence de cache privé, hors ligne fr/en, icône disponible, réessai avec paramètres conservés, bannière pendant une lecture WAV réelle et absence de rechargement de l’autre onglet. Le média est silencieux, sans compte distant.

## Après déploiement

Vérifier en HTTPS que /sw.js répond **200 JavaScript**, avec **no-cache**, que le scope est /, que les icônes et screenshot répondent 200 et que les deux parcours hors ligne fonctionnent dans un profil neuf. Contrôler l’installabilité dans Chrome Application/CDP ; la catégorie PWA Lighthouse a été retirée ([Lighthouse 12](https://github.com/GoogleChrome/lighthouse/releases/tag/v12.0.0)). Tester une mise à jour depuis la version précédente sans interruption d’une écoute en cours, puis le choix explicite de recharger.

Le 13 septembre 2026, la vérification en lecture seule depuis le VPS a reçu 404 pour /sw.js public. La livraison locale n’a pas été publiée. Les essais physiques Android/iOS, installation sur appareil et écran verrouillé restent non exécutés.

La police publique `display.woff2` est le sous-ensemble DM Serif Display déjà téléchargé par next/font pour le site. Sa licence SIL OFL est jointe dans `public/pwa/OFL.txt` ([source Google Fonts](https://github.com/google/fonts/tree/main/ofl/dmserifdisplay)).
