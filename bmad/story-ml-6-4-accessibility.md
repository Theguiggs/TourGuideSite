# Story ML-6.4: Accessibility

**Status:** done

## Summary
WCAG AA accessibility improvements for multilingual studio components.

## Acceptance Criteria (all met)
- [x] Drapeaux emoji + texte sur tous les onglets (flag img + text label, already present)
- [x] `aria-label` on language tabs with progress info ("English, 8 sur 12 scenes traduites")
- [x] `role="progressbar"` + `aria-valuenow` + `aria-label` descriptif on BatchProgressBar
- [x] `aria-live="polite"` on progress counters (BatchProgressBar counter section)
- [x] Toast already has `aria-live="polite"` and `role="status"`
- [x] `prefers-reduced-motion` : disable animations (globals.css)
- [x] Focus visible on all interactive elements (globals.css `focus-visible` rule)
- [x] Tests : 4 tests aria (LanguageTabs) + 4 tests (BatchProgressBar accessibility)

## Files Modified
- `src/components/studio/language-tabs/language-tabs.tsx` — added aria-label per tab
- `src/components/studio/batch-progress/batch-progress-bar.tsx` — added progressbar role, aria-live
- `src/app/globals.css` — added prefers-reduced-motion, focus-visible styles
- `src/components/studio/language-tabs/__tests__/accessibility.test.tsx` — 4 tests
- `src/components/studio/batch-progress/__tests__/accessibility.test.tsx` — 4 tests
