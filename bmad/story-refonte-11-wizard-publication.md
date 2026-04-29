# Story Refonte-11: Wizard étape 6 — Publication

**Status:** ready-for-review
**Phase:** 4 / 6 (Wizard sous-story 6/6 — finale)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7
**Source design:** [docs/design/ds/wizard-6-publication.jsx](../docs/design/ds/wizard-6-publication.jsx)
**Branche:** `feat/refonte-studio-murmure-wizard-publication`

## Summary
Composants Murmure pour la dernière étape du wizard : `<StatusBanner>` (bandeau status coloré), `<ActionRow>` (action avec icône + description + flèche), `<LanguageStatusRow>` (ligne tableau langues) + `<StepNav>` prev=Preview (pas de next). Page existante (562 lignes) conservée intacte sur la logique de soumission/modération.

## Acceptance Criteria
- [x] `StatusBanner.tsx` + test
- [x] `ActionRow.tsx` + test
- [x] `LanguageStatusRow.tsx` + test
- [x] StepNav prev=Preview ajouté
- [x] 0 hex hardcodé, audit clean

## Files
### Nouveaux
- `src/components/studio/wizard-publication/StatusBanner.tsx` + test
- `src/components/studio/wizard-publication/ActionRow.tsx` + test
- `src/components/studio/wizard-publication/LanguageStatusRow.tsx` + test
- `src/components/studio/wizard-publication/index.ts`
### Modifiés
- `src/app/guide/studio/[sessionId]/submission/page.tsx` — import StepNav + ajout en bas

## Dev Agent Record
**Agent :** Amelia. Approche chirurgicale : composants Murmure isolés + StepNav. Page (562 lignes) intacte.

### Validation
- `npm test` → **153 suites / 1195 tests passent** (+12 nouveaux)
- `npm run tg:audit` → **clean. 0 violation. 280 fichiers.**
- `grep '#hex'` sur wizard-publication/ → **0 match**

## Changelog
- `2026-04-28` — 4 fichiers nouveaux + 1 modifié (import StepNav). Branche prête pour PR. **Phase 4 complète (6 sous-stories Refonte-6 à Refonte-11).**
