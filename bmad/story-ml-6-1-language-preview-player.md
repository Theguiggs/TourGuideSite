# Story ML-6.1: LanguagePreviewPlayer

**Status:** done

## Summary
Language preview player component for multilingual audio playback in the Preview page.

## Acceptance Criteria (all met)
- [x] Composant `LanguagePreviewPlayer`
- [x] Mode teaser : 10s de la scene 1 (bouton "Ecouter un extrait")
- [x] Mode complet : enchaine toutes les scenes dans la langue (bouton "Preview complete")
- [x] Selecteur de langue dans l'ecran Preview existant
- [x] Alerte si scenes sans audio dans la langue selectionnee
- [x] Tests : 4 tests (teaser, complet, selecteur langue, alerte)

## Files
- `src/components/studio/language-preview/language-preview-player.tsx` — component
- `src/components/studio/language-preview/index.ts` — barrel export
- `src/components/studio/language-preview/__tests__/language-preview-player.test.tsx` — 4 tests
- `src/app/guide/studio/[sessionId]/preview/page.tsx` — wired language selector + player
