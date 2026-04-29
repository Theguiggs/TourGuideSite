/**
 * Story 2.3 — Constantes RN extraites du composant `Card.tsx` RN miroir.
 *
 * Vit dans un fichier `.ts` pur (pas d'import `react-native`) afin que la suite
 * Jest du package `@tourguide/design-system` (testEnvironment: 'node') puisse
 * importer et tester les maps sans avoir à charger un runtime RN.
 *
 * Source ACs : Story 2.3, AC 7 (RN miroir) + AC 8 (tests no-drift).
 */

import { tgColors } from '../tokens';
import type { CardVariant } from '../components/Card.constants';

/**
 * Map Android `elevation` (entier RN). `flat:0` retire l'ombre Material,
 * la bordure 1px line reste visible (cf. AC 2).
 */
export const CARD_ELEVATION_MAP: Record<CardVariant, number> = {
  flat: 0,
  sm:   1,
  md:   4,
  lg:   12,
};

/**
 * Map iOS shadow — chiffres extraits des valeurs `box-shadow` Web (`tgShadow`)
 * pour préserver la parité visuelle "raisonnable" :
 *   sm  → 0 1px 2px  rgba(16,42,67,0.06)  → offsetY 1, radius 2,  opacity 0.06
 *   md  → 0 4px 12px rgba(16,42,67,0.08)  → offsetY 4, radius 12, opacity 0.08
 *   lg  → 0 12px 28px rgba(16,42,67,0.14) → offsetY 12, radius 28, opacity 0.14
 *   flat → 0 / 0 / 0 (pas d'ombre)
 *
 * `shadowColor` reste `tgColors.ink` (#102A43) pour tous les variants non-flat.
 */
export interface CardIOSShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowRadius: number;
  shadowOpacity: number;
}

export const CARD_IOS_SHADOW_MAP: Record<CardVariant, CardIOSShadow> = {
  flat: {
    shadowColor:   tgColors.ink,
    shadowOffset:  { width: 0, height: 0 },
    shadowRadius:  0,
    shadowOpacity: 0,
  },
  sm: {
    shadowColor:   tgColors.ink,
    shadowOffset:  { width: 0, height: 1 },
    shadowRadius:  2,
    shadowOpacity: 0.06,
  },
  md: {
    shadowColor:   tgColors.ink,
    shadowOffset:  { width: 0, height: 4 },
    shadowRadius:  12,
    shadowOpacity: 0.08,
  },
  lg: {
    shadowColor:   tgColors.ink,
    shadowOffset:  { width: 0, height: 12 },
    shadowRadius:  28,
    shadowOpacity: 0.14,
  },
};
