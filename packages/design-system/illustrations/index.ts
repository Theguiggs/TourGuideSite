/**
 * Story 5.10.5 — Illustrations empty-states Web (sub-export
 * `@tourguide/design-system/illustrations`).
 *
 * IMPORTANT : ce barrel n'est volontairement **pas** re-exporté depuis le
 * default `index.ts` du package, pour préserver le tree-shaking et éviter
 * d'embarquer la résolution de `react-native-svg` côté Web (cf. NFR perf,
 * cohérent avec Story 3.6 icons).
 *
 * Pattern d'import consumer Web :
 *   import { EmptyOffline, EmptyGps } from '@tourguide/design-system/illustrations';
 *
 * Pour le miroir RN, utiliser `@tourguide/design-system/illustrations-rn`.
 */

export { EmptyOffline } from './EmptyOffline';
export type { EmptyOfflineProps } from './EmptyOffline';
export { EmptyGps } from './EmptyGps';
export type { EmptyGpsProps } from './EmptyGps';
