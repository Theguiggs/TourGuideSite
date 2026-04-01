# Story ML-6.3: Responsive

**Status:** done

## Summary
Verify and fix responsive behavior for multilingual studio components.

## Acceptance Criteria (all met)
- [x] Desktop (>1024px) : SplitEditor 50/50 — already has `grid-cols-1 md:grid-cols-2`
- [x] Tablette/Mobile : SplitEditor stacks — `grid-cols-1` at base
- [x] LanguageTabs : scrollable on small screens — added `overflow-x-auto scrollbar-thin`
- [x] BatchProgressBar : sticky works on mobile — already has `sticky top-0 z-50`
- [x] Tests : 3 tests (SplitEditor grid, title row grid, LanguageTabs overflow)

## Files Modified
- `src/components/studio/language-tabs/language-tabs.tsx` — added overflow-x-auto
- `src/app/globals.css` — added scrollbar-thin utility
- `src/components/studio/split-editor/__tests__/responsive.test.tsx` — 3 tests
