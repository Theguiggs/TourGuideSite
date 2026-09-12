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
import type { StudioLocale } from '@/lib/i18n/studio-locale';

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
  locale: StudioLocale = 'fr',
): ValidationResult {
  const reasons: string[] = [];
  const t = (fr: string, en: string) => (locale === 'en' ? en : fr);

  // "deleted" in this codebase maps to `archived` on StudioScene
  const activeScenes = scenes.filter((s) => !s.archived);

  if (activeScenes.length < SCENES_MIN) {
    reasons.push(t(
      `Au moins ${SCENES_MIN} POIs requis (actuellement ${activeScenes.length})`,
      `At least ${SCENES_MIN} POIs required (currently ${activeScenes.length})`,
    ));
  }

  const titleLen = metadata.title.trim().length;
  if (titleLen < TITLE_MIN) {
    reasons.push(t(`Titre trop court (${TITLE_MIN} caractères min)`, `Title too short (${TITLE_MIN} characters min)`));
  } else if (titleLen > TITLE_MAX) {
    reasons.push(t(`Titre trop long (${TITLE_MAX} caractères max)`, `Title too long (${TITLE_MAX} characters max)`));
  }

  const descLen = metadata.description.trim().length;
  if (descLen < DESCRIPTION_MIN) {
    reasons.push(t(`Description trop courte (${DESCRIPTION_MIN} caractères min)`, `Description too short (${DESCRIPTION_MIN} characters min)`));
  } else if (descLen > DESCRIPTION_MAX) {
    reasons.push(t(`Description trop longue (${DESCRIPTION_MAX} caractères max)`, `Description too long (${DESCRIPTION_MAX} characters max)`));
  }

  if (metadata.themes.length === 0) {
    reasons.push(t('Au moins 1 thème requis', 'At least 1 theme required'));
  }

  if (
    metadata.durationMinutes != null &&
    (metadata.durationMinutes < DURATION_MIN || metadata.durationMinutes > DURATION_MAX)
  ) {
    reasons.push(t(`Durée hors limites (${DURATION_MIN}-${DURATION_MAX} min)`, `Duration out of range (${DURATION_MIN}-${DURATION_MAX} min)`));
  }

  const scenesMissingAudio = activeScenes.filter(
    (s) => !s.originalAudioKey && !s.studioAudioKey,
  );
  if (scenesMissingAudio.length > 0) {
    reasons.push(t(`${scenesMissingAudio.length} POI(s) sans audio`, `${scenesMissingAudio.length} POI(s) without audio`));
  }

  return { ready: reasons.length === 0, reasons };
}
