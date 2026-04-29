# Story Refonte-10: Wizard étape 5 — Preview

**Status:** ready-for-review
**Phase:** 4 / 6 (Wizard sous-story 5/6)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7
**Source design:** [docs/design/ds/wizard-5-preview.jsx](../docs/design/ds/wizard-5-preview.jsx)
**Branche:** `feat/refonte-studio-murmure-wizard-preview`

## Summary
Composants Murmure pour Preview (`<ViewToggle>` Studio/Catalogue, `<PlayAllButton>` grenadine pleine largeur) + ajout StepNav. La page (718 lignes) conserve sa logique audio/multilang ; restyling chirurgical seulement.

## Acceptance Criteria
- [x] `ViewToggle.tsx` + test
- [x] `PlayAllButton.tsx` + test
- [x] Ajout StepNav prev=Scènes next=Publication
- [x] 0 hex hardcodé, audit clean

## Files
### Nouveaux
- `src/components/studio/wizard-preview/ViewToggle.tsx` + test
- `src/components/studio/wizard-preview/PlayAllButton.tsx` + test
- `src/components/studio/wizard-preview/index.ts`
### Modifiés
- `src/app/guide/studio/[sessionId]/preview/page.tsx` — import StepNav + remplace nav

## Dev Agent Record
**Agent :** Amelia. Approche chirurgicale identique à Refonte-9 : composants Murmure isolés + StepNav. Page (718 lignes) intacte sur la logique audio/multilang/publication.

### Validation
- `npm test` → **150 suites / 1183 tests passent** (+9 nouveaux)
- `npm run tg:audit` → **clean. 0 violation. 276 fichiers.**

## Changelog
- `2026-04-28` — 3 fichiers nouveaux + 1 modifié (import StepNav + StepNav rendered). Branche `feat/refonte-studio-murmure-wizard-preview` prête pour PR.
