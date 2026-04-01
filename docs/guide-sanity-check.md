# Guide Sanity Check — TourGuide (Web + Mobile)

## Lancement rapide

```powershell
# Depuis la racine TourGuideWeb
.\scripts\sanity-check.ps1
```

Le script (7 etapes) :
1. Verifie les prerequis (`node_modules`, `amplify_outputs.json`, `.env.local`)
2. Detecte un telephone Android via ADB (modele, version, app installee)
3. Lance le sandbox Amplify (nouvel onglet Windows Terminal)
4. Lance le serveur Next.js dev (nouvel onglet)
5. Lance Metro bundler + l'appli mobile sur le telephone (si detecte)
6. Attend que `http://localhost:3000` reponde (health check)
7. Ouvre automatiquement **2 pages** dans le navigateur :
   - `http://localhost:3000/guide/login` (portail Guide)
   - `http://localhost:3000/admin/moderation` (portail Admin)

## Options

| Option | Description |
|--------|-------------|
| `-SkipSandbox` | Ne lance pas le sandbox Amplify (s'il tourne deja) |
| `-StubMode` | Mode stubs — pas de backend reel, donnees simulees |
| `-SkipMobile` | Ne detecte pas le telephone, ne lance pas l'appli |
| `-Port 3001` | Port alternatif pour Next.js |
| `-TimeoutSeconds 90` | Timeout du health check |

```powershell
# Sandbox deja lance
.\scripts\sanity-check.ps1 -SkipSandbox

# Mode stubs (sans AWS)
.\scripts\sanity-check.ps1 -StubMode

# Sans mobile
.\scripts\sanity-check.ps1 -SkipMobile

# Tout custom
.\scripts\sanity-check.ps1 -SkipSandbox -Port 3001 -TimeoutSeconds 90
```

## Prerequis

### Web

| Element | Comment l'obtenir |
|---------|-------------------|
| `node_modules/` (web) | `cd TourGuideWeb && npm install` |
| `amplify_outputs.json` | Copier depuis `../TourGuide/amplify_outputs.json` |
| `.env.local` | Variables Amplify (auth, API, storage) |
| Windows Terminal (`wt`) | Installe par defaut sur Windows 11 |
| AWS credentials | Pour le sandbox : `aws configure` ou fichier `.aws/credentials` |

### Mobile (optionnel — si telephone connecte)

| Element | Comment l'obtenir |
|---------|-------------------|
| `node_modules/` (mobile) | `cd TourGuide && npm install` |
| ADB dans le PATH | Android SDK Platform-Tools |
| Debogage USB active | Parametres dev du telephone |
| App installee | `cd TourGuide\android && gradlew.bat app:installDebug` |
| Cable USB | Connecte avant de lancer le script |

## Checklist Sanity Check

### Portail Guide (Web)

| # | Verification | Resultat |
|---|-------------|----------|
| G1 | Page `/guide/login` s'affiche | [ ] OK  [ ] KO |
| G2 | Saisie email + mot de passe + clic Connexion | [ ] OK  [ ] KO |
| G3 | Redirection vers `/guide/dashboard` | [ ] OK  [ ] KO |
| G4 | Dashboard affiche les stats et tours | [ ] OK  [ ] KO |
| G5 | Navigation vers `/guide/studio` | [ ] OK  [ ] KO |
| G6 | Consentement RGPD s'affiche (premier acces) | [ ] OK  [ ] KO |
| G7 | Liste des sessions charge | [ ] OK  [ ] KO |
| G8 | Creer un nouveau tour (titre + ville) | [ ] OK  [ ] KO |
| G9 | Ouvrir une session -> onglets (General, Scenes, Enregistrement, Apercu) | [ ] OK  [ ] KO |
| G10 | Apercu du tour affiche le contenu | [ ] OK  [ ] KO |

### Portail Admin (Web)

| # | Verification | Resultat |
|---|-------------|----------|
| A1 | Page `/admin/moderation` redirige vers login si non connecte | [ ] OK  [ ] KO |
| A2 | Connexion admin fonctionne | [ ] OK  [ ] KO |
| A3 | File de moderation affiche les tours soumis | [ ] OK  [ ] KO |
| A4 | Clic "Examiner" ouvre le detail du tour | [ ] OK  [ ] KO |
| A5 | Checklist de qualite fonctionne (cocher/decocher) | [ ] OK  [ ] KO |
| A6 | Navigation `/admin/analytics` affiche le dashboard | [ ] OK  [ ] KO |
| A7 | Navigation `/admin/guides` affiche la liste des guides | [ ] OK  [ ] KO |

### Catalogue Public (Web)

| # | Verification | Resultat |
|---|-------------|----------|
| C1 | Page `/catalogue` affiche les villes | [ ] OK  [ ] KO |
| C2 | Clic ville -> liste des tours publies | [ ] OK  [ ] KO |
| C3 | Tours en brouillon ne sont PAS visibles | [ ] OK  [ ] KO |

### App Mobile (si telephone detecte)

| # | Verification | Resultat |
|---|-------------|----------|
| M1 | App demarre sans crash | [ ] OK  [ ] KO |
| M2 | Ecran d'accueil (HomeScreen) s'affiche | [ ] OK  [ ] KO |
| M3 | Catalogue : liste des tours visibles | [ ] OK  [ ] KO |
| M4 | Ouvrir un tour -> detail + carte | [ ] OK  [ ] KO |
| M5 | Lancer un parcours fictif (lecture audio) | [ ] OK  [ ] KO |
| M6 | Connexion Guide dans l'app | [ ] OK  [ ] KO |
| M7 | Dashboard Guide mobile charge | [ ] OK  [ ] KO |
| M8 | Capture terrain (LiveCapture) demarre | [ ] OK  [ ] KO |
| M9 | GPS + enregistrement audio fonctionnent | [ ] OK  [ ] KO |
| M10 | Retour accueil sans crash | [ ] OK  [ ] KO |

### Console / Erreurs

| # | Verification | Resultat |
|---|-------------|----------|
| E1 | Pas d'erreur rouge dans la console Next.js | [ ] OK  [ ] KO |
| E2 | Pas d'erreur dans la console navigateur (F12) | [ ] OK  [ ] KO |
| E3 | Pas de warning TypeScript au build | [ ] OK  [ ] KO |
| E4 | Pas de red screen / yellow box dans l'app mobile | [ ] OK  [ ] KO |
| E5 | Metro bundler : pas d'erreur de compilation | [ ] OK  [ ] KO |

## Apres le Sanity Check

```powershell
# Tests unitaires web (399 tests)
npm test

# Tests unitaires mobile (3310 tests)
cd ..\TourGuide && npm test

# Tests E2E Playwright (16 tests, necessite .env.e2e)
npm run e2e

# Voir le rapport E2E
npm run e2e:report
```

## Troubleshooting

### Web

| Probleme | Solution |
|----------|----------|
| `amplify_outputs.json` manquant | `copy ..\TourGuide\amplify_outputs.json .` |
| Port 3000 occupe | `.\scripts\sanity-check.ps1 -Port 3001` ou `npx kill-port 3000` |
| Sandbox ne demarre pas | `aws sts get-caller-identity` pour verifier les credentials |
| Login echoue | Verifier que le compte Cognito existe et est confirme |
| Page blanche apres login | Verifier `amplify_outputs.json` (user_pool_id, etc.) |
| `wt` non reconnu | Installer Windows Terminal depuis le Microsoft Store |

### Mobile

| Probleme | Solution |
|----------|----------|
| ADB non trouve | Ajouter `%LOCALAPPDATA%\Android\Sdk\platform-tools` au PATH |
| Telephone non detecte | Activer debogage USB + accepter le popup sur le telephone |
| App non installee | `cd TourGuide\android && gradlew.bat app:installDebug` |
| Metro ne demarre pas | Verifier `node_modules` mobile : `cd TourGuide && npm install` |
| Port 8081 occupe | `npx kill-port 8081` puis relancer |
| Red screen au lancement | Verifier que Metro tourne + `adb reverse tcp:8081 tcp:8081` |
| Crash au demarrage | `adb shell pm clear com.tourguideyeup` puis relancer |
