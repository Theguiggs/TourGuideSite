# TourGuideWeb — Portail Guide & Administration

Portail web Next.js pour les guides touristiques et l'administration de TourGuide. Permet aux guides de créer, enregistrer, éditer et soumettre leurs tours audio, et aux administrateurs de modérer le contenu.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16.1.6 · App Router |
| Frontend | React 19 · TypeScript 5 · Tailwind CSS 4 |
| Backend | AWS Amplify 6.16 (Cognito + AppSync + S3) |
| State | Zustand 5 |
| Cartes | Leaflet 1.9 · React-Leaflet 5 |
| Paiements | Stripe |
| Tests | Jest 30 · Playwright 1.58 |
| Microservice | Python (TTS, traduction, détection silence) |

## Architecture

```
TourGuideWeb/
├── src/
│   ├── app/              # Pages Next.js (App Router)
│   │   ├── catalogue/    # Catalogue public (villes, tours)
│   │   ├── guide/        # Espace guide (profil, dashboard, studio)
│   │   ├── admin/        # Administration (modération, analytics, guides)
│   │   └── guides/       # Pages publiques des guides
│   ├── components/       # 8 composants partagés
│   ├── lib/
│   │   ├── api/          # Couche AppSync (16 modules)
│   │   ├── stores/       # 9 stores Zustand
│   │   ├── studio/       # Services studio (recorder, player, prompter, mixer…)
│   │   ├── multilang/    # Traduction batch, i18n, staleness
│   │   ├── amplify/      # Config Amplify + SSR utils
│   │   └── auth/         # Contexte authentification
│   ├── hooks/            # use-auto-save, use-auto-refund
│   ├── config/           # api-mode.ts (stubs vs real)
│   └── types/            # guide, moderation, studio, tour
├── microservice/         # Python (TTS, traduction, silence detection)
├── content/tours/        # Packages de tours premium
├── e2e/                  # Tests Playwright
├── scripts/              # Seeds, photos, TTS reference
└── docs/                 # Plans de test, sanity checks
```

## Routes principales

### Public
| Route | Description |
|-------|-------------|
| `/` | Page d'accueil |
| `/catalogue` | Catalogue des tours par ville |
| `/catalogue/[city]` | Tours d'une ville |
| `/catalogue/[city]/[tourSlug]` | Détail d'un tour |
| `/guides/[guideSlug]` | Page publique d'un guide |

### Espace Guide
| Route | Description |
|-------|-------------|
| `/guide/login` | Connexion guide |
| `/guide/signup` | Inscription guide |
| `/guide/profile` | Profil guide |
| `/guide/dashboard` | Tableau de bord |
| `/guide/revenue` | Revenus |
| `/guide/tours/[tourId]/reviews` | Avis sur un tour |
| `/guide/studio` | Liste des sessions studio |
| `/guide/studio/[sessionId]` | Session studio (détail) |
| `/guide/studio/[sessionId]/edit` | Éditeur de texte |
| `/guide/studio/[sessionId]/general` | Infos générales |
| `/guide/studio/[sessionId]/itinerary` | Éditeur d'itinéraire |
| `/guide/studio/[sessionId]/photos` | Gestion photos |
| `/guide/studio/[sessionId]/preview` | Prévisualisation |
| `/guide/studio/[sessionId]/record` | Enregistrement audio |
| `/guide/studio/[sessionId]/scenes` | Gestion des scènes |
| `/guide/studio/[sessionId]/submission` | Soumission pour modération |

### Administration
| Route | Description |
|-------|-------------|
| `/admin/analytics` | Analytics et funnel |
| `/admin/guides` | Gestion des guides |
| `/admin/guides/[guideId]` | Détail d'un guide |
| `/admin/moderation` | File de modération |
| `/admin/moderation/[moderationId]` | Détail modération |
| `/admin/moderation/history` | Historique modération |
| `/admin/tours` | Gestion des tours |
| `/admin/tours/[tourId]` | Détail d'un tour |

## Démarrage rapide

### Mode stub (développement local)

```bash
cd c:\Projects\Bmad\TourGuideWeb
echo "NEXT_PUBLIC_USE_STUBS=true" > .env.local
npm install
npm run dev
```

Application disponible sur **http://localhost:3000**

### Mode API réelle (AWS)

Créer `.env.local` à partir de `.env.example` avec les vraies valeurs AWS, puis `npm run dev`.

## Commandes

| Commande | Usage |
|----------|-------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Démarrer le build de production |
| `npm run test` | Tests Jest (~399 tests, 50 suites) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |
| `npm run seed` | Initialiser la base de données |
| `npm run e2e` | Tests Playwright |
| `npm run e2e:ui` | Playwright en mode UI |
| `npm run e2e:report` | Rapport Playwright |

## Microservice Python

Le dossier `microservice/` contient un serveur Python pour les traitements lourds :
- **TTS** : Synthèse vocale
- **Traduction** : Traduction multilingue
- **Détection de silence** : Analyse audio

```bash
cd microservice
pip install -r requirements.txt
python local_server.py
```

## PWA & Favicons

Le portail web TourGuide expose un `manifest.json` PWA et 5 assets favicons (SVG + 3 PNG + apple-touch-icon + ICO legacy). La source de vérité visuelle est le composant `<PinNegatif>` du package `@tourguide/design-system` (Story 2.4).

### Source des assets

Les binaires `public/favicon.svg`, `public/favicon-32.png`, `public/favicon-192.png`, `public/favicon-512.png`, `public/apple-touch-icon-180.png` et `public/favicon.ico` sont **produits par le pipeline Story 3.1** (`design-system/scripts/export-pinnegatif.ts`). Aucun de ces fichiers ne doit être modifié à la main — toute modification graphique passe par `<PinNegatif>` + re-run du pipeline.

### Procédure de re-export après modif `<PinNegatif>`

```bash
# 1. Régénérer les binaires depuis le composant DS
cd design-system
npm run tg:export-icons -- --variant light --output-dir ../assets/icons

# 2. Copier vers TourGuideWeb/public/ (voir docs/favicon-setup.md pour la liste)
# 3. Convertir favicon-32.png → favicon.ico
npx png-to-ico assets/icons/favicon-32.png > TourGuideWeb/public/favicon.ico
```

Détails complets : [`docs/favicon-setup.md`](../docs/favicon-setup.md).

### Pourquoi 5 fichiers ?

| Fichier | Pourquoi |
|---------|----------|
| `favicon.svg` | Vectoriel moderne — Chrome/Firefox/Safari récents, scaling parfait |
| `favicon-32.png` | Fallback PNG petite taille pour onglets navigateur |
| `favicon.ico` | Legacy IE/anciens navigateurs + safety net |
| `favicon-192.png` / `favicon-512.png` | Icônes PWA Android (manifest.json) — 512 utilisée pour adaptive icon maskable |
| `apple-touch-icon-180.png` | "Add to Home Screen" iOS Safari (PNG opaque sans alpha) |

### Fichiers à NE PAS toucher manuellement

- `public/favicon.svg`, `public/favicon-32.png`, `public/favicon-192.png`, `public/favicon-512.png`, `public/apple-touch-icon-180.png`, `public/favicon.ico`
- Les balises `<link rel="icon">` dans `<head>` — gérées automatiquement par Next.js Metadata API via `src/app/layout.tsx` (`metadata.icons` + `viewport.themeColor`)

### Manifest PWA

`public/manifest.json` déclare TourGuide comme app installable :
- `theme_color: #C1262A` (grenadine, alignée sur `tg.colors.grenadine`)
- `background_color: #F4ECDD` (paper)
- `display: standalone` (masque la barre URL en mode app)
- `start_url: /` (requis Lighthouse PWA)

Score Lighthouse PWA cible : **≥ 90** (sans service worker, qui est out-of-scope V1.0 — Phase B).

## Lien avec TourGuide Mobile

Ce projet est le portail web compagnon de [TourGuide](https://github.com/Theguiggs/TourGuide) (React Native). Les deux partagent le même backend AWS Amplify (Cognito, AppSync, S3).

## Documentation

| Document | Chemin |
|----------|--------|
| Guide utilisateur | `USERGUIDE.md` |
| Plan de test E2E (ISTQB) | `docs/plan-de-test-e2e-istqb.md` |
| Sanity check | `docs/guide-sanity-check.md` |
| Tests backend | `bmad/test-manuel-backend-persistence.md` |
| Tests E2E | `e2e/README.md` |
| Tours premium | `content/tours/README.md` |
