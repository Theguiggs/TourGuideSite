/**
 * TourGuide Design System — Sub-export React Native
 *
 * Placeholder pour les composants RN miroir (Pressable, View, etc.).
 * À remplir en **Story 2.x** (composants RN miroir des composants Web).
 *
 * Pour l'instant, ce sub-export ne fournit que les tokens (équivalent au sub-export
 * `@tourguide/design-system/tokens`) afin qu'un import depuis `/rn` ne casse pas.
 *
 * Usage tokens (déjà disponible aujourd'hui) :
 *   import { tg } from '@tourguide/design-system/rn';
 *
 * Usage composants RN (Story 2.x — pas encore implémenté) :
 *   import { Button, Card, Pin } from '@tourguide/design-system/rn';
 */

// ─── Tokens re-exportés (sûr en RN)
export * from '../tokens';

// ─── Composants RN miroir : à ajouter en Story 2.x
// Story 2.1 — Button RN
export * from '../components-rn/Button';
// Story 2.3 — Card RN
export * from '../components-rn/Card';
// Story 2.4 — Pin + PinNegatif RN
export * from '../components-rn/Pin';
// Story 2.2 — Chip RN
export * from '../components-rn/Chip';
// Story 2.5 — Typography RN (Eyebrow, PullQuote, NumberMark)
export * from '../components-rn/Typography';
// Story 2.6 — Player RN miroir (mini + full)
export * from '../components-rn/Player';
// ...
