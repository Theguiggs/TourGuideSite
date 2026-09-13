# Story LW-5 : PWA installable pour de vrai

Status: implemented — validée en production locale ; contrôle après déploiement public restant

<!-- Épopée LW. Indépendante des autres stories. -->

## Story

En tant que **visiteur qui a ajouté Murmure à son écran d'accueil**,
je veux **que le site s'ouvre vite, et proprement même sans réseau**,
afin de **ne pas tomber sur la page d'erreur du navigateur en sortant du métro**.

## Contexte vérifié (2026-09-12)

- `public/manifest.json` : complet (icônes 192/512, maskable, standalone). Manque : `id`, `scope`, `orientation`, et l'entrée `screenshots` que Chrome exige pour sa fiche d'installation riche.
- Aucun service worker. `layout.tsx` référence le manifest.
- La CSP est calculée par requête avec nonce (`src/proxy.ts`, `csp.ts`) : le script d'enregistrement du SW doit porter le nonce ; le fichier `sw.js` lui-même est servi depuis `self`, donc autorisé.
- `output: 'standalone'` et déploiement Docker + Caddy : `sw.js` doit être servi avec `Cache-Control: no-cache` pour que les mises à jour se propagent.

## Acceptance Criteria

1. **Service worker** à la racine (`/sw.js`), écrit à la main ou via Serwist (décision au démarrage, documentée) : précache de l'app shell (icônes, polices, page `/hors-ligne`), stratégie réseau d'abord pour les pages, cache d'abord pour les assets `_next/static`.
2. **Jamais de cache** sur : AppSync, Cognito, Stripe, les URLs S3 signées (audio et photos). Test qui vérifie la liste d'exclusion.
3. **Page `/hors-ligne`** en fr et en, dans le ton du site, qui propose de réessayer.
4. **Mise à jour** — quand un nouveau SW est prêt, un bandeau discret « Nouvelle version, recharger ». Pas de rechargement forcé en cours d'écoute.
5. **Manifest complété** (`id`, `scope`, `screenshots` mobile), balises iOS (`apple-mobile-web-app-capable`, icône 180 déjà présente).
6. **Lighthouse « installable »** vert en production ; `Cache-Control: no-cache` sur `sw.js` vérifié sur le VPS (Caddy).
7. **E2E** — Playwright : couper le réseau, naviguer, obtenir `/hors-ligne` ; ne pas casser la suite existante.

## Hors périmètre

- Cache de l'audio (voir l'épopée). Push. Synchronisation en arrière-plan.

## Livraison — 13 septembre 2026

Service worker manuel /sw.js, shell autonome sans script en fr/en, icônes et police locale précachées, ressources Next publiques mises en cache à la demande (120 maximum). Aucune page consultée conservée ; API, RSC, images optimisées et médias signés exclus. Mise à jour proposée par bandeau, activation et rechargement sur geste uniquement, autres onglets préservés. Manifest complété, vraie capture mobile du shell et balises iOS. Enregistrement client via les scripts Next déjà autorisés par nonce ; aucun script inline supplémentaire.

Les pages /hors-ligne et /en/hors-ligne sont des réécritures vers du HTML public autonome, pour éviter de conserver un HTML Next personnalisé ou porteur d’un nonce. Les navigations sont réseau d’abord puis repli localisé ; pas de catalogue ni d’audio hors ligne. Le lien Réessayer conserve les paramètres d’URL.

AC 6 adapté : le contrôle PWA a disparu de Lighthouse 12 ([source officielle](https://github.com/GoogleChrome/lighthouse/releases/tag/v12.0.0)). Chrome CDP retourne zéro erreur d’installabilité sur le build de production local. /sw.js répond 200 avec no-cache localement. Vérification HTTPS depuis le VPS : 404 sur la version publique actuelle, qui n’a pas été déployée. **L’acceptation après déploiement public reste ouverte.** Aucun push ni changement du VPS effectué.

Revues et preuves : [revue-lw-5.md](revue-lw-5.md). Exploitation : [docs/pwa.md](../docs/pwa.md).
