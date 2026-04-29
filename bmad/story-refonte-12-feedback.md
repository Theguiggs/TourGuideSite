# Story Refonte-12: États non-fonctionnels (Phase 5)

**Status:** ready-for-review
**Phase:** 5 / 6 (refonte Studio Murmure — Empty/Loading/Error/Toast unifiés)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §7 Phase 5
**Branche:** `feat/refonte-studio-murmure-feedback`

## Summary
Création de composants Murmure unifiés pour les états non-fonctionnels :
- `<EmptyState>` — état vide générique (titre + message + CTA optionnel)
- `<ErrorBanner>` — bandeau erreur avec retry inline
- `<LoadingSkeleton>` — wrapper skeleton animate-pulse
- `<Toast>` + `useToastStore()` — système de toast bottom-right cohérent (grenadine-soft success / mer-soft info / ocre-soft warning / grenadine error)

Ces composants sont **prêts à intégrer**. Une migration progressive des patterns ad-hoc existants pourra se faire au fil des stories ; cette PR ne touche pas les pages existantes (sauf intégration du `<Toaster>` global au layout root du Studio).

## Acceptance Criteria
- [x] `EmptyState.tsx` + tests
- [x] `ErrorBanner.tsx` + tests
- [x] `LoadingSkeleton.tsx` + tests
- [x] `Toast.tsx` + `Toaster.tsx` + `useToast.ts` (Zustand store) + tests
- [x] `<Toaster>` câblé dans `src/app/guide/studio/layout.tsx`
- [x] 0 hex hardcodé, audit clean

## Files
### Nouveaux
- `src/components/studio/feedback/EmptyState.tsx` + test
- `src/components/studio/feedback/ErrorBanner.tsx` + test
- `src/components/studio/feedback/LoadingSkeleton.tsx` + test
- `src/components/studio/feedback/Toast.tsx` + test
- `src/components/studio/feedback/Toaster.tsx`
- `src/components/studio/feedback/index.ts`
- `src/lib/stores/toast-store.ts` + test
### Modifiés
- `src/app/guide/studio/layout.tsx` — ajoute `<Toaster>`

## Hors scope
- Migration des pages existantes vers les nouveaux composants (gradual refactor)
- Détection offline (navigator.onLine) — story dédiée
- A11y axe-core scan (Phase 6)

## Dev Agent Record

**Agent :** Amelia (BMAD dev) — branche `feat/refonte-studio-murmure-feedback`.

### Décisions notables
1. **`useToast()` hook ergonomique** : expose `success/info/warning/error/show/dismiss`. Erreurs ont durée par défaut 6s.
2. **Toaster monté UNE seule fois** dans `app/guide/studio/layout.tsx`.
3. **Migration progressive non incluse** : les pages existantes gardent leurs patterns ad-hoc.
4. **`StudioToast` legacy conservée** (couplée au transcription store).

### Files

#### Nouveaux (8)
- `src/components/studio/feedback/EmptyState.tsx` + test
- `src/components/studio/feedback/ErrorBanner.tsx` + test
- `src/components/studio/feedback/LoadingSkeleton.tsx` + test
- `src/components/studio/feedback/Toast.tsx` + test
- `src/components/studio/feedback/Toaster.tsx`
- `src/components/studio/feedback/index.ts`
- `src/lib/stores/toast-store.ts` + test

#### Modifiés (1)
- `src/app/guide/studio/layout.tsx` — Toaster monté

### Validation
- `npm test` → **158 suites / 1227 tests passent** (+32 nouveaux)
- `npm run tg:audit` → **clean. 0 violation. 287 fichiers.**
- `grep '#hex'` sur feedback/ → **0 match**

## Changelog
- `2026-04-28` — Story exécutée. 8 fichiers nouveaux + 1 modifié. 32 nouveaux tests. **Phase 5 terminée**. Composants prêts pour migration progressive.
