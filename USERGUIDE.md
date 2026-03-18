# TourGuideWeb — User Guide & Protocole de test

> Dernière mise à jour : 2026-03-08

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
| `npm run test` | Lancer les tests Jest |
| `npm run typecheck` | Vérification TypeScript (sans compilation) |
| `npm run lint` | Vérification ESLint |
| `npm run seed` | Initialiser la base de données (via ts-node) |

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

| URL | Ce qu'on vérifie |
|---|---|
| `http://localhost:3000` | Page d'accueil — affichage général |
| `http://localhost:3000/guides` | Liste des guides |
| `http://localhost:3000/guide/[id]` | Détail d'un guide |
| `http://localhost:3000/catalogue` | Catalogue |
| `http://localhost:3000/admin` | Interface d'administration |
| `http://localhost:3000/privacy-policy` | Page politique de confidentialité |

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

## 4. Stack technique (rappel)

| Technologie | Version |
|---|---|
| Next.js | 16.1.6 |
| React | 19.x |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| AWS Amplify | 6.x |
| Leaflet / React-Leaflet | 1.9.x / 5.x |
| Jest | 30.x |

---

## 5. Structure des dossiers clés

```
src/
├── app/           # Pages Next.js (App Router)
│   ├── admin/     # Interface d'administration
│   ├── catalogue/ # Catalogue des guides
│   ├── guide/     # Détail d'un guide
│   ├── guides/    # Liste des guides
│   └── privacy-policy/
├── components/    # Composants React réutilisables
├── config/        # Configuration (api-mode.ts)
├── lib/
│   ├── amplify/   # Config AWS Amplify + utils SSR
│   ├── api/       # Couche d'accès aux données
│   └── auth/      # Authentification
└── types/         # Types TypeScript partagés
```
