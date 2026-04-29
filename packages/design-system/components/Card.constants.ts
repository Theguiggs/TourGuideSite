/**
 * Story 2.3 — Constantes Card Web (extraites du composant `Card.tsx`).
 *
 * Vit dans un fichier `.ts` pur (pas de JSX, pas d'import `react/jsx-runtime`)
 * afin que la suite Jest du package `@tourguide/design-system` puisse importer
 * et tester les maps sans avoir à charger un runtime React (le package n'a
 * pas `react` en devDeps — c'est une peer-dep consumer).
 *
 * Le composant `Card.tsx` re-exporte ces constantes pour une API publique unifiée.
 */

import { tgShadow } from '../tokens';

export type CardVariant = 'flat' | 'sm' | 'md' | 'lg';

/** Map publique variant → boxShadow Web (lue depuis `tgShadow`, no-drift). */
export const CARD_SHADOW_MAP: Record<CardVariant, string> = {
  flat: 'none',
  sm:   tgShadow.sm,
  md:   tgShadow.md,
  lg:   tgShadow.lg,
};

/** Variant par défaut Story 2.3 (cohérent Web + RN). */
export const CARD_DEFAULT_VARIANT: CardVariant = 'md';
