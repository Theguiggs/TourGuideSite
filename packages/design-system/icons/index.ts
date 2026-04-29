/**
 * Story 3.6 — Set 23 icônes Web (sub-export `@tourguide/design-system/icons`).
 *
 * IMPORTANT : ce barrel n'est volontairement **pas** re-exporté depuis le
 * default `index.ts` du package, pour préserver le tree-shaking et éviter
 * d'embarquer la résolution de `react-native-svg` côté Web (cf. NFR perf).
 *
 * Pattern d'import consumer Web :
 *   import { IconHome, IconPlay } from '@tourguide/design-system/icons';
 *
 * Pour le miroir RN, utiliser `@tourguide/design-system/icons-rn`.
 */

// Navigation (7)
export { IconHome } from './Home';
export type { IconHomeProps } from './Home';
export { IconCatalog } from './Catalog';
export type { IconCatalogProps } from './Catalog';
export { IconProfile } from './Profile';
export type { IconProfileProps } from './Profile';
export { IconSearch } from './Search';
export type { IconSearchProps } from './Search';
export { IconSettings } from './Settings';
export type { IconSettingsProps } from './Settings';
export { IconBack } from './Back';
export type { IconBackProps } from './Back';
export { IconClose } from './Close';
export type { IconCloseProps } from './Close';

// Lecture (6)
export { IconPlay } from './Play';
export type { IconPlayProps } from './Play';
export { IconPause } from './Pause';
export type { IconPauseProps } from './Pause';
export { IconSkipForward15 } from './SkipForward15';
export type { IconSkipForward15Props } from './SkipForward15';
export { IconSkipBack15 } from './SkipBack15';
export type { IconSkipBack15Props } from './SkipBack15';
export { IconDownload } from './Download';
export type { IconDownloadProps } from './Download';
export { IconDownloaded } from './Downloaded';
export type { IconDownloadedProps } from './Downloaded';

// État (6)
export { IconCheck } from './Check';
export type { IconCheckProps } from './Check';
export { IconLock } from './Lock';
export type { IconLockProps } from './Lock';
export { IconAlert } from './Alert';
export type { IconAlertProps } from './Alert';
export { IconInfo } from './Info';
export type { IconInfoProps } from './Info';
export { IconGps } from './Gps';
export type { IconGpsProps } from './Gps';
export { IconOffline } from './Offline';
export type { IconOfflineProps } from './Offline';

// UI (5)
export { IconHeart } from './Heart';
export type { IconHeartProps } from './Heart';
export { IconShare } from './Share';
export type { IconShareProps } from './Share';
export { IconMore } from './More';
export type { IconMoreProps } from './More';
export { IconChevron } from './Chevron';
export type { IconChevronProps } from './Chevron';
export { IconPlus } from './Plus';
export type { IconPlusProps } from './Plus';
