import { adminText } from '@/lib/admin/copy';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { checkLanguageReadiness } from '@/lib/api/language-purchase';
import { evaluateVisitCompleteness, routePathIsUsable } from '@/lib/studio/visit-completeness';
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
  locale: InterfaceLocale = 'fr',
): ModerationScenePresentation {
  const a = (key: string) => adminText(locale, key);
  if (!isTranslation) {
    return {
      title: scene.title,
      text: scene.transcriptText,
      audioKey: scene.audioRef || null,
    };
  }
  return {
    title: segment?.translatedTitle?.trim() || a("Titre non traduit"),
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
  locale: InterfaceLocale = 'fr',
): string {
  const a = (key: string) => adminText(locale, key);
  if (missing.length === 0) return a("Toutes les scènes sont complètes.");
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
}: AdminValidationInput, locale: InterfaceLocale = 'fr'): AdminValidationReport {
  const a = (key: string, ...values: Array<string | number>) => adminText(locale, key, ...values);
  if (!dependentDataLoaded) {
    return {
      ready: false,
      blockingCount: 1,
      checks: [
        check(
          'dependent_data',
          a("Données de validation chargées"),
          false,
          a("Le parcours, l’accès ou les contenus de langue sont encore en cours de lecture."),
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
  const routeValid = routePathIsUsable({ computedPath: routePath });
  const paidPriceValid =
    detail.purchaseType === 'paid' &&
    typeof detail.priceCents === 'number' &&
    Number.isInteger(detail.priceCents) &&
    detail.priceCents >= 99 &&
    detail.priceCents <= 4_999;
  const accessValid =
    detail.purchaseType === 'free' ||
    detail.purchaseType === 'subscription_only' ||
    paidPriceValid;

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
  }, locale);
  const missingContent = detail.scenes.flatMap((scene) => {
    const fields: string[] = [];
    if (isTranslation) {
      const matchingSegments = flattenedSegments.filter(
        (candidate) => candidate.sceneId === scene.id && candidate.language === language,
      );
      const segment = matchingSegments[0];
      const readyScene = readiness.scenes.find((candidate) => candidate.sceneId === scene.id);
      if (!textPresent(segment?.translatedTitle)) fields.push(a("titre traduit"));
      if (!textPresent(segment?.transcriptText)) fields.push(a("texte traduit"));
      if (!textPresent(segment?.audioKey) || !readyScene?.hasAudio) fields.push(a("audio traduit"));
      if (matchingSegments.length !== 1) fields.push(a("segment unique"));
      if (segment && segment.status !== 'tts_generated' && segment.status !== 'finalized') {
        fields.push(a("statut audio final"));
      }
      if (
        segment?.sourceTextHash &&
        segment.sourceTextHash !== hashSourceText(scene.transcriptText, scene.title)
      ) {
        fields.push(a("traduction à actualiser"));
      }
    } else {
      if (!textPresent(scene.title)) fields.push(a("titre source"));
      if (!textPresent(scene.transcriptText)) fields.push(a("texte source"));
      if (detail.narrationMode === 'recording' && !textPresent(scene.audioRef)) {
        fields.push(a("audio source"));
      }
      if (detail.narrationMode === 'tts_on_demand' && textPresent(scene.audioRef)) {
        fields.push(a("audio inattendu en mode TTS"));
      }
    }
    return fields.length > 0 ? [{ title: scene.title, fields }] : [];
  });

  const checks: AdminValidationCheck[] = [
    ...sourceCompleteness.checks.map((item) =>
      check(item.id, a({route: 'Tracé du parcours', narration_mode: 'Mode de narration', source_text: 'Texte source', source_audio: 'Audio source', audio_mode_consistency: 'Cohérence audio', tts_readiness: 'Préparation TTS'}[item.id]), item.passed, item.evidence),
    ),
    check(
      'identity',
      a("Titre et description"),
      textPresent(detail.tourTitle) && textPresent(description),
      textPresent(detail.tourTitle) && textPresent(description)
        ? a("Le titre et la description sont renseignés.")
        : a("Le titre ou la description est absent."),
    ),
    check(
      'cover',
      a('Photo de couverture'),
      textPresent(cover),
      textPresent(cover) ? a("Une couverture est renseignée.") : a("Aucune couverture n’est renseignée."),
    ),
    check(
      'themes',
      a("Thème autorisé"),
      meaningfulThemes.length > 0 && invalidThemes.length === 0,
      meaningfulThemes.length === 0
        ? a("Aucun thème n’est renseigné.")
        : invalidThemes.length > 0
          ? a("Thème alimentaire interdit : {0}.", invalidThemes.join(', '))
          : a("Thème(s) : {0}.", detail.themes.join(', ')),
    ),
    check(
      'provenance',
      a("Origine éditoriale"),
      detail.contentProvenance !== null,
      detail.contentProvenance === null
        ? a("Le guide doit indiquer si le contenu a été écrit par lui, avec l’aide de l’IA, ou principalement avec l’IA.")
        : detail.contentProvenance === 'human'
          ? a("Contenu écrit par le guide.")
          : detail.contentProvenance === 'mixed'
            ? a("Contenu créé avec l’aide de l’IA — mention « Developed with AI » requise.")
            : a("Contenu créé principalement avec l’IA — mention « Developed with AI » requise."),
    ),
    check(
      'access',
      a("Mode d’accès"),
      accessValid,
      detail.purchaseType === 'free'
        ? a("La visite est gratuite et ouverte à tous.")
        : detail.purchaseType === 'subscription_only'
          ? a("La visite est réservée aux abonnés.")
          : paidPriceValid
            ? a("La visite est vendue à l’unité : {0}.", `${(detail.priceCents! / 100).toFixed(2).replace('.', ',')} €`)
            : detail.purchaseType === 'paid'
              ? a("Le prix doit être compris entre 0,99 € et 49,99 €.")
              : a("Le mode d’accès n’est pas renseigné ou est invalide."),
    ),
    check(
      'scene_count',
      a("Nombre de scènes actives"),
      detail.scenes.length >= 2,
      a("{0} scène(s) active(s).", detail.scenes.length),
    ),
    check(
      'gps',
      a("Coordonnées GPS"),
      detail.scenes.length > 0 && invalidGpsScenes.length === 0,
      invalidGpsScenes.length === 0
        ? a("Toutes les scènes ont des coordonnées valides.")
        : a("GPS absent ou invalide : {0}.", invalidGpsScenes.map((scene) => scene.title).join(', ')),
    ),
    check(
      'route',
      a("Tracé du parcours"),
      routeValid,
      routeValid
        ? a("{0} points composent le tracé.", routePath?.length ?? 0)
        : a("Le tracé persistant est absent, trop court ou invalide."),
    ),
    check(
      'translated_identity',
      a("Titre et description en {0}", language.toUpperCase()),
      !isTranslation || (textPresent(translatedTourTitle) && textPresent(translatedTourDescription)),
      !isTranslation
        ? a("Sans objet pour la langue source.")
        : textPresent(translatedTourTitle) && textPresent(translatedTourDescription)
          ? a("Le titre et la description traduits sont renseignés.")
          : a("Le titre ou la description traduite est absent."),
    ),
    check(
      isTranslation ? 'translated_content' : 'source_content',
      isTranslation ? a("Contenu complet en {0}", language.toUpperCase()) : a("Contenu source complet"),
      detail.scenes.length > 0 && missingContent.length === 0,
      missingSceneEvidence(missingContent, locale),
    ),
  ];

  const uniqueChecks = checks.filter(
    (item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index,
  );
  const blockingCount = uniqueChecks.filter((item) => !item.passed).length;
  return { ready: blockingCount === 0, blockingCount, checks: uniqueChecks };
}
