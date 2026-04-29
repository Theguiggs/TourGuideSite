/**
 * GCI-4.2 Validation rules for the /cleanup "Valider et passer en édition" CTA.
 *
 * A session is ready to validate when ALL of:
 *  - At least 2 non-archived scenes (POIs)
 *  - Title length >= 5 chars
 *  - Description length >= 50 chars
 *  - At least 1 theme selected
 *  - Every non-archived scene has an audio (original OR studio)
 *
 * Exported pure — no I/O, trivially testable.
 */

import type { StudioScene } from '@/types/studio';

export interface TourMetadataDraft {
  title: string;
  description: string;
  themes: string[];
  language: string;
  durationMinutes: number | null;
}

export interface ValidationResult {
  ready: boolean;
  reasons: string[];
}

export const TITLE_MIN = 5;
export const TITLE_MAX = 80;
export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_MAX = 500;
export const DURATION_MIN = 15;
export const DURATION_MAX = 240;
export const SCENES_MIN = 2;

export function isReadyToValidate(
  scenes: StudioScene[],
  metadata: TourMetadataDraft,
): ValidationResult {
  const reasons: string[] = [];

  // "deleted" in this codebase maps to `archived` on StudioScene
  const activeScenes = scenes.filter((s) => !s.archived);

  if (activeScenes.length < SCENES_MIN) {
    reasons.push(`Au moins ${SCENES_MIN} POIs requis (actuellement ${activeScenes.length})`);
  }

  const titleLen = metadata.title.trim().length;
  if (titleLen < TITLE_MIN) {
    reasons.push(`Titre trop court (${TITLE_MIN} caractères min)`);
  } else if (titleLen > TITLE_MAX) {
    reasons.push(`Titre trop long (${TITLE_MAX} caractères max)`);
  }

  const descLen = metadata.description.trim().length;
  if (descLen < DESCRIPTION_MIN) {
    reasons.push(`Description trop courte (${DESCRIPTION_MIN} caractères min)`);
  } else if (descLen > DESCRIPTION_MAX) {
    reasons.push(`Description trop longue (${DESCRIPTION_MAX} caractères max)`);
  }

  if (metadata.themes.length === 0) {
    reasons.push('Au moins 1 thème requis');
  }

  if (
    metadata.durationMinutes != null &&
    (metadata.durationMinutes < DURATION_MIN || metadata.durationMinutes > DURATION_MAX)
  ) {
    reasons.push(`Durée hors limites (${DURATION_MIN}-${DURATION_MAX} min)`);
  }

  const scenesMissingAudio = activeScenes.filter(
    (s) => !s.originalAudioKey && !s.studioAudioKey,
  );
  if (scenesMissingAudio.length > 0) {
    reasons.push(`${scenesMissingAudio.length} POI(s) sans audio`);
  }

  return { ready: reasons.length === 0, reasons };
}
