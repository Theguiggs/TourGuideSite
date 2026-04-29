/**
 * Story 5.10.5 — Illustrations empty-states RN (sub-export
 * `@tourguide/design-system/illustrations-rn`).
 *
 * Miroir natif via `react-native-svg` du barrel `./illustrations` Web.
 * `currentColor` n'étant pas supporté nativement par `react-native-svg`,
 * chaque illustration fallback sur `tgColors.ink` (#102A43) si aucune
 * couleur explicite n'est passée.
 *
 * Pattern d'import consumer RN :
 *   import { EmptyOffline, EmptyGps } from '@tourguide/design-system/illustrations-rn';
 */

export { EmptyOffline } from './EmptyOffline';
export type { EmptyOfflineProps } from './EmptyOffline';
export { EmptyGps } from './EmptyGps';
export type { EmptyGpsProps } from './EmptyGps';
