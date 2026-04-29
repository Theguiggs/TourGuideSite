/**
 * TourGuide Design System — TypeScript tokens
 * Source unique de vérité, à importer dans n'importe quel composant TS/RN.
 */

// Story 1.6 — re-export motion + sound depuis leurs modules dédiés
export { tgMotion, tgMotionDuration, tgMotionEasing } from './motion';
export type {
  TgMotion,
  TgMotionDuration,
  TgMotionEasing,
  TgDurationKey,
  TgEasingKey,
} from './motion';
export { tgSound } from './sound';
export type { TgSound, TgSoundKey, TgSoundEntry, SoundAsset } from './sound';

import { tgMotion } from './motion';
import { tgSound } from './sound';

export const tgColors = {
  paper:      '#F4ECDD',
  paperSoft:  '#EFE4D0',
  paperDeep:  '#E8DCC4',
  card:       '#FFFFFF',

  ink:        '#102A43',
  ink80:      'rgba(16, 42, 67, 0.8)',
  ink60:      'rgba(16, 42, 67, 0.6)',
  ink40:      'rgba(16, 42, 67, 0.4)',
  ink20:      'rgba(16, 42, 67, 0.2)',

  line:       'rgba(16, 42, 67, 0.10)',
  ardoise:    '#2C3E50',

  grenadine:      '#C1262A',
  grenadineSoft:  '#FBE5E2',
  ocre:           '#C68B3E',
  ocreSoft:       '#F5E4C7',
  mer:            '#2B6E8A',
  merSoft:        '#D7E5EC',
  olive:          '#6B7A45',
  oliveSoft:      '#E2E5D2',

  success: '#4F7942',
  warning: '#C68B3E',
  danger:  '#C1262A',
  info:    '#2B6E8A',
} as const;

export type TgColor = keyof typeof tgColors;

export const tgFonts = {
  sans:      'Manrope, Inter, system-ui, sans-serif',
  display:   '"DM Serif Display", "Playfair Display", Georgia, serif',
  editorial: '"DM Serif Text", Georgia, serif',
  mono:      '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
} as const;

/**
 * React Native font family names — Story 2.0 (POC fonts custom Hermes).
 *
 * Hermes / RN does NOT support fallback chains in `fontFamily` like CSS does :
 * the value must be the exact PostScript name of a TTF bundled in the APK
 * (`android/app/src/main/assets/fonts/`) or registered in iOS `Info.plist`
 * (`UIAppFonts`). Fallback chains with quotes (`"DM Serif Display", Georgia`)
 * are silently rejected and the system default is used instead.
 *
 * The 8 TTFs are downloaded by `scripts/download-ds-fonts.ps1` and linked via
 * `npx react-native-asset` (option A — bundling TTF natif). See
 * `docs/poc-fonts-hermes.md` for the decision rationale and the mapping
 * weight -> PostScript name.
 *
 * Usage (RN only) :
 *   import { tgFontsRn } from '@tourguide/design-system/tokens';
 *   <Text style={{ fontFamily: tgFontsRn.display, fontSize: 32 }}>...</Text>
 *
 * Web continues to use the existing `tgFonts` constant via `tokens.css` /
 * `next/font/google` — do NOT use `tgFontsRn` in Web code.
 */
export const tgFontsRn = {
  /** Manrope 400 — body text, sans-serif default. */
  sans:         'Manrope-Regular',
  /** Manrope 500 — body emphasis. */
  sansMedium:   'Manrope-Medium',
  /** Manrope 600 — strong emphasis (Eyebrow, labels). */
  sansSemiBold: 'Manrope-SemiBold',
  /** Manrope 700 — section titles, button labels. */
  sansBold:     'Manrope-Bold',
  /** DM Serif Display 400 — display-class titles (h1/h2). */
  display:      'DMSerifDisplay-Regular',
  /** DM Serif Text Italic 400 — pull quotes, editorial inline emphasis. */
  editorial:    'DMSerifText-Italic',
  /** JetBrains Mono 400 — timecodes, monospace metadata. */
  mono:         'JetBrainsMono-Regular',
  /** JetBrains Mono 700 — emphasized monospace. */
  monoBold:     'JetBrainsMono-Bold',
} as const;

export type TgFontRn = keyof typeof tgFontsRn;

/**
 * Échelle typographique — 11 niveaux, valeurs en `px` numériques.
 *
 * Note : RN n'a pas de `rem` ; la table reste donc en pixels purs.
 * Côté Web, `tokens.css` expose les mêmes tailles converties en `rem`
 * (1rem = 16px). Toute drift entre TS et CSS = bug de DS — voir Story 1.5.
 *
 * Référence : `design/handoff/BRIEF-CLAUDE-CODE.md` §2.2.
 */
export const tgFontSize = {
  eyebrow: 11,
  meta:    12,
  caption: 13,
  body:    14,
  bodyLg:  16,
  h6:      18,
  h5:      22,
  h4:      30,
  h3:      40,
  h2:      56,
  h1:      72,
} as const;

export type TgFontSizeKey = keyof typeof tgFontSize;

/**
 * Letter-spacing tokens pour les niveaux qui en ont besoin.
 * - `display` : -0.025em (titres DM Serif Display, resserrement éditorial)
 * - `eyebrow` : 0.18em (signature visuelle uppercase, voir `tgEyebrow`)
 */
export const tgTracking = {
  display: '-0.025em',
  eyebrow: '0.18em',
} as const;

/**
 * Helper de signature pour le composant Eyebrow.
 *
 * Brief §2.2 : "Eyebrow (essentiel) : 11 px, MAJUSCULES, letter-spacing 0.18em,
 * 700, posé au-dessus de chaque titre. C'est la signature visuelle du DS."
 *
 * Usage : `style={{ ...tgEyebrow, color: tg.colors.grenadine }}` (RN) ou
 * via la classe utilitaire `.tg-eyebrow` côté Web.
 */
export const tgEyebrow = {
  fontSize:       11,
  letterSpacing:  '0.18em',
  fontWeight:     700,
  textTransform:  'uppercase',
} as const;

export const tgSpace = {
  1: 4,  2: 8,  3: 12, 4: 16, 5: 20, 6: 24,
  8: 32, 10: 40, 12: 48, 16: 64, 20: 80,
} as const;

export const tgRadius = {
  sm: 6, md: 12, lg: 18, xl: 28, pill: 999,
} as const;

export const tgShadow = {
  sm:     '0 1px 2px rgba(16, 42, 67, 0.06)',
  md:     '0 4px 12px rgba(16, 42, 67, 0.08)',
  lg:     '0 12px 28px rgba(16, 42, 67, 0.14)',
  xl:     '0 24px 60px rgba(16, 42, 67, 0.18)',
  accent: '0 12px 28px rgba(193, 38, 42, 0.22)',
} as const;

/**
 * @deprecated Story 1.6 — use `tgMotion.duration` (`lecture` / `promenade` /
 * `tournepage`) instead. Conservé pour compat ascendante (Story 1.1 POC).
 */
export const tgDuration = {
  fast: 120, base: 200, slow: 320,
} as const;

/**
 * @deprecated Story 1.6 — use `tgMotion.easing` (`flaner` / `descendre` /
 * `arriver`) instead. Conservé pour compat ascendante (Story 1.1 POC).
 */
export const tgEase = {
  out:    'cubic-bezier(0.2, 0.8, 0.2, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const tg = {
  colors:   tgColors,
  fonts:    tgFonts,
  fontSize: tgFontSize,
  tracking: tgTracking,
  eyebrow:  tgEyebrow,
  space:    tgSpace,
  radius:   tgRadius,
  shadow:   tgShadow,
  duration: tgDuration,
  ease:     tgEase,
  motion:   tgMotion,
  sound:    tgSound,
} as const;

export type TgTokens = typeof tg;
