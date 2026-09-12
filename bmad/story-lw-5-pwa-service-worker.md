# Story LW-5 : PWA installable pour de vrai

Status: draft

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
