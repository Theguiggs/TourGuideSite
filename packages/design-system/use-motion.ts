/**
 * TourGuide Design System — useMotion (Story 1.6, AC 5)
 *
 * Hook utilitaire qui résout une paire (duration, easing) depuis les tokens
 * motion. Le nom suit la convention React hook par cohérence d'usage, mais
 * l'implémentation est **pure JS** (pas de side effect, pas de useState) —
 * donc utilisable indifféremment côté Web ou React Native sans dépendance
 * platform-specific.
 *
 * Compatibilité multi-plateforme :
 * - Web : passer le résultat à CSS-in-JS ou inline `transition` style.
 *   ```ts
 *   const { duration, easing } = useMotion('promenade');
 *   <div style={{ transition: `transform ${duration}ms ${easing}` }} />
 *   ```
 * - RN  : passer à Reanimated 3 `withTiming` ou LayoutAnimation config.
 *   ```ts
 *   const { duration } = useMotion('tournepage', 'arriver');
 *   withTiming(target, { duration });
 *   ```
 *
 * Source : `_bmad-output/stories/1-6-motion-sound-tokens.md` AC 5.
 */

import { tgMotion, type TgMotionDuration, type TgMotionEasing } from './motion';

/**
 * Résout une duration token + un easing token vers leurs valeurs concrètes.
 *
 * @param durationKey — clé de duration (`lecture` | `promenade` | `tournepage`).
 * @param easingKey — clé d'easing (défaut `flaner`).
 * @returns `{ duration: number (ms), easing: string (cubic-bezier) }`.
 */
export function useMotion(
  durationKey: TgMotionDuration,
  easingKey: TgMotionEasing = 'flaner',
): { duration: number; easing: string } {
  return {
    duration: tgMotion.duration[durationKey],
    easing: tgMotion.easing[easingKey],
  };
}
