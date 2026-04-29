/**
 * TourGuide Design System — Index principal (entry par défaut)
 *
 * Cet entry point exporte UNIQUEMENT les tokens et types — sûr en Web ET en
 * React Native. Les composants Web (qui utilisent `<button>`, `<div>`, etc.)
 * vivent sous le sub-export `@tourguide/design-system/web`. Les composants RN
 * miroir (Story 2.x, Pressable, View) vivront sous `@tourguide/design-system/rn`.
 *
 * Usage tokens (Web + RN) :
 *   import { tg } from '@tourguide/design-system';
 *   import { tg } from '@tourguide/design-system/tokens'; // équivalent
 *
 * Usage composants Web :
 *   import { Button, Card, Pin } from '@tourguide/design-system/web';
 *
 * Usage composants RN (Story 2.x) :
 *   import { Button, Card, Pin } from '@tourguide/design-system/rn';
 *
 * Découverte API (Story 2.7) :
 *   cd design-system && npm install && npm run storybook
 *   → http://localhost:6006 (tokens + 9 composants en variants)
 */

// ─── Re-exports tokens (values + types via export *)
export * from './tokens';

// ─── Re-exports editorial lexicon (Story 1.4 — microcopy + forbiddenTerms + voiceRules)
export * from './editorial';

// ─── Re-exports feature flag (Story 1.7 — DS rollback v2 → v1)
export * from './feature-flag';
export { useDsVersion, FeatureFlagContext, FeatureFlagReactProvider } from './use-ds-version';

// ─── Re-exports motion + sound + useMotion (Story 1.6)
export * from './motion';
export * from './sound';
export { useMotion } from './use-motion';
