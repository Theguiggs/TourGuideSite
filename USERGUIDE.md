# TourGuideWeb — User Guide & Protocole de test

> Dernière mise à jour : 2026-04-12

---

## 1. Lancer l'application

### Mode stub (développement local — recommandé)

Pas besoin de connexion AWS. Les données sont simulées via des mocks locaux.

```bash
cd C:/Projects/Bmad/TourGuideWeb

# Créer le fichier d'environnement local si inexistant
echo "NEXT_PUBLIC_USE_STUBS=true" > .env.local

# Installer les dépendances si besoin
npm install

# Lancer en développement
npm run dev
```

L'application est disponible sur **http://localhost:3000**

---

### Mode API réelle (AWS Amplify / AppSync)

Créer `.env.local` avec les vraies valeurs AWS :

```env
NEXT_PUBLIC_USE_STUBS=false
NEXT_PUBLIC_AMPLIFY_USER_POOL_ID=us-east-1_XXXXXXX
NEXT_PUBLIC_AMPLIFY_USER_POOL_CLIENT_ID=XXXXXXX
NEXT_PUBLIC_AMPLIFY_IDENTITY_POOL_ID=us-east-1:XXXXXXX
NEXT_PUBLIC_AMPLIFY_API_ENDPOINT=https://XXXXXXX.appsync-api.us-east-1.amazonaws.com/graphql
```

Puis lancer :

```bash
npm run dev
```

> **Important :** `.env.local` ne doit jamais être commité. Vérifier qu'il est bien dans `.gitignore`.

---

## 2. Commandes disponibles

| Commande | Usage |
|---|---|
| `npm run dev` | Serveur de développement avec hot reload |
| `npm run build` | Build de production |
| `npm run start` | Démarrer le build de production |
| `npm run test` | Lancer les tests Jest (~399 tests, 50 suites) |
| `npm run typecheck` | Vérification TypeScript (sans compilation) |
| `npm run lint` | Vérification ESLint |
| `npm run seed` | Initialiser la base de données (via ts-node) |
| `npm run e2e` | Tests Playwright |
| `npm run e2e:ui` | Playwright en mode UI interactif |
| `npm run e2e:report` | Voir le rapport de tests E2E |

---

## 3. Protocole de vérification des modifications

### 3.1 Vérifications automatiques (à lancer avant tout test manuel)

```bash
# 1. Vérifier les types TypeScript
npm run typecheck

# 2. Vérifier le linting
npm run lint

# 3. Lancer les tests unitaires
npm run test
```

Tous ces scripts doivent passer sans erreur avant de continuer.

---

### 3.2 Pages à vérifier manuellement

#### Pages publiques

| URL | Ce qu'on vérifie |
|---|---|
| `http://localhost:3000` | Page d'accueil — affichage général |
| `http://localhost:3000/catalogue` | Catalogue des tours |
| `http://localhost:3000/catalogue/[city]` | Tours d'une ville |
| `http://localhost:3000/catalogue/[city]/[tourSlug]` | Détail d'un tour |
| `http://localhost:3000/guides/[guideSlug]` | Page publique d'un guide |

#### Espace Guide

| URL | Ce qu'on vérifie |
|---|---|
| `http://localhost:3000/guide/login` | Connexion guide |
| `http://localhost:3000/guide/signup` | Inscription guide |
| `http://localhost:3000/guide/profile` | Profil guide |
| `http://localhost:3000/guide/dashboard` | Tableau de bord guide |
| `http://localhost:3000/guide/revenue` | Revenus guide |
| `http://localhost:3000/guide/studio` | Liste des sessions studio |
| `http://localhost:3000/guide/studio/[sessionId]` | Détail d'une session |
| `http://localhost:3000/guide/studio/[sessionId]/edit` | Éditeur de texte |
| `http://localhost:3000/guide/studio/[sessionId]/general` | Informations générales |
| `http://localhost:3000/guide/studio/[sessionId]/itinerary` | Éditeur d'itinéraire |
| `http://localhost:3000/guide/studio/[sessionId]/photos` | Gestion des photos |
| `http://localhost:3000/guide/studio/[sessionId]/preview` | Prévisualisation |
| `http://localhost:3000/guide/studio/[sessionId]/record` | Enregistrement audio |
| `http://localhost:3000/guide/studio/[sessionId]/scenes` | Gestion des scènes |
| `http://localhost:3000/guide/studio/[sessionId]/submission` | Soumission pour modération |

#### Administration

| URL | Ce qu'on vérifie |
|---|---|
| `http://localhost:3000/admin/analytics` | Analytics et funnel |
| `http://localhost:3000/admin/guides` | Liste des guides |
| `http://localhost:3000/admin/guides/[guideId]` | Détail d'un guide |
| `http://localhost:3000/admin/moderation` | File de modération |
| `http://localhost:3000/admin/moderation/[moderationId]` | Détail modération |
| `http://localhost:3000/admin/moderation/history` | Historique modération |
| `http://localhost:3000/admin/tours` | Gestion des tours |
| `http://localhost:3000/admin/tours/[tourId]` | Détail d'un tour |

---

### 3.3 Checklist de vérification

#### Général
- [ ] Aucune erreur dans la console navigateur (F12 → Onglet Console)
- [ ] Pas de réponse `404` ou `500` sur les routes principales
- [ ] La navigation entre les pages fonctionne sans rechargement complet

#### Affichage
- [ ] Les styles Tailwind sont appliqués (pas de page blanche non stylée)
- [ ] La carte Leaflet s'affiche correctement sur les pages concernées
- [ ] L'affichage est cohérent sur mobile (responsive)

#### Données
- [ ] En mode stub : les données mockées sont bien visibles
- [ ] En mode API réelle : les appels GraphQL retournent des données valides

#### Qualité
- [ ] `npm run test` — tous les tests passent
- [ ] `npm run typecheck` — aucune erreur TypeScript
- [ ] `npm run build` — build de production sans erreur (recommandé avant merge)

---

## 4. Stack technique

| Technologie | Version |
|---|---|
| Next.js | 16.1.6 |
| React | 19.x |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| AWS Amplify | 6.16.x |
| Zustand | 5.x |
| Leaflet / React-Leaflet | 1.9.x / 5.x |
| Stripe | latest |
| Jest | 30.x |
| Playwright | 1.58.x |

---

## 5. Structure des dossiers clés

```
src/
├── app/                  # Pages Next.js (App Router)
│   ├── catalogue/        # Catalogue public (villes, tours)
│   ├── guide/            # Espace guide
│   │   ├── studio/       # Studio d'enregistrement (11 sous-pages)
│   │   ├── login/        # Connexion
│   │   ├── signup/       # Inscription
│   │   ├── profile/      # Profil
│   │   ├── dashboard/    # Tableau de bord
│   │   └── revenue/      # Revenus
│   ├── admin/            # Interface d'administration
│   │   ├── analytics/    # Funnel et coûts
│   │   ├── guides/       # Gestion guides
│   │   ├── moderation/   # Modération contenu
│   │   └── tours/        # Gestion tours
│   └── guides/           # Pages publiques des guides
├── components/           # Composants React partagés
├── config/               # Configuration (api-mode.ts)
├── hooks/                # use-auto-save, use-auto-refund
├── lib/
│   ├── amplify/          # Config AWS Amplify + utils SSR
│   ├── api/              # Couche d'accès aux données (16 modules)
│   ├── auth/             # Contexte authentification
│   ├── stores/           # 9 stores Zustand
│   ├── studio/           # Services studio (recorder, player, prompter, mixer…)
│   └── multilang/        # Traduction batch, i18n, staleness
└── types/                # Types TypeScript partagés
```

---

## 6. Microservice Python

Le dossier `microservice/` contient un serveur Python pour les traitements audio :

```bash
cd microservice
pip install -r requirements.txt
python local_server.py
```

Services disponibles :
- **TTS** : Synthèse vocale (text-to-speech)
- **Traduction** : Traduction multilingue batch
- **Détection de silence** : Analyse audio automatique
