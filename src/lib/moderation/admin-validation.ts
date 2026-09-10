import { checkLanguageReadiness } from '@/lib/api/language-purchase';
import { evaluateVisitCompleteness } from '@/lib/studio/visit-completeness';
import { hashSourceText, type SceneSegment } from '@/types/studio';
import type {
  AdminValidationCheck,
  AdminValidationReport,
  ModerationDetail,
  ModerationScene,
  QualityChecklistItem,
} from '@/types/moderation';

type RoutePoint = { lat: number; lng: number };

export interface AdminValidationInput {
  detail: ModerationDetail;
  language: string;
  segmentsByScene: Record<string, SceneSegment[]>;
  routePath: RoutePoint[] | null;
  dependentDataLoaded: boolean;
  translatedTourTitle?: string | null;
  translatedTourDescription?: string | null;
}

export interface ModerationScenePresentation {
  title: string;
  text: string | null;
  audioKey: string | null;
}

const FOOD_THEME_PATTERN = /\b(gastronom\w*|food|culinair\w*|cuisine|nourriture|terroir|restaurant\w*|vin|wine|biere|beer|degustation\w*|fromage\w*)\b/i;

function textPresent(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizedTheme(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function hasValidCoordinates(
  latitude: number | null,
  longitude: number | null,
): boolean {
  return (
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function getModerationScenePresentation(
  scene: ModerationScene,
  segment: SceneSegment | undefined,
  isTranslation: boolean,
): ModerationScenePresentation {
  if (!isTranslation) {
    return {
      title: scene.title,
      text: scene.transcriptText,
      audioKey: scene.audioRef || null,
    };
  }
  return {
    title: segment?.translatedTitle?.trim() || 'Titre non traduit',
    text: segment?.transcriptText?.trim() || null,
    audioKey: segment?.audioKey?.trim() || null,
  };
}

export function canApproveAdminReview(
  report: AdminValidationReport | null,
  checklist: QualityChecklistItem[],
): boolean {
  return (
    report?.ready === true &&
    checklist.length > 0 &&
    checklist.every((item) => item.checked)
  );
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): AdminValidationCheck {
  return { id, label, passed, evidence };
}

function missingSceneEvidence(
  missing: Array<{ title: string; fields: string[] }>,
): string {
  if (missing.length === 0) return 'Toutes les scènes sont complètes.';
  return missing.map(({ title, fields }) => `${title} : ${fields.join(', ')}`).join(' ; ');
}

export function buildAdminValidationReport({
  detail,
  language,
  segmentsByScene,
  routePath,
  dependentDataLoaded,
  translatedTourTitle,
  translatedTourDescription,
}: AdminValidationInput): AdminValidationReport {
  if (!dependentDataLoaded) {
    return {
      ready: false,
      blockingCount: 1,
      checks: [
        check(
          'dependent_data',
          'Données de validation chargées',
          false,
          'Le parcours, l’accès ou les contenus de langue sont encore en cours de lecture.',
        ),
      ],
    };
  }

  const isTranslation = language !== detail.languePrincipale;
  const description = textPresent(detail.descriptionLongue)
    ? detail.descriptionLongue
    : detail.description;
  const cover = textPresent(detail.coverPhotoKey) ? detail.coverPhotoKey : detail.heroImageUrl;
  const meaningfulThemes = detail.themes.filter(textPresent);
  const invalidThemes = meaningfulThemes.filter((theme) => FOOD_THEME_PATTERN.test(normalizedTheme(theme)));
  const invalidGpsScenes = detail.scenes.filter(
    (scene) => !hasValidCoordinates(scene.latitude, scene.longitude),
  );
  const routeValid =
    routePath !== null &&
    routePath.length >= 2 &&
    routePath.every((point) => hasValidCoordinates(point.lat, point.lng)) &&
    new Set(routePath.map((point) => `${point.lat},${point.lng}`)).size >= 2;

  const flattenedSegments = Object.values(segmentsByScene).flat();
  const readiness = checkLanguageReadiness(detail.scenes, flattenedSegments, language);
  const sourceCompleteness = evaluateVisitCompleteness({
    narrationMode: detail.narrationMode,
    sourceLanguage: detail.languePrincipale,
    scenes: detail.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      transcriptText: scene.transcriptText,
      studioAudioKey: scene.audioRef || null,
      originalAudioKey: null,
      baseAudioSource: scene.baseAudioSource ?? null,
      archived: false,
    })),
  });
  const missingContent = detail.scenes.flatMap((scene) => {
    const fields: string[] = [];
    if (isTranslation) {
      const matchingSegments = flattenedSegments.filter(
        (candidate) => candidate.sceneId === scene.id && candidate.language === language,
      );
      const segment = matchingSegments[0];
      const readyScene = readiness.scenes.find((candidate) => candidate.sceneId === scene.id);
      if (!textPresent(segment?.translatedTitle)) fields.push('titre traduit');
      if (!textPresent(segment?.transcriptText)) fields.push('texte traduit');
      if (!textPresent(segment?.audioKey) || !readyScene?.hasAudio) fields.push('audio traduit');
      if (matchingSegments.length !== 1) fields.push('segment unique');
      if (segment && segment.status !== 'tts_generated' && segment.status !== 'finalized') {
        fields.push('statut audio final');
      }
      if (
        segment?.sourceTextHash &&
        segment.sourceTextHash !== hashSourceText(scene.transcriptText, scene.title)
      ) {
        fields.push('traduction à actualiser');
      }
    } else {
      if (!textPresent(scene.title)) fields.push('titre source');
      if (!textPresent(scene.transcriptText)) fields.push('texte source');
      if (detail.narrationMode === 'recording' && !textPresent(scene.audioRef)) {
        fields.push('audio source');
      }
      if (detail.narrationMode === 'tts_on_demand' && textPresent(scene.audioRef)) {
        fields.push('audio inattendu en mode TTS');
      }
    }
    return fields.length > 0 ? [{ title: scene.title, fields }] : [];
  });

  const checks: AdminValidationCheck[] = [
    ...sourceCompleteness.checks.map((item) =>
      check(item.id, item.id.replaceAll('_', ' '), item.passed, item.evidence),
    ),
    check(
      'identity',
      'Titre et description',
      textPresent(detail.tourTitle) && textPresent(description),
      textPresent(detail.tourTitle) && textPresent(description)
        ? 'Le titre et la description sont renseignés.'
        : 'Le titre ou la description est absent.',
    ),
    check(
      'cover',
      'Photo de couverture',
      textPresent(cover),
      textPresent(cover) ? 'Une couverture est renseignée.' : 'Aucune couverture n’est renseignée.',
    ),
    check(
      'themes',
      'Thème autorisé',
      meaningfulThemes.length > 0 && invalidThemes.length === 0,
      meaningfulThemes.length === 0
        ? 'Aucun thème n’est renseigné.'
        : invalidThemes.length > 0
          ? `Thème alimentaire interdit : ${invalidThemes.join(', ')}.`
          : `Thème(s) : ${detail.themes.join(', ')}.`,
    ),
    check(
      'provenance',
      'Origine éditoriale',
      detail.contentProvenance !== null,
      detail.contentProvenance === null
        ? 'Le guide doit indiquer si le contenu a été écrit par lui, avec l’aide de l’IA, ou principalement avec l’IA.'
        : detail.contentProvenance === 'human'
          ? 'Contenu écrit par le guide.'
          : detail.contentProvenance === 'mixed'
            ? 'Contenu créé avec l’aide de l’IA — mention « Developed with AI » requise.'
            : 'Contenu créé principalement avec l’IA — mention « Developed with AI » requise.',
    ),
    check(
      'access',
      'Accès gratuit au lancement',
      detail.purchaseType === 'free',
      detail.purchaseType === 'free'
        ? 'La visite est gratuite et ouverte à tous.'
        : `Accès actuel : ${detail.purchaseType ?? 'non renseigné'}.`,
    ),
    check(
      'scene_count',
      'Nombre de scènes actives',
      detail.scenes.length >= 2,
      `${detail.scenes.length} scène(s) active(s).`,
    ),
    check(
      'gps',
      'Coordonnées GPS',
      detail.scenes.length > 0 && invalidGpsScenes.length === 0,
      invalidGpsScenes.length === 0
        ? 'Toutes les scènes ont des coordonnées valides.'
        : `GPS absent ou invalide : ${invalidGpsScenes.map((scene) => scene.title).join(', ')}.`,
    ),
    check(
      'route',
      'Tracé du parcours',
      routeValid,
      routeValid
        ? `${routePath?.length ?? 0} points composent le tracé.`
        : 'Le tracé persistant est absent, trop court ou invalide.',
    ),
    check(
      'translated_identity',
      `Titre et description en ${language.toUpperCase()}`,
      !isTranslation || (textPresent(translatedTourTitle) && textPresent(translatedTourDescription)),
      !isTranslation
        ? 'Sans objet pour la langue source.'
        : textPresent(translatedTourTitle) && textPresent(translatedTourDescription)
          ? 'Le titre et la description traduits sont renseignés.'
          : 'Le titre ou la description traduite est absent.',
    ),
    check(
      isTranslation ? 'translated_content' : 'source_content',
      isTranslation ? `Contenu complet en ${language.toUpperCase()}` : 'Contenu source complet',
      detail.scenes.length > 0 && missingContent.length === 0,
      missingSceneEvidence(missingContent),
    ),
  ];

  const uniqueChecks = checks.filter(
    (item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index,
  );
  const blockingCount = uniqueChecks.filter((item) => !item.passed).length;
  return { ready: blockingCount === 0, blockingCount, checks: uniqueChecks };
}
