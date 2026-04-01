# Story ML-6.2: Templates i18n transitions POI

**Status:** done

## Summary
Localized transition message templates between POIs for multilingual preview.

## Acceptance Criteria (all met)
- [x] `src/lib/multilang/i18n-transitions.ts` : templates localises par langue
- [x] Templates : "Dirigez-vous vers {poi}" / "Head towards {poi}" / "Dirijase hacia {poi}" etc.
- [x] Support des 5 langues EU + extensible (fallback to English)
- [x] Utilise dans le LanguagePreviewPlayer entre les scenes
- [x] Pas de segments de traduction — genere a partir du template + nom du POI
- [x] Tests : 4+ tests (chaque langue, POI avec caracteres speciaux)

## Files
- `src/lib/multilang/i18n-transitions.ts` — transition templates
- `src/lib/multilang/__tests__/i18n-transitions.test.ts` — 10 tests
