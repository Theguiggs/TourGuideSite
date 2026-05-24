# TourGuideWeb — Portail Guide, Studio & Administration

Portail web Next.js compagnon de [TourGuideApp](../TourGuideApp/). Permet aux guides de créer, enregistrer, éditer et soumettre leurs tours audio, et aux administrateurs de modérer le contenu. Embarque un **microservice Python** local pour TTS, traduction et détection de silence.

---

## 1. Prérequis machine

| Outil | Version | Notes |
| ----- | ------- | ----- |
| **Node.js** | ≥ 20 | LTS recommandé |
| **npm** | ≥ 10 | livré avec Node |
| **Python** | 3.11+ | Microservice TTS + traduction |
| **pip** | dernière | livré avec Python |
| **Git** | ≥ 2.40 | |

Vérification rapide :

```powershell
node -v          # v20.x+
python --version # 3.11+
```

---

## 2. Installation Next.js

```powershell
cd c:\Projects\Bmad\TourGuideWeb
npm install
```

### Configuration (.env.local)

Deux modes possibles :

**Mode stub (par défaut en dev local)** — pas besoin d'AWS :

```powershell
"NEXT_PUBLIC_USE_STUBS=true" | Out-File -Encoding ascii .env.local
```

**Mode API réelle** — copier `.env.local.example` puis renseigner :

```powershell
Copy-Item .env.local.example .env.local
```

Variables principales :

| Variable | Usage |
| -------- | ----- |
| `NEXT_PUBLIC_USE_STUBS` | `true` pour stubs locaux, sinon AppSync réel |
| `NEXT_PUBLIC_AWS_REGION` | Région Amplify |
| `NEXT_PUBLIC_USER_POOL_ID` / `NEXT_PUBLIC_USER_POOL_CLIENT_ID` | Cognito |
| `NEXT_PUBLIC_APPSYNC_URL` / `NEXT_PUBLIC_APPSYNC_API_KEY` | AppSync |
| `NEXT_PUBLIC_S3_BUCKET` | Bucket S3 |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Paiements |
| `NEXT_PUBLIC_MICROSERVICE_URL` | URL du microservice Python (par défaut `http://localhost:8000`) |
| `NEXT_PUBLIC_MICROSERVICE_API_KEY` | Clé API du microservice (`tourguide-tts-2026` en local) |

---

## 3. Lancer le serveur Next.js

```powershell
npm run dev
```

Application disponible sur **http://localhost:3000**.

| Commande | Usage |
| -------- | ----- |
| `npm run dev` | Serveur de développement (hot reload) |
| `npm run build` | Build de production |
| `npm run start` | Démarrer le build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm run test` | Tests Jest (~399 tests, 50 suites) |
| `npm run e2e` | Tests Playwright E2E |
| `npm run e2e:ui` | Playwright en mode UI |
| `npm run e2e:report` | Rapport Playwright |
| `npm run seed` | Initialiser la base de données |

---

## 4. Routes principales

### Public

| Route | Description |
| ----- | ----------- |
| `/` | Page d'accueil |
| `/catalogue` | Catalogue des tours par ville |
| `/catalogue/[city]` | Tours d'une ville |
| `/catalogue/[city]/[tourSlug]` | Détail d'un tour |
| `/guides/[guideSlug]` | Page publique d'un guide |

### Espace Guide

| Route | Description |
| ----- | ----------- |
| `/guide/login` · `/guide/signup` | Auth guide |
| `/guide/profile` · `/guide/dashboard` · `/guide/revenue` | Compte & revenus |
| `/guide/tours/[tourId]/reviews` | Avis d'un tour |
| `/guide/studio` | Liste des sessions studio |
| `/guide/studio/[sessionId]` | Détail session |
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
| ----- | ----------- |
| `/admin/analytics` | Analytics et funnel |
| `/admin/guides` · `/admin/guides/[guideId]` | Gestion des guides |
| `/admin/moderation` · `/admin/moderation/[moderationId]` · `/admin/moderation/history` | File de modération |
| `/admin/tours` · `/admin/tours/[tourId]` | Gestion des tours |

---

## 5. Microservice Python (TTS + Traduction + Silence)

Le dossier `microservice/` contient un serveur **FastAPI** qui expose :

| Endpoint | Rôle | Implémentation |
| -------- | ---- | -------------- |
| `GET  /health` | Sonde de santé | — |
| `POST /v1/tts/generate` | Synthèse vocale (texte → WAV base64) | **edge-tts** (Microsoft, gratuit, sans GPU) |
| `POST /v1/translate/marianmt` | Traduction FR ↔ EN/IT/DE/ES | **MarianMT** (Helsinki-NLP, CPU) |
| `POST /v1/silence-detect` | Détection de silences dans un audio S3 | **pydub** |

Langues TTS supportées : `fr · en · it · de · es · ja · ko · zh · ru`.
Paires de traduction : `fr↔en`, `fr↔it`, `fr↔de`, `fr↔es`.

### 5.1 — Lancement (Windows / PowerShell)

```powershell
cd c:\Projects\Bmad\TourGuideWeb\microservice
.\start-local.ps1
```

Le script :

1. crée un venv `.venv/` si absent,
2. installe `torch` (CPU) puis `fastapi`, `uvicorn`, `edge-tts`, `transformers`, `pydub`, `soundfile`…,
3. exporte `MICROSERVICE_API_KEY=tourguide-tts-2026`,
4. démarre `uvicorn` sur **http://localhost:8000**.

### 5.2 — Lancement manuel (toute plateforme)

```bash
cd microservice
python -m venv .venv
source .venv/bin/activate            # Linux/macOS
# .\.venv\Scripts\Activate.ps1       # Windows

pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install fastapi "uvicorn[standard]" edge-tts soundfile pydub requests transformers sentencepiece

export MICROSERVICE_API_KEY=tourguide-tts-2026
python -m uvicorn local_server:app --host 0.0.0.0 --port 8000
```

> Le fichier `requirements.txt` cible la version **GPU** (`main.py`, Qwen3-TTS). Pour le mode local CPU (`local_server.py`), utiliser les commandes ci-dessus ou `start-local.ps1`.

### 5.3 — Sanity check

```powershell
# Health
curl http://localhost:8000/health

# TTS (avec clé API)
curl -X POST http://localhost:8000/v1/tts/generate `
  -H "Content-Type: application/json" `
  -H "X-API-Key: tourguide-tts-2026" `
  -d '{"text":"Bonjour Paris","language":"fr"}'

# Traduction
curl -X POST http://localhost:8000/v1/translate/marianmt `
  -H "Content-Type: application/json" `
  -H "X-API-Key: tourguide-tts-2026" `
  -d '{"text":"Bonjour","source_lang":"fr","target_lang":"en"}'
```

### 5.4 — Exposition au mobile (TourGuideApp)

Pour que TourGuideApp consomme le microservice depuis un device Android :

```env
# Émulateur Android (alias vers l'hôte)
MICROSERVICE_URL=http://10.0.2.2:8000

# Device physique (LAN)
MICROSERVICE_URL=http://192.168.x.x:8000

# Demo / tunnel public
MICROSERVICE_URL=https://xxx.ngrok-free.app
```

### 5.5 — Docker (optionnel, GPU)

```bash
cd microservice
docker build -t tourguide-microservice .
docker run -p 8000:8000 -e MICROSERVICE_API_KEY=tourguide-tts-2026 tourguide-microservice
```

---

## 6. Stack technique

| Couche | Technologie |
| ------ | ----------- |
| Framework | Next.js 16.1.6 · App Router |
| Frontend | React 19 · TypeScript 5 · Tailwind CSS 4 |
| Backend | AWS Amplify 6.16 (Cognito + AppSync + S3) |
| State | Zustand 5 |
| Cartes | Leaflet 1.9 · React-Leaflet 5 |
| Paiements | Stripe |
| Tests | Jest 30 · Playwright 1.58 |
| Microservice | FastAPI · edge-tts · MarianMT · pydub |
| Design System | `@murmure/design-system` (file:./packages/design-system) |

---

## 7. Arborescence

```
TourGuideWeb/
├── src/
│   ├── app/              # Pages Next.js (App Router)
│   │   ├── catalogue/    # Catalogue public
│   │   ├── guide/        # Espace guide (profil, dashboard, studio)
│   │   ├── admin/        # Administration
│   │   └── guides/       # Pages publiques des guides
│   ├── components/       # Composants partagés
│   ├── lib/
│   │   ├── api/          # Couche AppSync + microservice-config.ts
│   │   ├── stores/       # 9 stores Zustand
│   │   ├── studio/       # Services studio (recorder, player, prompter, mixer…)
│   │   ├── multilang/    # Traduction batch, i18n, staleness
│   │   ├── amplify/      # Config Amplify + SSR utils
│   │   └── auth/         # Contexte authentification
│   ├── hooks/            # use-auto-save, use-auto-refund
│   ├── config/           # api-mode.ts (stubs vs real)
│   └── types/            # guide, moderation, studio, tour
├── microservice/         # Python (TTS, traduction, silence detection)
│   ├── local_server.py   # Variante CPU (edge-tts + MarianMT)
│   ├── main.py           # Variante GPU (Qwen3-TTS)
│   ├── services/         # tts_service, translation_service, silence_service
│   ├── start-local.ps1   # Lanceur Windows
│   └── Dockerfile        # Image GPU
├── packages/design-system/ # DS local (alias @murmure/design-system)
├── content/tours/        # Packages de tours premium
├── e2e/                  # Tests Playwright
├── scripts/              # Seeds, photos, TTS reference
└── docs/                 # Plans de test, sanity checks
```

---

## 8. PWA & Favicons

Le portail expose un `manifest.json` PWA et 5 assets favicons (SVG + 3 PNG + apple-touch-icon + ICO legacy). La source de vérité visuelle est le composant `<PinNegatif>` du package `@murmure/design-system` (Story 2.4). **Ne jamais modifier** les binaires `public/favicon*` à la main — toute modification passe par `<PinNegatif>` + re-run du pipeline.

### Re-export après modification de `<PinNegatif>`

```bash
cd design-system
npm run tg:export-icons -- --variant light --output-dir ../assets/icons
# puis copier vers TourGuideWeb/public/, et :
npx png-to-ico assets/icons/favicon-32.png > TourGuideWeb/public/favicon.ico
```

Détails complets : [`docs/favicon-setup.md`](../docs/favicon-setup.md).

| Fichier | Pourquoi |
| ------- | -------- |
| `favicon.svg` | Vectoriel — Chrome/Firefox/Safari récents |
| `favicon-32.png` | Fallback PNG petite taille |
| `favicon.ico` | Legacy IE / anciens navigateurs |
| `favicon-192.png` / `favicon-512.png` | Icônes PWA Android (manifest) |
| `apple-touch-icon-180.png` | iOS "Ajouter à l'écran d'accueil" |

Manifest PWA : `theme_color: #C1262A` (grenadine), `background_color: #F4ECDD` (paper), `display: standalone`, `start_url: /`. Score Lighthouse PWA cible : **≥ 90**.

---

## 9. Lien avec TourGuideApp

Ce projet est le portail web compagnon de [TourGuideApp](../TourGuideApp/). Les deux partagent :

- le **backend AWS Amplify** (Cognito, AppSync, S3),
- le **design system** `@murmure/design-system` (mais en consommation différente : `file:../design-system` côté mobile, `file:./packages/design-system` côté web),
- le **microservice TTS/traduction** (hébergé ici, consommé par les deux).

---

## 10. Documentation

| Document | Chemin |
| -------- | ------ |
| Guide utilisateur | `USERGUIDE.md` |
| Plan de test E2E (ISTQB) | `docs/plan-de-test-e2e-istqb.md` |
| Sanity check guide | `docs/guide-sanity-check.md` |
| Tests backend manuels | `bmad/test-manuel-backend-persistence.md` |
| Tests E2E Playwright | `e2e/README.md` |
| Tours premium | `content/tours/README.md` |
| Favicons & PWA | `docs/favicon-setup.md` |

---

## 11. Dépannage rapide

| Symptôme | Solution |
| -------- | -------- |
| `Next.js dev: EADDRINUSE :3000` | `npx kill-port 3000` puis `npm run dev` |
| `401 Invalid API key` du microservice | Vérifier `NEXT_PUBLIC_MICROSERVICE_API_KEY` côté web et `MICROSERVICE_API_KEY` côté Python |
| Microservice : `torch` import lent | Premier appel à `/v1/translate` charge MarianMT (~30 s, lazy) |
| MarianMT échoue à télécharger | Configurer un proxy HF ou pré-télécharger : `huggingface-cli download Helsinki-NLP/opus-mt-fr-en` |
| `ngrok` page interstitielle | L'en-tête `ngrok-skip-browser-warning: true` est déjà ajouté par `getMicroserviceHeaders()` |
| Playwright échoue en CI | `npx playwright install --with-deps` |
