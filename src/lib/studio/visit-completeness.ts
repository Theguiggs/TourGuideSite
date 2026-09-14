import type { NarrationMode, RoutePath, StudioScene, StudioSession } from '@/types/studio';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { completenessCopy } from './completeness-copy';

export type VisitCompletenessCheckId =
  | 'route'
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
export function evaluateVisitCompleteness(input: VisitCompletenessInput, locale: InterfaceLocale = 'fr'): VisitCompletenessReport {
  const c = (key: Parameters<typeof completenessCopy>[1], value?: string | number) => completenessCopy(locale, key, value);
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
      mode === null ? c('missingMode') : c('mode', mode),
    ),
    makeCheck(
      'source_text',
      scenes.length > 0 && withoutText.length === 0 && withoutTitle.length === 0 && textTooLong.length === 0,
      withoutTitle.length > 0
        ? c('missingTitle', withoutTitle.length)
        : textTooLong.length > 0
        ? c('longText', textTooLong.length)
        : withoutText.length === 0
        ? c('sourceText', scenes.length)
        : c('missingText', withoutText.length),
      [...withoutText, ...withoutTitle, ...textTooLong].map((scene) => scene.id),
    ),
    makeCheck(
      'source_audio',
      mode === 'tts_on_demand' || (mode === 'recording' && withoutHumanAudio.length === 0),
      mode === 'tts_on_demand'
        ? c('ttsAudio')
        : withoutHumanAudio.length === 0
          ? c('humanAudio')
          : c('missingAudio', withoutHumanAudio.length),
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
          ? c('noAudio')
          : c('unexpectedAudio', withAudio.length)
        : mode === 'recording'
          ? withoutHumanAudio.length === 0
            ? c('consistent')
            : c('incomplete')
          : c('unknown'),
      mode === 'tts_on_demand'
        ? withAudio.map((scene) => scene.id)
        : withoutHumanAudio.map((scene) => scene.id),
    ),
    makeCheck(
      'tts_readiness',
      mode !== 'tts_on_demand' || (sourceLanguageReady && withoutText.length === 0 && textTooLong.length === 0),
      mode !== 'tts_on_demand'
        ? c('notApplicable')
        : sourceLanguageReady && withoutText.length === 0 && textTooLong.length === 0
          ? c('ready', input.sourceLanguage!.toUpperCase())
          : c('missingSource'),
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
  session: Pick<StudioSession, 'narrationMode' | 'language' | 'routePath'>,
  scenes: VisitCompletenessInput['scenes'],
  locale: InterfaceLocale = 'fr',
): VisitCompletenessReport {
  const report = evaluateVisitCompleteness({
    narrationMode: session.narrationMode,
    sourceLanguage: session.language,
    scenes,
  }, locale);
  const routeValid = routePathIsUsable(session.routePath);
  return {
    ...report,
    ready: report.ready && routeValid,
    checks: [...report.checks, makeCheck('route', routeValid,
      completenessCopy(locale, routeValid ? 'routeReady' : 'routeMissing'))],
  };
}

export function routePathIsUsable(routePath: Pick<RoutePath, 'computedPath'> | null | undefined): boolean {
  const points = routePath?.computedPath;
  return (
    Array.isArray(points) &&
    points.length >= 2 &&
    points.every(
      (point) =>
        point !== null &&
        typeof point === 'object' &&
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        point.lat >= -90 &&
        point.lat <= 90 &&
        point.lng >= -180 &&
        point.lng <= 180,
    )
  );
}
