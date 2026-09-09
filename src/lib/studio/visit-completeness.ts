import type { NarrationMode, RoutePath, StudioScene, StudioSession } from '@/types/studio';

export type VisitCompletenessCheckId =
  | 'narration_mode'
  | 'source_text'
  | 'source_audio'
  | 'audio_mode_consistency'
  | 'tts_readiness';

export interface VisitCompletenessCheck {
  id: VisitCompletenessCheckId;
  passed: boolean;
  evidence: string;
  sceneIds: string[];
}

export interface VisitCompletenessReport {
  ready: boolean;
  narrationMode: NarrationMode | null;
  checks: VisitCompletenessCheck[];
  blockingSceneIds: string[];
}

export interface VisitCompletenessInput {
  narrationMode: NarrationMode | null | undefined;
  sourceLanguage: string | null | undefined;
  scenes: Pick<
    StudioScene,
    | 'id'
    | 'title'
    | 'transcriptText'
    | 'studioAudioKey'
    | 'originalAudioKey'
    | 'baseAudioSource'
    | 'archived'
  >[];
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function audioKey(scene: VisitCompletenessInput['scenes'][number]): string | null {
  const value = scene.studioAudioKey || scene.originalAudioKey;
  return hasText(value) ? value!.trim() : null;
}

function makeCheck(
  id: VisitCompletenessCheckId,
  passed: boolean,
  evidence: string,
  sceneIds: string[] = [],
): VisitCompletenessCheck {
  return { id, passed, evidence, sceneIds };
}

/**
 * Matrice canonique Guide/Admin pour la source d'une version.
 *
 * Le mode n'est jamais inféré d'une clé audio. Une donnée historique sans mode
 * reste donc explicitement bloquée jusqu'à migration.
 */
export function evaluateVisitCompleteness(input: VisitCompletenessInput): VisitCompletenessReport {
  const scenes = input.scenes.filter((scene) => !scene.archived);
  const mode =
    input.narrationMode === 'recording' || input.narrationMode === 'tts_on_demand'
      ? input.narrationMode
      : null;
  const withoutText = scenes.filter((scene) => !hasText(scene.transcriptText));
  const withoutTitle = scenes.filter((scene) => !hasText(scene.title));
  const textTooLong = scenes.filter((scene) => (scene.transcriptText ?? '').length > 10_000);
  const withoutHumanAudio = scenes.filter(
    (scene) => audioKey(scene) === null || scene.baseAudioSource !== 'recording',
  );
  const withAudio = scenes.filter((scene) => audioKey(scene) !== null);
  const sourceLanguageReady = hasText(input.sourceLanguage);

  const checks: VisitCompletenessCheck[] = [
    makeCheck(
      'narration_mode',
      mode !== null,
      mode === null ? 'Mode de narration manquant.' : `Mode déclaré : ${mode}.`,
    ),
    makeCheck(
      'source_text',
      scenes.length > 0 && withoutText.length === 0 && withoutTitle.length === 0 && textTooLong.length === 0,
      withoutTitle.length > 0
        ? `${withoutTitle.length} scène(s) sans titre.`
        : textTooLong.length > 0
        ? `${textTooLong.length} scène(s) dépassent la limite de 10 000 caractères.`
        : withoutText.length === 0
        ? `${scenes.length} texte(s) source finalisé(s).`
        : `${withoutText.length} scène(s) sans texte final.`,
      [...withoutText, ...withoutTitle, ...textTooLong].map((scene) => scene.id),
    ),
    makeCheck(
      'source_audio',
      mode === 'tts_on_demand' || (mode === 'recording' && withoutHumanAudio.length === 0),
      mode === 'tts_on_demand'
        ? 'Audio source non applicable au mode TTS à la demande.'
        : withoutHumanAudio.length === 0
          ? 'Toutes les scènes possèdent un audio humain.'
          : `${withoutHumanAudio.length} scène(s) sans audio humain attesté.`,
      mode === 'recording' ? withoutHumanAudio.map((scene) => scene.id) : [],
    ),
    makeCheck(
      'audio_mode_consistency',
      mode === 'recording'
        ? withoutHumanAudio.length === 0
        : mode === 'tts_on_demand'
          ? withAudio.length === 0
          : false,
      mode === 'tts_on_demand'
        ? withAudio.length === 0
          ? 'Aucun audio n’est soumis avant fabrication.'
          : `${withAudio.length} audio(s) présent(s) malgré le mode TTS.`
        : mode === 'recording'
          ? withoutHumanAudio.length === 0
            ? 'La déclaration audio correspond au mode Ma voix.'
            : 'La déclaration Ma voix est incomplète.'
          : 'La cohérence audio ne peut pas être vérifiée sans mode.',
      mode === 'tts_on_demand'
        ? withAudio.map((scene) => scene.id)
        : withoutHumanAudio.map((scene) => scene.id),
    ),
    makeCheck(
      'tts_readiness',
      mode !== 'tts_on_demand' || (sourceLanguageReady && withoutText.length === 0 && textTooLong.length === 0),
      mode !== 'tts_on_demand'
        ? 'Non applicable au mode Ma voix.'
        : sourceLanguageReady && withoutText.length === 0 && textTooLong.length === 0
          ? `Textes prêts pour une fabrication en ${input.sourceLanguage!.toUpperCase()}.`
          : 'La langue source ou un texte final manque pour la fabrication.',
      mode === 'tts_on_demand' ? [...withoutText, ...textTooLong].map((scene) => scene.id) : [],
    ),
  ];
  const blockingSceneIds = Array.from(
    new Set(checks.filter((check) => !check.passed).flatMap((check) => check.sceneIds)),
  );
  return {
    ready: checks.every((check) => check.passed),
    narrationMode: mode,
    checks,
    blockingSceneIds,
  };
}

export function evaluateStudioVisit(
  session: Pick<StudioSession, 'narrationMode' | 'language'>,
  scenes: VisitCompletenessInput['scenes'],
): VisitCompletenessReport {
  return evaluateVisitCompleteness({
    narrationMode: session.narrationMode,
    sourceLanguage: session.language,
    scenes,
  });
}

export function routePathIsUsable(routePath: RoutePath | null | undefined): boolean {
  const points = routePath?.computedPath;
  return (
    Array.isArray(points) &&
    points.length >= 2 &&
    points.every(
      (point) =>
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        point.lat >= -90 &&
        point.lat <= 90 &&
        point.lng >= -180 &&
        point.lng <= 180,
    ) &&
    new Set(points.map((point) => `${point.lat},${point.lng}`)).size >= 2
  );
}
