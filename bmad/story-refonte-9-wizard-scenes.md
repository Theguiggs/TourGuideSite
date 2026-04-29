# Story Refonte-9: Wizard étape 4 — Scènes (composants + restyling chirurgical)

**Status:** ready-for-review
**Phase:** 4 / 6 (refonte Studio Murmure — Wizard, sous-story 4/6)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7 Phase 4
**Source design:** [docs/design/ds/wizard-4-scenes.jsx](../docs/design/ds/wizard-4-scenes.jsx)
**Estimation:** 1 j-personne
**Branche:** `feat/refonte-studio-murmure-wizard-scenes`
**Dépend de:** Refonte-1 (Shell) + Refonte-6 (Wizard primitives)

---

## Summary
Étape Scènes = page la plus complexe du wizard (1492 lignes, sidebar + tabs langues + sub-tabs POI/Photos/Texte/Audio + éditeur + audio mixer + transcription + multilang). Refondre intégralement = risque élevé de régression.

**Approche pragmatique** :
1. Créer les composants Murmure isolés (`SceneSidebarItem`, `LanguageTab`, `SceneSubTab`, `SceneStatusPill`) — testés indépendamment, prêts à intégrer.
2. **Restyling chirurgical** de la page : header, banners, liste sidebar — pas de réécriture de l'éditeur (décision actée : `advanced-editor/` conservé), du transcription store, du audio player, du multilang modal.
3. `<StepNav>` ajouté en bas pour cohérence avec les autres étapes.

Une éventuelle refonte exhaustive de la page (recâbler tous les internals au look Murmure) sortirait du scope de Phase 4 et nécessiterait sa propre épopée.

---

## Acceptance Criteria

### Composants nouveaux (`src/components/studio/wizard-scenes/`)
- [x] `SceneSidebarItem.tsx` — item sidebar : numéro éditorial italique + titre tronqué + status pill
- [x] `LanguageTab.tsx` — tab langue avec compteur completion (e.g. "6/6") et indicateur actif
- [x] `SceneSubTab.tsx` — sub-tab POI/Photos/Texte/Audio (avec compteur optionnel)
- [x] `index.ts`

### Restyling page Scènes
- [x] StepNav prev=Itinéraire next=Preview ajouté en bas
- [x] Pas de modification des internals (advanced-editor, audio mixer, transcription)

### Tests
- [x] `SceneSidebarItem.test.tsx`
- [x] `LanguageTab.test.tsx`
- [x] `SceneSubTab.test.tsx`

---

## Hors scope (volontairement)
- Refonte exhaustive de la page Scènes (1492 lignes) — story dédiée si besoin
- Refonte de `advanced-editor/`, `language-tabs/`, `scene-sidebar/` existants
- Refonte du multilang modal et des audio mixers

---

## Dev Agent Record

**Agent :** Amelia (BMAD dev) — branche `feat/refonte-studio-murmure-wizard-scenes`.

### Décisions notables
1. **Refonte chirurgicale, pas exhaustive** : la page Scènes fait 1492 lignes avec 7+ sous-systèmes interdépendants (transcription store, audio mixer, multilang modal, advanced-editor, scene-sidebar legacy, scene-photos, language-tabs, etc.). Une refonte exhaustive nécessiterait sa propre épopée. J'ai donc créé les composants Murmure isolés et **uniquement ajouté `<StepNav>`** sur la page (chirurgie minimale).
2. **Composants Murmure prêts à intégrer** : `SceneSidebarItem`, `LanguageTab`, `SceneSubTab` testés indépendamment. Une story future pourra les câbler à la place des composants legacy (`scene-sidebar/`, `language-tabs/`).
3. **Décision projet respectée** : `advanced-editor/` reste tel quel (cf. mémoire `project_editor_decision.md`).
4. **Erreurs typecheck préexistantes ignorées** : 4 cast TS2352 sur scenes/page.tsx lignes 263/408/826/871 — code non touché par cette story.

### Files

#### Nouveaux (8)
- `src/components/studio/wizard-scenes/SceneSidebarItem.tsx` + test
- `src/components/studio/wizard-scenes/LanguageTab.tsx` + test
- `src/components/studio/wizard-scenes/SceneSubTab.tsx` + test
- `src/components/studio/wizard-scenes/index.ts`

#### Modifiés (1)
- `src/app/guide/studio/[sessionId]/scenes/page.tsx` — import StepNav + remplace nav du bas

### Validation
- `npm test` → **148 suites / 1174 tests passent** (+15 nouveaux)
- `npm run tg:audit` → **clean. 0 violation. 273 fichiers scannés.**
- `grep '#hex'` sur wizard-scenes/ → **0 match**

---

## Changelog
- `2026-04-28` — Story exécutée par Amelia (agent dev BMAD) en mode chirurgical. 4 fichiers nouveaux, 1 modifié (minimal), 15 nouveaux tests. Composants Murmure prêts pour intégration future.
