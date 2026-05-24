/**
 * TourGuide Design System — Sub-export Web
 *
 * Composants React DOM (utilisent `<button>`, `<div>`, `<svg>`, etc.).
 * NON utilisables en React Native — voir `@murmure/design-system/rn`
 * pour les composants miroir RN (Story 2.x).
 *
 * Exports (enumerated):
 *   - Button
 *   - Card
 *   - Chip
 *   - Pin
 *   - PinNegatif
 *   - Player
 *   - Eyebrow
 *   - PullQuote
 *   - NumberMark
 *
 * Usage :
 *   import { Button, Card, Chip, Pin, PinNegatif, Player, Eyebrow, PullQuote, NumberMark }
 *     from '@murmure/design-system/web';
 */

// ─── Tokens re-exportés pour confort (mêmes que `@murmure/design-system/tokens`)
export * from '../tokens';

// ─── Composants Web
export * from '../components/Button';
export * from '../components/Card';
export * from '../components/Chip';
export * from '../components/Pin';
export * from '../components/Player';
export * from '../components/Typography';
