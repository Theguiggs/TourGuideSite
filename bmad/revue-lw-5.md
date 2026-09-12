# LW-5 — revues et preuves

13 septembre 2026. Base 12c77692. Spécification préalable dans le workspace parent. Trois relectures indépendantes sans historique : manques, cas limites, preuves.

## Corrections

- Réessayer utilisait un formulaire GET vide qui supprimait returnTo et les autres paramètres. Remplacé par un lien natif ; E2E réseau coupé puis rétabli vérifie l’URL complète.
- Lecture des ressources statiques rendue tolérante à un CacheStorage indisponible : le réseau reste essayé.
- Suite PWA isolée de la suite habituelle, dont le port et le mode de serveur diffèrent.
- Preuves ajoutées pour private/no-store, réponses redirigées/500, différence 404/503 en navigation, borne de 120 ressources et conservation du cache statique à l’activation.
- Mise à jour E2E enrichie d’une lecture audio réelle : le son continue pendant l’affichage du bandeau ; aucun rechargement avant clic ni dans l’autre onglet après activation.
- Test historique des en-têtes corrigé pour chercher la règle globale par son chemin au lieu de sa position ; test dédié des en-têtes /sw.js ajouté.

Les contre-relectures ne signalent plus de défaut concret dans leurs périmètres.

## Résultats

Build Next de production réussi, TypeScript inclus. Playwright de production locale : **2/2 verts en 10,4 s**. Chrome CDP : aucune erreur d’installabilité. Axe du shell mobile : aucune violation. /sw.js : 200 et Cache-Control no-cache. Deux langues hors réseau, icône servie sans réseau, paramètres du réessai conservés, mise à jour avec audio réel et second onglet préservé. Capture mobile inspectée visuellement et versionnée dans le manifest.

Tests PWA ciblés : **21/21 verts**. Validation globale finale : **282 suites / 2 450 tests verts**, 107,048 s ; TypeScript et ESLint sans erreur ; diff vérifié. Cette suite inclut les dix tests LW-4 finaux et tous les lecteurs LW-1/LW-2/LW-3/LW-6.

La tentative de collecte de la suite E2E générale reste bloquée par APPSYNC_API_ID absent dans ses fixtures ; les problèmes de comptes Cognito de LW-6 ne sont pas résolus par cette story. Aucune donnée distante créée.

VPS vérifié en lecture seule par SSH puis requête HTTPS : /sw.js public répond **404**, derrière Caddy. La configuration locale no-cache est livrée mais sa validation sur la version publique déployée reste à faire. Aucun déploiement ni push. Aucune validation physique mobile/écran verrouillé revendiquée.
