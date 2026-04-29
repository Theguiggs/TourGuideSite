import type { SceneStatus } from '@/types/studio';

export interface ScenePillConfig {
  /** UI label, e.g. "Finalisé". */
  label: string;
  /** Tailwind background class (already DS-safelist-friendly). */
  bgClass: string;
  /** Tailwind text class. */
  textClass: string;
}

/**
 * Map a low-level SceneStatus to a pill UI configuration following the brief
 * (correction §8 "statuts codés couleur" — Ocre / Mer / Vert).
 */
export function sceneStatusPill(status: SceneStatus): ScenePillConfig {
  switch (status) {
    case 'finalized':
      return { label: 'Finalisé', bgClass: 'bg-olive-soft', textClass: 'text-success' };
    case 'recorded':
    case 'edited':
      return { label: 'Enregistré', bgClass: 'bg-ocre-soft', textClass: 'text-ocre' };
    case 'transcribed':
      return { label: 'Transcrit', bgClass: 'bg-mer-soft', textClass: 'text-mer' };
    case 'has_original':
      return { label: 'Brut', bgClass: 'bg-paper-deep', textClass: 'text-ink-60' };
    case 'empty':
    default:
      return { label: 'Vide', bgClass: 'bg-paper-deep', textClass: 'text-ink-60' };
  }
}

/** Wizard tab keys (ordered) — used for breadcrumb numbering and active state. */
export const WIZARD_TAB_KEYS = [
  'accueil',
  'general',
  'itinerary',
  'scenes',
  'preview',
  'submission',
] as const;

export type WizardTabKey = (typeof WIZARD_TAB_KEYS)[number];

interface WizardTabDef {
  key: WizardTabKey;
  /** Display label. */
  label: string;
  /** Path suffix appended after `/guide/studio/[sessionId]/`. Empty for Accueil. */
  pathSuffix: string;
  /** 0-based index displayed as "01", "02", … in the breadcrumb. */
  number: string;
}

export const WIZARD_TABS: ReadonlyArray<WizardTabDef> = [
  { key: 'accueil', label: 'Accueil', pathSuffix: '', number: '01' },
  { key: 'general', label: 'Général', pathSuffix: 'general', number: '02' },
  { key: 'itinerary', label: 'Itinéraire', pathSuffix: 'itinerary', number: '03' },
  { key: 'scenes', label: 'Scènes', pathSuffix: 'scenes', number: '04' },
  { key: 'preview', label: 'Preview', pathSuffix: 'preview', number: '05' },
  { key: 'submission', label: 'Publication', pathSuffix: 'submission', number: '06' },
];

/** Resolve previous/next tab definitions for `<StepNav>`. */
export function adjacentTabs(active: WizardTabKey): {
  prev: WizardTabDef | null;
  next: WizardTabDef | null;
} {
  const i = WIZARD_TAB_KEYS.indexOf(active);
  return {
    prev: i > 0 ? WIZARD_TABS[i - 1] : null,
    next: i < WIZARD_TABS.length - 1 ? WIZARD_TABS[i + 1] : null,
  };
}
