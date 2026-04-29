# Story Refonte-2: Dashboard Studio Murmure

**Status:** ready-for-review
**Phase:** 3a / 6 (refonte Studio Murmure — Dashboard)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7 Phase 3 (écran 1)
**Source design:** [docs/design/ds/studio-dashboard.jsx](../docs/design/ds/studio-dashboard.jsx)
**Estimation:** 1 j-personne
**Branche:** `feat/refonte-studio-murmure-dashboard`
**Dépend de:** Refonte-1 (Shell Studio) — `feat/refonte-studio-murmure-shell`

---

## Summary
Refonte complète de la page d'accueil `/guide/studio` selon la charte Murmure : hero « Reprendre », bloc 4 KPIs mensuels, table top tours, encart avis récents, suggestion contextuelle. La logique de listing actuelle (liste de sessions avec delete modal) est **déplacée** vers la future route `/guide/studio/tours` (story Refonte-3).

Données : on travaille avec les données réelles disponibles (`listStudioSessions`, `listTourComments`, `listLanguagePurchases`) et on affiche des empty states / valeurs nulles élégantes (« — ») pour les métriques non encore branchées (revenus exacts, écoutes consolidées) plutôt que des valeurs mockées.

---

## Acceptance Criteria

### Composants créés (`src/components/studio/dashboard/`)

- [x] `KpiCard.tsx` — carte stat (icône colorée + label + valeur display + delta optionnel)
- [x] `ResumeHero.tsx` — hero « Reprendre » + jauge progression à droite
- [x] `TopTourRow.tsx` — ligne table top tours avec bande couleur ville + sparkline SVG
- [x] `ReviewItem.tsx` — card avis (citation en `font-editorial` italic)
- [x] `SuggestionCard.tsx` — encart pastel dashed avec CTA, variantes `mer | olive`
- [x] `index.ts` — barrel exports

### Refonte de la page `src/app/guide/studio/page.tsx`

- [x] Hero `<ResumeHero>` si une session reprenable existe (draft/editing/recording/transcribing/revision_requested)
- [x] Bloc 4 `<KpiCard>` (Tours publiés / Revenus nets / Note moyenne / Avis récents) — valeurs « — » si data manquante
- [x] Bloc « Tours qui marchent » — top sessions publiées (sort par updatedAt desc)
- [x] Bloc « Avis récents » — 3 derniers commentaires aplatis (sort par date desc)
- [x] `<SuggestionCard>` contextuelle (règle MVP : tour publié sans EN → suggérer traduction)

### Logique métier (helpers)

- [x] `src/lib/studio/dashboard-helpers.ts` :
  - `selectResumableSession(sessions, lastSessionId)`
  - `selectTopTours(sessions, limit=4)`
  - `selectRecentReviews(sessions, commentsBySession, limit=3)`
  - `selectSuggestion(sessions, purchasesBySession)`
- [x] Tests unitaires correspondants (13 tests)

### Conservation de l'existant

- [x] `groupSessionsByTour` extrait dans `src/lib/studio/group-sessions.ts` (réutilisable par Refonte-3)
- [x] Modale delete extraite dans `src/components/studio/session-list/delete-session-dialog.tsx`

### États

- [x] Loading : skeleton cohérent (cards beiges animate-pulse)
- [x] Empty : message « Vous n'avez pas encore créé de tour » + CTA grenadine `/guide/studio/nouveau`
- [x] Error : bandeau danger + bouton « Réessayer »

### Tokens & DS

- [x] **0 hex hardcodé** dans `src/components/studio/dashboard/` (vérifié par grep)
- [x] **0 font-family ad-hoc** — `font-display`, `font-editorial`, `font-mono` du preset
- [x] Eyebrows via `tg-eyebrow` utility class
- [x] Couleurs SVG (sparkline) : import dynamique de `tgColors` du DS, pas de hex inline

### Tests

- [x] `KpiCard.test.tsx` — 4 tests
- [x] `ResumeHero.test.tsx` — 6 tests (rendu, progression, greeting, fallback titre)
- [x] `TopTourRow.test.tsx` — 6 tests (ville, href, fallback —, format virgule, sparkline conditionnelle)
- [x] `ReviewItem.test.tsx` — 4 tests
- [x] `SuggestionCard.test.tsx` — 4 tests (Link vs button, color variant)
- [x] `dashboard-helpers.test.ts` — 13 tests
- [x] `group-sessions.test.ts` — 8 tests
- [x] `npm run test` → **939/939 ✓** (45 nouveaux)
- [x] Lint sans nouveau warning sur les fichiers ajoutés
- [x] `npm run tg:audit` → **clean. 0 violation. 229 fichiers.**

---

## Files

### Nouveaux
- `src/components/studio/dashboard/KpiCard.tsx` + test
- `src/components/studio/dashboard/ResumeHero.tsx` + test
- `src/components/studio/dashboard/TopTourRow.tsx` + test
- `src/components/studio/dashboard/ReviewItem.tsx` + test
- `src/components/studio/dashboard/SuggestionCard.tsx` + test
- `src/components/studio/dashboard/index.ts`
- `src/components/studio/session-list/delete-session-dialog.tsx`
- `src/lib/studio/group-sessions.ts` + test
- `src/lib/studio/dashboard-helpers.ts` + test

### Modifiés
- `src/app/guide/studio/page.tsx` — refonte complète vers Dashboard Murmure

---

## Hors scope (volontairement)
- Création de `/guide/studio/tours` (route « Mes tours ») → story **Refonte-3**
- Création de `/guide/studio/profil` → story **Refonte-4**
- Création de `/guide/studio/revenus` (avec histogramme Recharts) → story **Refonte-5**
- Backend pour métriques exactes (écoutes consolidées, revenus nets, ratings) → mode démo / valeurs nulles seulement

---

## Définition de Done
- [x] Toutes les AC ci-dessus cochées
- [x] Story marquée `ready-for-review`
- [ ] Validation visuelle sur `http://localhost:3000/guide/studio` — _étape utilisateur._

---

## Dev Agent Record

**Agent :** Amelia (BMAD dev) — branche `feat/refonte-studio-murmure-dashboard`.

### Décisions notables
1. **Aucune valeur mockée** : KPIs « Revenus nets » et « Note moyenne » affichent `—` plutôt qu'un faux chiffre. Le backend pour ces métriques sera ajouté plus tard. La cohérence éditoriale prime sur l'effet visuel.
2. **Top tours sans plays/rating** : actuellement `plays=null` / `rating=null` car aucun endpoint analytics. La sparkline est conditionnelle (≥ 2 points), donc les rangées s'affichent proprement même sans data.
3. **`selectResumableSession`** : statuts reprenables = `draft | editing | recording | transcribing | revision_requested`. Un tour `published` n'est jamais proposé pour reprise (intentionnel).
4. **Hero sans gradient** : le brief §4 règle 2 interdit les variantes de grenadine (« UNE couleur »). J'ai remplacé le dégradé du source design par un flat `bg-grenadine`.
5. **TopTourRow + sparkline** : SVG `stroke` n'accepte pas les classes Tailwind, donc j'importe `tgColors` du DS pour passer la couleur en hex au polyline. Aucun hex hardcodé.
6. **Suggestion engine MVP** : règle unique pour l'instant — tour publié sans EN → suggérer la traduction. Architecture extensible pour ajouter d'autres règles sans changer l'API du composant.
7. **Extraction `groupSessionsByTour` + `DeleteSessionDialog`** : préparation pour Refonte-3 (« Mes tours »).

### Validation
- `npm test` → **116 suites / 939 tests passent** (45 nouveaux)
- `npm run tg:audit` → **clean. 0 violation. 229 fichiers scannés.**
- `grep '#hex'` sur `src/components/studio/dashboard/` → **0 match**
- Typecheck : 0 nouvelle erreur sur les fichiers de la story
- Dev server : `GET /guide/studio 200` (compile ~71ms, render ~416ms first paint)

---

## Changelog
- `2026-04-28` — Story exécutée par Amelia (agent dev BMAD). 16 fichiers nouveaux, 1 modifié, 45 nouveaux tests. Tous les AC validés. Branche `feat/refonte-studio-murmure-dashboard` prête pour PR.
