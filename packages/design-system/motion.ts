/**
 * TourGuide Design System — Motion tokens (Story 1.6)
 *
 * Rationale (posture éditoriale "calme, lente, cultivée") :
 * - Le DS TourGuide privilégie la subtilité plutôt que l'urgence.
 * - Les durées suivent une progression narrative : `lecture` (réaction UI) <
 *   `promenade` (transition standard) < `tournepage` (transition de scène).
 * - Les easings portent des noms évoquant la marche : `flaner` (doux),
 *   `descendre` (ease-in-out), `arriver` (decelerate, geste éditorial assumé).
 *
 * Source : `_bmad-output/stories/1-6-motion-sound-tokens.md` AC 1.
 *
 * Compat ascendante : `tgDuration` et `tgEase` legacy (Story 1.2) sont
 * conservés dans `tokens.ts` mais marqués `@deprecated`. Cibler ces nouveaux
 * tokens motion dans tout nouveau code.
 */

/**
 * Durations (millisecondes) — calme = ralenti.
 *
 * - `lecture` (180 ms) : micro-feedback (hover, focus, état actif).
 * - `promenade` (320 ms) : transition standard (panneau, chip).
 * - `tournepage` (500 ms) : transition narrative forte (passage entre POI).
 */
export const tgMotionDuration = {
  lecture: 180,
  promenade: 320,
  tournepage: 500,
} as const;

/**
 * Easings — courbes cubic-bezier nommées selon des gestes de promenade.
 *
 * - `flaner` : doux, naturel (ease standard CSS).
 * - `descendre` : ease-in-out fort, pour transitions promenade.
 * - `arriver` : decelerate Material, arrivée nette.
 */
export const tgMotionEasing = {
  flaner: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  descendre: 'cubic-bezier(0.42, 0, 0.58, 1)',
  arriver: 'cubic-bezier(0.0, 0, 0.2, 1)',
} as const;

/**
 * Aggregate motion tokens — exposé via `tg.motion` dans `tokens.ts`.
 */
export const tgMotion = {
  duration: tgMotionDuration,
  easing: tgMotionEasing,
} as const;

export type TgMotion = typeof tgMotion;
export type TgMotionDuration = keyof typeof tgMotionDuration;
export type TgMotionEasing = keyof typeof tgMotionEasing;

/** Alias historiques utilisés dans la story (compat avec AC 1). */
export type TgDurationKey = TgMotionDuration;
export type TgEasingKey = TgMotionEasing;
