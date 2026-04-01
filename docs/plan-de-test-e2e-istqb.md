# Plan de Test E2E — TourGuide Web Portal

**Référentiel** : ISTQB Foundation Level v4.0 / IEEE 829
**Projet** : TourGuide Web Portal (Next.js)
**Version** : 1.0.0
**Date** : 2026-03-21
**Auteur** : Équipe QA TourGuide
**Outil** : Playwright 1.x + Jest
**Statut** : En vigueur

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Périmètre de test](#2-périmètre-de-test)
3. [Approche de test](#3-approche-de-test)
4. [Environnement de test](#4-environnement-de-test)
5. [Critères d'entrée et de sortie](#5-critères-dentrée-et-de-sortie)
6. [Gestion des données de test](#6-gestion-des-données-de-test)
7. [Suites de test E2E](#7-suites-de-test-e2e)
8. [Cas de test détaillés](#8-cas-de-test-détaillés)
9. [Tests unitaires (couverture)](#9-tests-unitaires-couverture)
10. [Gestion des risques](#10-gestion-des-risques)
11. [Métriques et reporting](#11-métriques-et-reporting)
12. [Glossaire](#12-glossaire)

---

## 1. Introduction

### 1.1 Objectif

Ce document décrit la stratégie, les cas de test et le protocole d'exécution des tests end-to-end (E2E) du portail web TourGuide, conformément aux bonnes pratiques ISTQB. Il couvre les parcours critiques des deux rôles utilisateur : **Guide** (créateur de contenu) et **Administrateur** (modérateur).

### 1.2 Références

| Document | Description |
|----------|-------------|
| PRD TourGuide | Product Requirements Document |
| Architecture Studio (Epics 1-11) | Spécifications fonctionnelles du Studio Web |
| `e2e/README.md` | Documentation technique des tests E2E |
| `playwright.config.ts` | Configuration Playwright |
| `jest.config.ts` | Configuration Jest (tests unitaires) |

### 1.3 Niveaux de test couverts

| Niveau ISTQB | Outil | Nb de tests | Couverture |
|--------------|-------|-------------|------------|
| Test unitaire | Jest + jsdom | ~399 (52 fichiers) | Branches 37%, Fonctions 63%, Lignes 60% |
| Test d'intégration | Jest (stubs API) | Inclus ci-dessus | API clients, stores, services |
| Test système (E2E) | Playwright | 16 | Parcours Guide, Admin, Catalogue, Cross-platform |

---

## 2. Périmètre de test

### 2.1 Dans le périmètre (In Scope)

| Fonctionnalité | Priorité | Suite E2E |
|----------------|----------|-----------|
| Authentification Guide (Cognito) | Critique | `smoke`, `guide-flow` |
| CRUD Tours (création, édition) | Critique | `smoke`, `guide-flow` |
| Édition de scènes (POI, photos) | Haute | `guide-flow` |
| Prévisualisation de tour | Haute | `guide-flow` |
| Soumission pour modération | Critique | `guide-flow` |
| File de modération Admin | Critique | `admin-flow` |
| Examen détaillé d'un tour | Haute | `admin-flow` |
| Renvoi pour corrections | Haute | `admin-flow` |
| Approbation et publication | Critique | `admin-flow` |
| Visibilité catalogue (publié vs brouillon) | Haute | `catalogue` |
| Intéropérabilité mobile → web | Haute | `cross-platform` |

### 2.2 Hors périmètre (Out of Scope)

- Tests de performance / charge
- Tests de sécurité (pénétration)
- Tests d'accessibilité automatisés (couverts partiellement par les tests unitaires `AccessibilityAudit`)
- Tests sur navigateurs multiples (Firefox, Safari) — Chromium uniquement
- Tests mobile natifs (React Native) — couverts séparément (~3310 tests Jest)

---

## 3. Approche de test

### 3.1 Technique de conception des tests

| Technique ISTQB | Application |
|-----------------|-------------|
| **Partitions d'équivalence** | Tour publié vs brouillon dans le catalogue |
| **Analyse des valeurs limites** | Timeout d'authentification (15s), délais de polling |
| **Table de décision** | Checklist de modération (toutes cochées → bouton actif) |
| **Transition d'états** | Cycle de vie du tour : `draft → submitted → revision / published` |
| **Cas d'utilisation** | Parcours complet Guide et Admin (test sériel) |

### 3.2 Types de test

| Type | Description | Implémentation |
|------|-------------|----------------|
| **Test fonctionnel** | Validation des exigences métier | Tous les E2E |
| **Test de fumée (Smoke)** | Validation infrastructure minimale | `smoke.spec.ts` |
| **Test de régression** | Exécution complète après chaque merge | CI pipeline |
| **Test d'intégration système** | Flux cross-platform mobile → web | `cross-platform.spec.ts` |

### 3.3 Exécution séquentielle

Les tests `guide-flow` utilisent `test.describe.serial()` — chaque test dépend du précédent (login → création → édition → preview → soumission). Les autres suites sont indépendantes mais exécutées avec **1 worker** pour éviter les conflits de données.

---

## 4. Environnement de test

### 4.1 Configuration technique

| Paramètre | Valeur |
|-----------|--------|
| **Framework** | Playwright |
| **Navigateur** | Chromium (headless) |
| **Workers** | 1 (exécution séquentielle) |
| **Base URL** | `http://localhost:3000` |
| **Backend** | AWS Amplify Gen 2 (Cognito + AppSync + DynamoDB) |
| **Mode API** | `FORCE_REAL_API=true` / `NEXT_PUBLIC_USE_STUBS=false` |
| **Retries** | 0 (local) / 1 (CI) |
| **Serveur web** | `npm run dev` (local) / `npm run build && npm start` (CI) |
| **Timeout serveur** | 30s (local) / 300s (CI) |

### 4.2 Artéfacts de diagnostic

| Artéfact | Condition de capture |
|----------|---------------------|
| **Screenshots** | Uniquement en cas d'échec |
| **Vidéo** | Conservée en cas d'échec |
| **Trace Playwright** | Premier retry uniquement |
| **Rapport HTML** | Généré automatiquement (`playwright-report/`) |

### 4.3 Protection des données sensibles

- Les tests de login désactivent explicitement `trace` et `video` pour ne pas capturer les identifiants dans les artéfacts (cf. `testInfo.config.projects[0].use`)
- Les mots de passe sont lus depuis les variables d'environnement (`.env.e2e`)
- Les fichiers d'état d'authentification (`.auth/*.json`) sont supprimés par le `globalTeardown`

### 4.4 Prérequis

| Prérequis | Détail |
|-----------|--------|
| Comptes Cognito | `e2e-guide@test.tourguide.app` (rôle Guide) + `e2e-admin@test.tourguide.app` (rôle Admin) |
| Fichier `.env.e2e` | Contient `E2E_GUIDE_EMAIL`, `E2E_GUIDE_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` |
| `amplify_outputs.json` | Configuration Amplify (user_pool_client_id, aws_region) |
| Sandbox Amplify | Backend déployé et accessible |
| Credentials AWS | Pour les opérations DynamoDB directes (cleanup) |

---

## 5. Critères d'entrée et de sortie

### 5.1 Critères d'entrée

| # | Critère | Vérification |
|---|---------|--------------|
| CE-1 | Build Next.js réussi sans erreur TypeScript | `npm run build` — 0 erreurs TS |
| CE-2 | Tests unitaires Jest passent | `npm test` — 399 tests, 0 échec |
| CE-3 | Backend Amplify sandbox déployé | `amplify_outputs.json` valide |
| CE-4 | Comptes E2E Cognito opérationnels | Auth Cognito réussie dans `global-setup.ts` |
| CE-5 | Variables d'environnement configurées | `.env.e2e` présent et complet |

### 5.2 Critères de sortie

| # | Critère | Seuil |
|---|---------|-------|
| CS-1 | Taux de réussite E2E | 100% (16/16 tests) |
| CS-2 | Taux de flakiness | < 2% sur les 10 dernières exécutions |
| CS-3 | Aucun défaut bloquant ouvert | Sévérité Critique = 0 |
| CS-4 | Couverture des parcours critiques | 100% des flux Guide et Admin couverts |
| CS-5 | Nettoyage des données de test | `cleanupByPrefix()` exécuté, 0 résidu |

---

## 6. Gestion des données de test

### 6.1 Stratégie de seeding

| Mécanisme | Détail |
|-----------|--------|
| **Préfixe unique** | `e2e-{suite}-{timestamp}` — isolation temporelle complète |
| **Seeding API** | Appels AppSync GraphQL directs (pas d'interaction UI) |
| **Fixtures disponibles** | `seedGuideTour()`, `seedSubmittedTour()`, `seedPublishedTour()`, `seedDraftTour()`, `seedMobileSession()` |
| **Assets de test** | `sample-audio.webm` (1KB, WebM/Opus silence), `sample-photo.jpg` (162B, JPEG 1x1 blanc) |

### 6.2 Stratégie de nettoyage

| Phase | Mécanisme |
|-------|-----------|
| `afterAll` de chaque suite | `cleanupByPrefix(prefix)` via DynamoDB `BatchWriteItem` |
| Retry DynamoDB | 3 tentatives pour les `UnprocessedItems` |
| `globalTeardown` | Suppression des fichiers `.auth/guide.json` et `.auth/admin.json` |

### 6.3 Isolation des suites

Chaque suite utilise un préfixe distinct (`smoke`, `guide`, `admin`, `catalogue`, `xplat`) avec timestamp, garantissant l'absence de collision entre exécutions concurrentes.

---

## 7. Suites de test E2E

### Vue d'ensemble

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts       # Authentification Cognito (InitiateAuthCommand)
│   ├── seed.fixture.ts        # Fonctions de seeding réutilisables
│   ├── test-data.ts           # Configuration (emails, IDs Cognito)
│   ├── global-setup.ts        # Pré-authentification Guide + Admin
│   ├── global-teardown.ts     # Suppression fichiers auth
│   ├── sample-audio.webm      # Fichier audio de test
│   └── sample-photo.jpg       # Image de test
├── helpers/
│   ├── appsync-direct.ts      # Client AppSync HTTP + DynamoDB SDK
│   └── wait-helpers.ts        # pollUntil() — assertions asynchrones
└── tests/
    ├── smoke.spec.ts           # 2 tests  — Validation infra
    ├── guide-flow.spec.ts      # 5 tests  — Parcours Guide complet
    ├── admin-flow.spec.ts      # 4 tests  — Parcours Admin/Modération
    ├── catalogue.spec.ts       # 2 tests  — Visibilité catalogue
    └── cross-platform.spec.ts  # 3 tests  — Interop mobile → web
```

**Total : 16 cas de test E2E répartis en 5 suites**

---

## 8. Cas de test détaillés

### 8.1 Suite : Smoke Tests (`smoke.spec.ts`)

| ID | Cas de test | Priorité | Précondition | Étapes | Résultat attendu |
|----|------------|----------|-------------|--------|-----------------|
| **SMK-01** | Login Guide via UI | Critique | Compte Guide Cognito actif | 1. Naviguer vers `/guide/login` 2. Saisir email + mot de passe 3. Cliquer "Connexion" | Redirection vers `/guide/dashboard` (timeout 15s) |
| **SMK-02** | CRUD Tour via API | Critique | Token Guide valide | 1. Créer un tour via AppSync (`seedTour`) 2. Requêter par titre 3. Supprimer par préfixe 4. Vérifier suppression | Tour créé avec `id` truthy, retrouvé par titre, supprimé sans résidu |

### 8.2 Suite : Guide Flow (`guide-flow.spec.ts`) — Exécution sérielle

| ID | Cas de test | Priorité | Précondition | Étapes | Résultat attendu |
|----|------------|----------|-------------|--------|-----------------|
| **GF-01** | Login Guide | Critique | Compte Guide actif | 1. `/guide/login` 2. Saisir identifiants 3. Soumettre | URL `/guide/dashboard` |
| **GF-02** | Créer un tour | Critique | GF-01 réussi | 1. `/guide/tours` 2. Cliquer "Créer" 3. Remplir titre + ville 4. "Créer et éditer" | Navigation vers `/guide/studio/{id}` |
| **GF-03** | Éditer scène (POI + photo) | Haute | GF-02 réussi | 1. Ouvrir session Studio 2. Onglet POI → titre + adresse 3. Onglet Photos → upload `sample-photo.jpg` | POI sauvegardé, photo uploadée |
| **GF-04** | Prévisualiser le tour | Haute | GF-03 réussi | 1. Ouvrir session 2. Lien "Aperçu" | URL `/preview`, titre du tour visible |
| **GF-05** | Soumettre pour modération | Critique | GF-04 réussi | 1. Page preview 2. Cliquer "Soumettre" | Message confirmation "soumis/envoyé/modération" (timeout 15s) |

**Note** : Le consentement RGPD est géré automatiquement (dismiss du modal si présent).

### 8.3 Suite : Admin Flow (`admin-flow.spec.ts`)

| ID | Cas de test | Priorité | Précondition | Étapes | Résultat attendu |
|----|------------|----------|-------------|--------|-----------------|
| **AF-01** | File de modération | Critique | Tour soumis seedé (`seedSubmittedTour`) | 1. Login Admin (storageState) 2. `/admin/moderation` | Tour soumis visible dans la liste |
| **AF-02** | Examiner un tour | Haute | AF-01 réussi | 1. Cliquer "Examiner" sur le tour seedé | Navigation vers `/admin/moderation/{id}`, titre visible |
| **AF-03** | Renvoyer pour corrections | Haute | Tour soumis seedé | 1. Page modération détail 2. "Renvoyer au guide" 3. Saisir feedback 4. Confirmer | Message "renvoyé/corrections/revision" |
| **AF-04** | Approuver et publier | Critique | Tour soumis frais (nouveau seed) | 1. Cocher toute la checklist qualité 2. Vérifier bouton "Approuver" activé 3. Cliquer "Approuver" 4. Polling AppSync | Tour status = `published` (polling 15s) |

### 8.4 Suite : Catalogue (`catalogue.spec.ts`)

| ID | Cas de test | Priorité | Précondition | Étapes | Résultat attendu |
|----|------------|----------|-------------|--------|-----------------|
| **CAT-01** | Tour publié visible | Haute | `seedPublishedTour()` | 1. `/catalogue` 2. Cliquer ville "Grasse" | Titre du tour publié visible |
| **CAT-02** | Brouillon non visible | Haute | `seedDraftTour()` | 1. `/catalogue/grasse` | Titre du brouillon **absent** |

**Technique ISTQB** : Partition d'équivalence — classe "publié" (visible) vs classe "brouillon" (masqué).

### 8.5 Suite : Cross-platform (`cross-platform.spec.ts`)

| ID | Cas de test | Priorité | Précondition | Étapes | Résultat attendu |
|----|------------|----------|-------------|--------|-----------------|
| **XP-01** | Session mobile visible dans Studio | Haute | `seedMobileSession()` | 1. `/guide/studio` (auth Guide) | Titre "Session Mobile" visible, cliquable → ouverture session |
| **XP-02a** | Finaliser session mobile | Haute | XP-01 réussi | 1. Ouvrir session 2. Aperçu 3. Soumettre | Confirmation soumission |
| **XP-02b** | Tour publié dans catalogue | Haute | `seedPublishedTour()` | 1. `/catalogue/grasse` | Tour publié visible, nettoyage OK |

---

## 9. Tests unitaires (couverture)

### 9.1 Répartition par catégorie

| Catégorie | Fichiers de test | Exemples |
|-----------|-----------------|----------|
| **Composants UI** | 17 | TourMap, AudioRecorder, Teleprompter, ScenePhotos, QualityFeedback |
| **API Clients** | 13 | studio-appsync, moderation, transcription, guide-notifications |
| **Stores (Zustand)** | 5 | studio-session-store, recording-store, transcription-store |
| **Services Studio** | 7 | AudioPlayerService, PrompterEngine, BroadcastSync, StudioUpload |
| **Utilitaires** | 6 | logger, analytics, geo, filter-utils, notification-templates |
| **Config** | 1 | api-mode (stubs vs real) |
| **Hooks** | 1 | useAutoSave |
| **E2E Stub** | 1 | epic-14-web-e2e (modération en mode stub) |

### 9.2 Seuils de couverture (Jest)

| Métrique | Seuil minimum |
|----------|--------------|
| Branches | 37% |
| Fonctions | 63% |
| Lignes | 60% |
| Statements | 58% |

---

## 10. Gestion des risques

### 10.1 Risques produit

| ID | Risque | Probabilité | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| RP-01 | Régression authentification Cognito | Moyenne | Critique | Suite smoke (SMK-01) exécutée en priorité |
| RP-02 | Tour publié visible à tort / masqué à tort | Faible | Haute | Tests catalogue (CAT-01, CAT-02) avec partitions d'équivalence |
| RP-03 | Perte de données cross-platform (mobile → web) | Moyenne | Haute | Suite cross-platform (XP-01 à XP-02b) |
| RP-04 | Workflow modération cassé | Faible | Critique | Suite admin complète (AF-01 à AF-04) avec checklist |

### 10.2 Risques projet (test)

| ID | Risque | Probabilité | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| RT-01 | Flakiness des tests E2E | Moyenne | Moyenne | Budget flakiness < 2%, `pollUntil()` au lieu de `waitForTimeout()`, 1 worker |
| RT-02 | Expiration tokens Cognito en CI | Moyenne | Haute | Vérification `isTokenValid()` + ré-authentification automatique (3 tentatives) |
| RT-03 | Résidus de données après échec | Faible | Moyenne | `cleanupByPrefix()` dans `afterAll`, préfixe timestampé |
| RT-04 | Credentials exposées dans artéfacts | Faible | Critique | Trace/vidéo désactivées pour tests de login, `.env.e2e` exclu du VCS |

---

## 11. Métriques et reporting

### 11.1 Métriques collectées

| Métrique | Source | Objectif |
|----------|--------|----------|
| Taux de réussite E2E | Rapport Playwright HTML | 100% |
| Taux de flakiness | Historique des 10 dernières runs | < 2% |
| Durée d'exécution totale | Reporter `list` | < 5 min (local) |
| Couverture unitaire | Rapport Jest coverage | Seuils ci-dessus |

### 11.2 Rapports

| Rapport | Emplacement | Format |
|---------|-------------|--------|
| E2E HTML | `playwright-report/` | HTML interactif |
| E2E liste | Console (stdout) | Texte |
| Couverture Jest | `coverage/` | HTML + LCOV |

### 11.3 Commandes d'exécution

```bash
# Tests unitaires
npm test

# Tests E2E
npm run e2e

# E2E avec interface Playwright
npm run e2e:ui

# Consulter le rapport E2E
npm run e2e:report
```

---

## 12. Glossaire

| Terme | Définition |
|-------|-----------|
| **E2E** | End-to-End — test de bout en bout simulant un utilisateur réel |
| **Smoke test** | Test de fumée — validation rapide que l'infrastructure de base fonctionne |
| **Seeding** | Injection de données de test dans le backend avant l'exécution |
| **Cleanup** | Suppression des données de test après exécution |
| **Flakiness** | Test instable donnant des résultats différents sans changement de code |
| **Storage State** | État de session Playwright (localStorage, cookies) pour simuler un utilisateur authentifié |
| **AppSync** | Service AWS GraphQL (backend TourGuide) |
| **Cognito** | Service AWS d'authentification (SSO TourGuide) |
| **POI** | Point of Interest — point d'intérêt géolocalisé dans un tour |
| **RGPD** | Règlement Général sur la Protection des Données |
| **pollUntil()** | Helper d'assertion asynchrone — polling 1s, timeout configurable |
| **Partition d'équivalence** | Technique ISTQB de conception de tests basée sur des classes d'entrées équivalentes |
| **Transition d'états** | Technique ISTQB modélisant les états et transitions d'un objet sous test |

---

*Document généré conformément aux standards ISTQB Foundation Level v4.0 et IEEE 829.*
