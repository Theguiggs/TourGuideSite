# Tests Manuels — Backend Studio Persistence AppSync + S3

**Tech-spec :** `tech-spec-studio-backend-persistence`
**Date :** 2026-03-18
**Prérequis :** Sandbox Amplify déployé (`npx ampx sandbox` actif), `amplify_outputs.json` copié dans TourGuideWeb, dev server Next.js lancé (`npm run dev`), mode réel activé (`FORCE_REAL_API=true` dans `.env.local`).

---

## Prérequis communs

### P1 — Sandbox Amplify

Le sandbox déploie le schéma AppSync + les tables DynamoDB + le bucket S3 sur ton compte AWS.

```bash
# Terminal 1 — reste ouvert pendant toute la session de tests
cd C:\Projects\Bmad\TourGuide
npx ampx sandbox
```

- Attendre le message `✅ Deployment complete` (2-5 min la première fois, ~30s les fois suivantes)
- Le terminal reste actif (hot-reload des changements schéma)
- **Ne pas fermer** ce terminal pendant les tests — sinon les tables sont supprimées
- Si le sandbox était déjà actif avant les changements de schéma, le redéploiement est automatique
- Vérification : le message doit lister les 10 tables (8 existantes + StudioSession + StudioScene)

### P2 — Copie amplify_outputs.json

Le fichier `amplify_outputs.json` est généré par le sandbox dans le projet mobile. Le projet web en a besoin pour se connecter au même backend.

```bash
cp C:\Projects\Bmad\TourGuide\amplify_outputs.json C:\Projects\Bmad\TourGuideWeb\amplify_outputs.json
```

- **Quand le refaire :** après chaque `npx ampx sandbox` qui modifie le schéma
- **Vérification :** ouvrir le fichier et vérifier qu'il contient `"StudioSession"` et `"StudioScene"` dans la section `model_introspection`
- Le fichier contient les endpoints (AppSync URL, Cognito User Pool ID, S3 bucket) — il est dans le `.gitignore`

### P3 — Configuration .env.local (mode réel)

Le fichier `.env.local` contrôle si l'app utilise les données mock (stub) ou les vrais appels AppSync/S3.

```bash
# C:\Projects\Bmad\TourGuideWeb\.env.local
NEXT_PUBLIC_USE_STUBS=false
FORCE_REAL_API=true
```

- `NEXT_PUBLIC_USE_STUBS=false` → toutes les fonctions API appellent AppSync au lieu de retourner des données mock
- `FORCE_REAL_API=true` → sécurité supplémentaire, force le mode réel même en `__DEV__`
- **Pour revenir en mode stub** (dev sans backend) : mettre `NEXT_PUBLIC_USE_STUBS=true`
- Les variables `NEXT_PUBLIC_AMPLIFY_*` (Region, User Pool ID, etc.) sont optionnelles quand `amplify_outputs.json` est présent — le fichier JSON a priorité

### P4 — Dev server Next.js

```bash
# Terminal 2
cd C:\Projects\Bmad\TourGuideWeb
npm run dev
```

- Ouvre `http://localhost:3000`
- **Vérification :** pas d'erreur dans la console terminal ni dans la console navigateur (DevTools → Console)
- Si erreur `Cannot find module 'amplify_outputs.json'` → refaire P2
- Si erreur `Amplify has not been configured` → vérifier que `.env.local` est correct (P3)
- **Après chaque modification de `.env.local`** : redémarrer le dev server (Ctrl+C puis `npm run dev`)

### P5 — Compte guide authentifié

Il faut un compte Cognito avec un profil guide pour tester les fonctionnalités Studio.

**Option A — Créer via l'app :**
1. Aller sur `http://localhost:3000/guide/signup`
2. Remplir email + mot de passe (min 8 chars, majuscule, minuscule, chiffre, symbole)
3. Vérifier l'email (code reçu par mail, saisir sur la page de vérification)
4. Compléter le profil guide (nom, ville, bio)
5. Le compte est prêt — `role=guide`, `guideId` = ID du profil créé

**Option B — Via la console AWS Cognito :**
1. Ouvrir la console AWS → Cognito → User Pools → `us-east-1_XuXa68i24`
2. Onglet "Users" → "Create user"
3. Email : `testguide@example.com`, mot de passe temporaire
4. Se connecter sur l'app → changer le mot de passe à la première connexion
5. Créer un profil guide via `/guide/profile`

**Vérification :** après connexion, l'app affiche "Mon Studio" dans le menu guide et la page `/guide/studio` est accessible.

### P6 — Compte admin authentifié

Le rôle admin est déterminé par l'appartenance au groupe Cognito `admin`.

1. Ouvrir la console AWS → Cognito → User Pools → `us-east-1_XuXa68i24`
2. Onglet "Groups" → cliquer "Create group" si le groupe `admin` n'existe pas → nom : `admin`
3. Ouvrir le groupe `admin` → "Add user" → sélectionner l'utilisateur souhaité
4. **Reconnecter** l'utilisateur (sign out puis sign in) — le token doit contenir `cognito:groups: ['admin']`
5. Après reconnexion, l'app affiche le menu admin (`/admin/moderation`, `/admin/tours`, etc.)

**Vérification :** aller sur `http://localhost:3000/admin/moderation` — la page s'affiche (pas de redirection).

**Astuce :** un même utilisateur peut être guide ET admin (dans le groupe `admin` + avec un profil guide). L'app priorise le rôle admin.

### P7 — Console AWS pour vérifications

Ouvrir les services suivants dans la console AWS (région `us-east-1`) :

**DynamoDB :**
- URL : `https://us-east-1.console.aws.amazon.com/dynamodbv2/home?region=us-east-1#tables`
- Chercher les tables préfixées par le nom du sandbox (ex: `StudioSession-xxxxx-NONE`)
- Utiliser "Explore items" pour voir le contenu des tables

**S3 :**
- URL : `https://s3.console.aws.amazon.com/s3/home?region=us-east-1`
- Chercher le bucket `tourguideAssets` (ou préfixé par le sandbox)
- Naviguer dans `guide-studio/{sub}/` pour vérifier les uploads

**AppSync (optionnel, pour debug) :**
- URL : `https://us-east-1.console.aws.amazon.com/appsync/home?region=us-east-1`
- Onglet "Queries" permet de tester les requêtes GraphQL directement

### Checklist de démarrage

| # | Prérequis | Commande / Action | Vérification |
|---|-----------|-------------------|-------------|
| P1 | Sandbox Amplify | `cd TourGuide && npx ampx sandbox` | `✅ Deployment complete` + 10 tables |
| P2 | amplify_outputs.json | `cp TourGuide/amplify_outputs.json TourGuideWeb/` | Fichier contient `StudioSession` |
| P3 | .env.local | Éditer `NEXT_PUBLIC_USE_STUBS=false` | Fichier sauvegardé |
| P4 | Dev server | `cd TourGuideWeb && npm run dev` | `http://localhost:3000` sans erreur |
| P5 | Compte guide | Signup ou Cognito console | `/guide/studio` accessible |
| P6 | Compte admin | Cognito Groups → ajouter au groupe `admin` | `/admin/moderation` accessible |
| P7 | Console AWS | Ouvrir DynamoDB + S3 dans le navigateur | Tables et bucket visibles |

---

## T1 — Création parcours + session (AC 1)

**Contexte :** Guide authentifié, page "Mes Parcours"

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 1.1 | Aller sur `/guide/tours` | La liste des parcours s'affiche |  |
| 1.2 | Cliquer "Créer un nouveau parcours" | Formulaire titre + ville affiché |  |
| 1.3 | Remplir titre="Test Persistance", ville="Grasse", valider | Redirection vers le Studio (`/guide/studio/{sessionId}`) |  |
| 1.4 | Ouvrir DynamoDB → table `GuideTour` | Un enregistrement existe avec `title="Test Persistance"`, `city="Grasse"`, `status="draft"`, `sessionId` non null |  |
| 1.5 | Ouvrir DynamoDB → table `StudioSession` | Un enregistrement existe avec `guideId` = sub du guide, `tourId` = id du tour créé, `status="draft"` |  |
| 1.6 | Vérifier le lien bidirectionnel | `GuideTour.sessionId` == `StudioSession.id` ET `StudioSession.tourId` == `GuideTour.id` |  |

---

## T2 — Persistance après rechargement (AC 2)

**Contexte :** Suite de T1

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 2.1 | Recharger la page (F5 / Ctrl+R) | La session Studio se recharge correctement, pas d'écran vide |  |
| 2.2 | Aller sur `/guide/studio` (Mon Studio) | La session "Test Persistance" apparaît dans la liste |  |
| 2.3 | Aller sur `/guide/tours` (Mes Parcours) | Le parcours "Test Persistance" apparaît avec statut "Brouillon" |  |
| 2.4 | Ouvrir un onglet incognito, se connecter avec le même compte | Les mêmes sessions et parcours sont visibles |  |
| 2.5 | Vider le localStorage du navigateur, recharger | Les données sont toujours là (chargées depuis AppSync, pas localStorage) |  |

---

## T3 — Enregistrement audio + upload S3 (AC 3)

**Contexte :** Guide dans le Studio, session ouverte, onglet Scènes

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 3.1 | Aller dans l'onglet "Scènes" d'une session | Liste des scènes affichée (ou vide si nouvelle session) |  |
| 3.2 | Créer une scène "Place du marché" si nécessaire | Scène créée, visible dans la sidebar |  |
| 3.3 | Sélectionner la scène, aller dans l'onglet "Audio" | AudioRecorder affiché |  |
| 3.4 | Cliquer "Autoriser le micro" | Permission demandée par le navigateur |  |
| 3.5 | Cliquer "Enregistrer", parler 5 secondes, cliquer "Arrêter" | Enregistrement terminé, take ajouté à la liste |  |
| 3.6 | Observer la barre de progression d'upload | Progression affichée (0% → 100%), puis disparaît |  |
| 3.7 | Vérifier le badge de la scène dans la sidebar | Badge passe à "Enregistré" (orange) |  |
| 3.8 | Ouvrir S3 → bucket `tourguideAssets` → `guide-studio/{sub}/{sessionId}/audio/` | Fichier `scene_0.webm` (ou `.m4a`) présent |  |
| 3.9 | Ouvrir DynamoDB → table `StudioScene` | `studioAudioKey` contient le path S3, `status` = `recorded` |  |
| 3.10 | Recharger la page | L'audio est toujours associé à la scène (pas perdu) |  |

---

## T4 — Upload photos (AC 4)

**Contexte :** Guide dans le Studio, onglet Photos d'une scène

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 4.1 | Aller dans l'onglet "Photos" d'une scène | Zone d'upload affichée avec "0/3 photos" |  |
| 4.2 | Cliquer "+", sélectionner un fichier JPEG < 5MB | Photo uploadée, preview affichée, compteur "1/3 photos" |  |
| 4.3 | Ajouter une 2ème photo (PNG) | "2/3 photos" affiché |  |
| 4.4 | Ajouter une 3ème photo (WebP) | "3/3 photos", bouton "+" disparaît |  |
| 4.5 | Ouvrir S3 → `guide-studio/{sub}/{sessionId}/photos/` | 3 fichiers présents (`scene_0_0.jpg`, `scene_0_1.png`, `scene_0_2.webp`) |  |
| 4.6 | Ouvrir DynamoDB → table `StudioScene` | `photosRefs` contient un array de 3 S3 keys |  |
| 4.7 | Recharger la page | Les 3 photos sont toujours visibles |  |
| 4.8 | Supprimer une photo (bouton ✕) | "2/3 photos", bouton "+" réapparaît |  |

---

## T5 — Preview + audio signed URLs (AC 5)

**Contexte :** Session avec au moins 1 scène enregistrée (audio uploadé)

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 5.1 | Aller sur la page Preview (`/guide/studio/{sessionId}/preview`) | Liste des scènes affichée avec photos et texte |  |
| 5.2 | Cliquer le bouton play (▶) sur une scène avec audio | L'audio se lance, le bouton passe en pause (⏸) |  |
| 5.3 | Vérifier dans DevTools (Network) | La requête audio va vers une URL S3 signée (`https://...s3...?X-Amz-...`) |  |
| 5.4 | Cliquer "Écouter tout" | Lecture séquentielle de toutes les scènes avec audio |  |
| 5.5 | Cliquer "Arrêter" pendant la lecture | Lecture arrêtée |  |

---

## T6 — Vue admin / modération (AC 6)

**Contexte :** Session soumise + compte admin

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 6.1 | Avec le compte guide, soumettre le tour en revue (Preview → "Soumettre en revue") | Message "Tour soumis en revue !" |  |
| 6.2 | Se connecter avec le compte admin | Dashboard admin accessible |  |
| 6.3 | Aller sur la page modération | Le tour soumis apparaît dans la liste |  |
| 6.4 | Ouvrir le détail du tour | Scènes visibles avec texte, audio jouable (signed URLs), photos affichées |  |
| 6.5 | Vérifier que l'admin voit les mêmes données que le guide | Audio, texte, photos identiques |  |

---

## T7 — Validation taille upload (AC 7)

**Contexte :** Guide dans le Studio, onglet Audio ou Photos

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 7.1 | Préparer un fichier audio > 50MB (ex: WAV 10min stereo) | — |  |
| 7.2 | Tenter d'importer le fichier via File Import | Message d'erreur "Fichier audio trop volumineux" AVANT tout envoi réseau |  |
| 7.3 | Vérifier DevTools → Network | Aucune requête S3 envoyée |  |
| 7.4 | Préparer une image > 5MB (ex: photo RAW ou PNG haute résolution) | — |  |
| 7.5 | Tenter d'uploader la photo | Message "Photo trop volumineuse (max 5 Mo)" |  |
| 7.6 | Vérifier DevTools → Network | Aucune requête S3 envoyée |  |
| 7.7 | Tenter un fichier au format non supporté (ex: `.gif` pour photo, `.txt` pour audio) | Message "Format non supporté" |  |

---

## T8 — Protection navigation pendant upload (AC 8)

**Contexte :** Guide dans le Studio, enregistrement audio en cours d'upload

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 8.1 | Lancer un enregistrement audio long (~10s) puis arrêter | Upload démarre (barre de progression visible) |  |
| 8.2 | Pendant l'upload, cliquer sur une autre scène dans la sidebar | Clic ignoré (sidebar désactivée pendant upload) |  |
| 8.3 | Pendant l'upload, cliquer sur un autre onglet (Photos/Texte) | Onglets désactivés pendant upload |  |
| 8.4 | Pendant l'upload, tenter de fermer l'onglet navigateur | Dialog "Un upload est en cours. Quitter ?" affiché |  |
| 8.5 | Cliquer "Annuler" dans le dialog | Reste sur la page, upload continue |  |

---

## T9 — Retry après échec upload (AC 9)

**Contexte :** Simuler un échec réseau pendant upload

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 9.1 | Ouvrir DevTools → Network → activer "Offline" | Mode hors-ligne activé |  |
| 9.2 | Enregistrer un audio et arrêter | Upload échoue après tentatives de retry |  |
| 9.3 | Observer le comportement | Barre de progression → message "Upload échoué" avec bouton "Réessayer" |  |
| 9.4 | Désactiver le mode "Offline" dans DevTools | Réseau rétabli |  |
| 9.5 | Cliquer "Réessayer" | Upload reprend et réussit, badge scène passe à "Enregistré" |  |

---

## T10 — Mode stub préservé (AC 10)

**Contexte :** `.env.local` avec `NEXT_PUBLIC_USE_STUBS=true` (mode stub)

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 10.1 | Changer `.env.local` → `NEXT_PUBLIC_USE_STUBS=true`, redémarrer le dev server | Server redémarre OK |  |
| 10.2 | Aller sur `/guide/studio` | Les 3 sessions mock apparaissent (Grasse Parfumeurs, Vieille Ville, Nice) |  |
| 10.3 | Ouvrir une session, naviguer dans les scènes | Données mock affichées correctement |  |
| 10.4 | Créer un nouveau parcours | Parcours créé en mémoire (pas d'appel AppSync) |  |
| 10.5 | Lancer `npx jest --no-coverage` | 423 tests passent, 0 failures |  |

---

## T11 — Vérification schéma DynamoDB (AC 11)

**Contexte :** Console AWS DynamoDB

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 11.1 | Lister les tables DynamoDB du sandbox | 10 tables présentes (8 existantes + StudioSession + StudioScene) |  |
| 11.2 | Ouvrir la table `StudioSession` → onglet "Indexes" | GSI sur `guideId` présent |  |
| 11.3 | Ouvrir la table `StudioScene` → onglet "Indexes" | GSI sur `sessionId` présent |  |
| 11.4 | Ouvrir la table `GuideTour` → explorer un item | Champ `sessionId` présent (peut être null si pas de session liée) |  |
| 11.5 | Vérifier les champs `StudioSession` | `guideId`, `sourceSessionId`, `tourId`, `title`, `status`, `language`, `transcriptionQuotaUsed`, `consentRGPD`, `owner` (auto Cognito) |  |
| 11.6 | Vérifier les champs `StudioScene` | `sessionId`, `sceneIndex`, `title`, `originalAudioKey`, `studioAudioKey`, `transcriptText`, `status`, `photosRefs` (list), `latitude`, `longitude`, etc. |  |

---

## T12 — Sécurité owner auth (AC 15)

**Contexte :** 2 comptes guide différents

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 12.1 | Avec le guide A, créer une session | Session créée avec `owner` = sub du guide A |  |
| 12.2 | Avec le guide B, tenter de lister les sessions du guide A | Résultat vide (AppSync filtre par owner) |  |
| 12.3 | Avec le guide B, tenter d'accéder directement à l'URL `/guide/studio/{sessionId_de_A}` | Session non trouvée ou erreur Unauthorized |  |
| 12.4 | Avec le compte admin, lister les sessions | Toutes les sessions visibles (admin group read) |  |

---

## T13 — Enum GuideTour.status étendue (AC 16)

**Contexte :** Console AWS AppSync ou via le code

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 13.1 | Via la page Preview, soumettre un tour en revue | `GuideTour.status` passe à `review` (pas de rejet enum) |  |
| 13.2 | Retirer la soumission | `GuideTour.status` passe à `editing` |  |
| 13.3 | Vérifier dans DynamoDB que les valeurs `synced`, `editing`, `review`, `revision_requested` sont acceptées | Aucune erreur de validation |  |

---

## T14 — Upload concurrent audio + photo (AC 14)

**Contexte :** Guide dans le Studio, scène avec onglets Audio et Photos

| # | Action | Résultat attendu | OK ? |
|---|--------|-------------------|------|
| 14.1 | Enregistrer un audio (10s), arrêter | Upload audio démarre |  |
| 14.2 | Pendant l'upload audio (si assez long), noter que les onglets sont disabled | Les onglets sont verrouillés pendant l'upload audio — **ce test vérifie le lock** |  |
| 14.3 | Une fois l'upload audio terminé, uploader une photo | Photo uploadée indépendamment |  |
| 14.4 | Vérifier que les deux fichiers sont dans S3 | `audio/scene_0.webm` + `photos/scene_0_0.jpg` |  |

---

## Résumé

| Catégorie | Tests | AC couverts |
|-----------|-------|-------------|
| Création parcours + session | T1 (6 checks) | AC 1 |
| Persistance rechargement | T2 (5 checks) | AC 2 |
| Upload audio S3 | T3 (10 checks) | AC 3 |
| Upload photos S3 | T4 (8 checks) | AC 4 |
| Preview signed URLs | T5 (5 checks) | AC 5 |
| Vue admin modération | T6 (5 checks) | AC 6 |
| Validation taille | T7 (7 checks) | AC 7 |
| Protection navigation | T8 (5 checks) | AC 8 |
| Retry échec upload | T9 (5 checks) | AC 9 |
| Mode stub préservé | T10 (5 checks) | AC 10 |
| Schéma DynamoDB | T11 (6 checks) | AC 11 |
| Sécurité owner auth | T12 (4 checks) | AC 15 |
| Enum status étendue | T13 (3 checks) | AC 16 |
| Upload concurrent | T14 (4 checks) | AC 14 |

**Total : 14 scénarios, 78 vérifications, 14/16 AC couverts**
(AC 12 et AC 13 couverts par les tests unitaires Jest uniquement)
