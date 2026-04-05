import type { StudioScene, QualityTier, TranslationProvider, SceneSegment } from '@/types/studio';
import { requestTranslation, getTranslationStatus } from '@/lib/api/translation';
import type { TranslationResult } from '@/lib/api/translation';
import { requestTTS, getTTSStatus } from '@/lib/api/tts';
import type { TTSResult } from '@/lib/api/tts';
import { getProviderForTier, isLanguagePremium } from '@/lib/multilang/provider-router';
import { updateSceneSegment, listSegmentsByScene, getStudioSession, updateStudioSession } from '@/lib/api/studio';
import { logger } from '@/lib/logger';

// --- Constants ---

const SERVICE_NAME = 'BatchTranslationService';

export const BATCH_TRANSLATION_FAILED = 2604;
export const BATCH_TTS_FAILED = 2605;
export const PROVIDER_UNAVAILABLE = 2609;

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60000;

// --- Types ---

export interface LanguageConfig {
  code: string;
  label: string;
}

export interface FailedScene {
  sceneId: string;
  lang: string;
  errorCode: typeof BATCH_TRANSLATION_FAILED | typeof BATCH_TTS_FAILED | typeof PROVIDER_UNAVAILABLE;
  message: string;
}

export interface BatchResult {
  completedScenes: number;
  totalScenes: number;
  failedScenes: FailedScene[];
}

export interface BatchError {
  code: typeof BATCH_TRANSLATION_FAILED | typeof BATCH_TTS_FAILED | typeof PROVIDER_UNAVAILABLE;
  message: string;
  lang: string;
  sceneId: string;
}

export type BatchProgressStep = 'translated' | 'tts_completed' | 'failed' | 'session_info_translated';

export type OnProgressCallback = (
  lang: string,
  sceneId: string,
  step: BatchProgressStep,
) => void;

// --- Polling helpers ---

async function pollTranslation(jobId: string): Promise<TranslationResult> {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const status = await getTranslationStatus(jobId);
    if (status && status.status !== 'processing' && status.status !== 'pending') {
      return status;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return {
    jobId,
    status: 'failed',
    translatedText: null,
    provider: 'marianmt',
    costProvider: null,
    costCharged: null,
  };
}

async function pollTTS(jobId: string, language: string): Promise<TTSResult> {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const status = await getTTSStatus(jobId);
    if (status && status.status !== 'processing' && status.status !== 'pending') {
      return status;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return {
    jobId,
    status: 'failed',
    audioKey: null,
    language,
    durationMs: null,
  };
}

// --- Session info translation ---

async function translateSessionInfo(
  sessionId: string,
  title: string,
  description: string,
  targetLang: string,
  qualityTier: QualityTier,
  sourceLang: string,
  tourId?: string,
): Promise<void> {
  logger.info(SERVICE_NAME, 'Translating session info', { sessionId, targetLang });

  // Translate title
  let translatedTitle: string | null = null;
  if (title) {
    const titleResult = await requestTranslation(
      `session-title-${sessionId}-${targetLang}`,
      title,
      sourceLang,
      targetLang,
      qualityTier,
    );
    let finalTitleResult = titleResult;
    if (finalTitleResult.status === 'processing' || finalTitleResult.status === 'pending') {
      finalTitleResult = await pollTranslation(finalTitleResult.jobId);
    }
    if (finalTitleResult.status === 'completed') {
      translatedTitle = finalTitleResult.translatedText;
    }
  }

  // Translate description
  let translatedDescription: string | null = null;
  if (description) {
    const descResult = await requestTranslation(
      `session-desc-${sessionId}-${targetLang}`,
      description,
      sourceLang,
      targetLang,
      qualityTier,
    );
    let finalDescResult = descResult;
    if (finalDescResult.status === 'processing' || finalDescResult.status === 'pending') {
      finalDescResult = await pollTranslation(finalDescResult.jobId);
    }
    if (finalDescResult.status === 'completed') {
      translatedDescription = finalDescResult.translatedText;
    }
  }

  // Read current session to merge
  const session = await getStudioSession(sessionId);
  const existingTitles = session?.translatedTitles ?? {};
  const existingDescriptions = session?.translatedDescriptions ?? {};

  const updatedTitles = { ...existingTitles };
  const updatedDescriptions = { ...existingDescriptions };

  if (translatedTitle !== null) {
    updatedTitles[targetLang] = translatedTitle;
  }
  if (translatedDescription !== null) {
    updatedDescriptions[targetLang] = translatedDescription;
  }

  // Save merged translations
  const saveResult = await updateStudioSession(sessionId, {
    translatedTitles: updatedTitles,
    translatedDescriptions: updatedDescriptions,
  });
  if (!saveResult.ok) {
    logger.warn(SERVICE_NAME, 'Session info save failed (non-fatal)', { sessionId, targetLang });
  }

  // Also sync translated descriptions to GuideTour for catalogue/moderation access
  if (tourId && translatedDescription !== null) {
    try {
      const { updateGuideTourMutation, getGuideTourById } = await import('@/lib/api/appsync-client');
      const tour = await getGuideTourById(tourId);
      const existingTourDescs = (tour as Record<string, unknown>)?.translatedDescriptions ?? {};
      const mergedDescs = { ...(typeof existingTourDescs === 'object' ? existingTourDescs : {}), [targetLang]: translatedDescription };
      await updateGuideTourMutation(tourId, { translatedDescriptions: mergedDescs });
      logger.info(SERVICE_NAME, 'GuideTour translatedDescriptions synced', { tourId, targetLang });
    } catch (err) {
      logger.warn(SERVICE_NAME, 'GuideTour description sync failed (non-fatal)', { tourId, targetLang, error: String(err) });
    }
  }

  logger.info(SERVICE_NAME, 'Session info translated', { sessionId, targetLang });
}

// --- Main batch function ---

export async function executeBatch(
  sessionId: string,
  scenes: StudioScene[],
  targetLangs: LanguageConfig[],
  qualityTier: QualityTier,
  onProgress?: OnProgressCallback,
  sessionTitle?: string,
  sessionDescription?: string,
  sourceLang: string = 'fr',
  tourId?: string,
): Promise<{ ok: true; value: BatchResult } | { ok: false; error: BatchError }> {
  const provider: TranslationProvider = getProviderForTier(qualityTier);
  const totalScenes = targetLangs.length * scenes.length;
  let completedScenes = 0;
  const failedScenes: FailedScene[] = [];

  logger.info(SERVICE_NAME, 'Batch started', {
    sessionId,
    totalScenes,
    targetLangs: targetLangs.map((l) => l.code),
    provider,
  });

  for (const lang of targetLangs) {
    // Translate session title + description before scenes
    if (sessionTitle || sessionDescription) {
      try {
        await translateSessionInfo(
          sessionId,
          sessionTitle ?? '',
          sessionDescription ?? '',
          lang.code,
          qualityTier,
          sourceLang,
          tourId,
        );
        onProgress?.(lang.code, sessionId, 'session_info_translated');
      } catch (err) {
        logger.warn(SERVICE_NAME, 'Session info translation failed (non-fatal)', {
          sessionId,
          lang: lang.code,
          error: String(err),
        });
      }
    }

    for (const scene of scenes) {
      // Find real segment ID in AppSync (not a fabricated one)
      const existingSegs = await listSegmentsByScene(scene.id);
      const existingSeg = existingSegs.find((s) => s.language === lang.code);
      const segmentId = existingSeg?.id ?? `${scene.id}-${lang.code}`;
      const sourceText = scene.transcriptText ?? '';

      // Capture the source scene's actual updatedAt — not Date.now() —
      // so staleness detection compares apples to apples
      const sourceUpdatedAt = scene.updatedAt ?? new Date().toISOString();

      // --- Translation ---
      let translationResult: TranslationResult;
      try {
        translationResult = await requestTranslation(
          segmentId,
          sourceText,
          sourceLang,
          lang.code,
          qualityTier,
        );

        // Poll if not yet completed
        if (translationResult.status === 'processing' || translationResult.status === 'pending') {
          translationResult = await pollTranslation(translationResult.jobId);
        }
      } catch (err) {
        logger.error(SERVICE_NAME, 'Translation request threw', {
          sceneId: scene.id,
          lang: lang.code,
          error: String(err),
        });
        failedScenes.push({
          sceneId: scene.id,
          lang: lang.code,
          errorCode: BATCH_TRANSLATION_FAILED,
          message: `Translation error: ${String(err)}`,
        });
        onProgress?.(lang.code, scene.id, 'failed');
        continue;
      }

      if (translationResult.status === 'failed') {
        const errorCode = translationResult.errorCode === PROVIDER_UNAVAILABLE
          ? PROVIDER_UNAVAILABLE
          : BATCH_TRANSLATION_FAILED;
        logger.error(SERVICE_NAME, 'Translation failed', {
          sceneId: scene.id,
          lang: lang.code,
          errorCode,
        });
        failedScenes.push({
          sceneId: scene.id,
          lang: lang.code,
          errorCode,
          message: errorCode === PROVIDER_UNAVAILABLE
            ? `Provider unavailable for scene ${scene.id} lang ${lang.code}`
            : `Translation returned status failed for scene ${scene.id} lang ${lang.code}`,
        });
        onProgress?.(lang.code, scene.id, 'failed');
        continue;
      }

      onProgress?.(lang.code, scene.id, 'translated');

      // --- Scene title translation (short text, no TTS) ---
      let translatedSceneTitle: string | null = null;
      if (scene.title) {
        try {
          const titleSegmentId = `${scene.id}-title-${lang.code}`;
          let titleResult = await requestTranslation(
            titleSegmentId,
            scene.title,
            sourceLang,
            lang.code,
            qualityTier,
          );
          if (titleResult.status === 'processing' || titleResult.status === 'pending') {
            titleResult = await pollTranslation(titleResult.jobId);
          }
          if (titleResult.status === 'completed') {
            translatedSceneTitle = titleResult.translatedText;
          }
        } catch (err) {
          logger.warn(SERVICE_NAME, 'Scene title translation failed (non-fatal)', {
            sceneId: scene.id,
            lang: lang.code,
            error: String(err),
          });
        }
      }

      // --- TTS ---
      const translatedText = translationResult.translatedText ?? '';
      let ttsResult: TTSResult;
      try {
        ttsResult = await requestTTS(segmentId, translatedText, lang.code);

        // Poll if not yet completed
        if (ttsResult.status === 'processing' || ttsResult.status === 'pending') {
          ttsResult = await pollTTS(ttsResult.jobId, lang.code);
        }
      } catch (err) {
        logger.error(SERVICE_NAME, 'TTS request threw', {
          sceneId: scene.id,
          lang: lang.code,
          error: String(err),
        });
        failedScenes.push({
          sceneId: scene.id,
          lang: lang.code,
          errorCode: BATCH_TTS_FAILED,
          message: `TTS error: ${String(err)}`,
        });
        onProgress?.(lang.code, scene.id, 'failed');
        continue;
      }

      if (ttsResult.status === 'failed') {
        logger.error(SERVICE_NAME, 'TTS failed', {
          sceneId: scene.id,
          lang: lang.code,
        });
        failedScenes.push({
          sceneId: scene.id,
          lang: lang.code,
          errorCode: BATCH_TTS_FAILED,
          message: `TTS returned status failed for scene ${scene.id} lang ${lang.code}`,
        });
        onProgress?.(lang.code, scene.id, 'failed');
        continue;
      }

      onProgress?.(lang.code, scene.id, 'tts_completed');

      // --- Save segment via AppSync ---
      try {
        // Never store base64 data URLs in AppSync (too large for DynamoDB)
        let audioKeyToStore = ttsResult.audioKey;
        if (audioKeyToStore && audioKeyToStore.startsWith('data:')) {
          try {
            const { uploadAudio } = await import('@/lib/studio/studio-upload-service');
            const audioResponse = await fetch(audioKeyToStore);
            const audioBlob = new Blob([await audioResponse.blob()], { type: 'audio/wav' });
            const uploadResult = await uploadAudio(audioBlob, sessionId, scene.sceneIndex ?? 0);
            if (uploadResult.ok) {
              audioKeyToStore = uploadResult.s3Key;
              logger.info(SERVICE_NAME, 'Batch TTS audio uploaded to S3', { sceneId: scene.id, s3Key: audioKeyToStore });
            } else {
              audioKeyToStore = `tts-${lang.code}-${scene.id}-${Date.now()}`;
              logger.warn(SERVICE_NAME, 'Batch S3 upload failed, using marker', { error: uploadResult.error });
            }
          } catch (uploadErr) {
            audioKeyToStore = `tts-${lang.code}-${scene.id}-${Date.now()}`;
            logger.warn(SERVICE_NAME, 'Batch S3 upload exception', { error: String(uploadErr) });
          }
        }

        const segmentUpdates: Parameters<typeof updateSceneSegment>[1] = {
          transcriptText: translatedText,
          audioKey: audioKeyToStore,
          sourceUpdatedAt,
          language: lang.code,
          translationProvider: translationResult.provider,
          status: 'tts_generated',
          ttsGenerated: true,
          manuallyEdited: false,
        };
        if (translatedSceneTitle !== null) {
          segmentUpdates.translatedTitle = translatedSceneTitle;
        }
        const saveResult = await updateSceneSegment(segmentId, segmentUpdates);
        if (!saveResult.ok) {
          logger.warn(SERVICE_NAME, 'Segment save failed (non-fatal)', {
            segmentId,
            sceneId: scene.id,
            lang: lang.code,
          });
        }
      } catch (err) {
        logger.warn(SERVICE_NAME, 'Segment save threw (non-fatal)', {
          segmentId,
          sceneId: scene.id,
          lang: lang.code,
          error: String(err),
        });
      }

      completedScenes++;
    }
  }

  logger.info(SERVICE_NAME, 'Batch completed', {
    sessionId,
    completedScenes,
    totalScenes,
    failedCount: failedScenes.length,
  });

  return {
    ok: true,
    value: {
      completedScenes,
      totalScenes,
      failedScenes,
    },
  };
}

// --- Retry individual scene ---

export interface RetrySceneResult {
  ok: true;
  translatedText: string;
  audioKey: string | null;
}

export interface RetrySceneError {
  ok: false;
  errorCode: typeof BATCH_TRANSLATION_FAILED | typeof BATCH_TTS_FAILED | typeof PROVIDER_UNAVAILABLE;
  message: string;
}

/**
 * Retry translation + TTS for a single failed scene.
 * Uses the exact same requestTranslation/requestTTS functions as executeBatch.
 */
export async function retryScene(
  scene: StudioScene,
  lang: string,
  qualityTier: QualityTier,
  sourceLang: string = 'fr',
): Promise<RetrySceneResult | RetrySceneError> {
  const provider: TranslationProvider = getProviderForTier(qualityTier);
  // Find real segment ID in AppSync
  const existingSegs = await listSegmentsByScene(scene.id);
  const existingSeg = existingSegs.find((s) => s.language === lang);
  const segmentId = existingSeg?.id ?? `${scene.id}-${lang}`;
  const sourceText = scene.transcriptText ?? '';
  const sourceUpdatedAt = scene.updatedAt ?? new Date().toISOString();

  logger.info(SERVICE_NAME, 'Retry scene started', { sceneId: scene.id, lang, provider });

  // --- Translation ---
  let translationResult: TranslationResult;
  try {
    translationResult = await requestTranslation(segmentId, sourceText, sourceLang, lang, qualityTier);
    if (translationResult.status === 'processing' || translationResult.status === 'pending') {
      translationResult = await pollTranslation(translationResult.jobId);
    }
  } catch (err) {
    logger.error(SERVICE_NAME, 'Retry translation threw', { sceneId: scene.id, lang, error: String(err) });
    return { ok: false, errorCode: BATCH_TRANSLATION_FAILED, message: `Translation error: ${String(err)}` };
  }

  if (translationResult.status === 'failed') {
    const errorCode = translationResult.errorCode === PROVIDER_UNAVAILABLE
      ? PROVIDER_UNAVAILABLE
      : BATCH_TRANSLATION_FAILED;
    logger.error(SERVICE_NAME, 'Retry translation failed', { sceneId: scene.id, lang, errorCode });
    return {
      ok: false,
      errorCode,
      message: errorCode === PROVIDER_UNAVAILABLE
        ? `Provider unavailable for scene ${scene.id} lang ${lang}`
        : `Translation returned status failed for scene ${scene.id} lang ${lang}`,
    };
  }

  // --- TTS ---
  const translatedText = translationResult.translatedText ?? '';
  let ttsResult: TTSResult;
  try {
    ttsResult = await requestTTS(segmentId, translatedText, lang);
    if (ttsResult.status === 'processing' || ttsResult.status === 'pending') {
      ttsResult = await pollTTS(ttsResult.jobId, lang);
    }
  } catch (err) {
    logger.error(SERVICE_NAME, 'Retry TTS threw', { sceneId: scene.id, lang, error: String(err) });
    return { ok: false, errorCode: BATCH_TTS_FAILED, message: `TTS error: ${String(err)}` };
  }

  if (ttsResult.status === 'failed') {
    logger.error(SERVICE_NAME, 'Retry TTS failed', { sceneId: scene.id, lang });
    return { ok: false, errorCode: BATCH_TTS_FAILED, message: `TTS returned status failed for scene ${scene.id} lang ${lang}` };
  }

  // --- Save segment ---
  try {
    await updateSceneSegment(segmentId, {
      transcriptText: translatedText,
      audioKey: ttsResult.audioKey,
      sourceUpdatedAt,
      language: lang,
      translationProvider: translationResult.provider,
      status: 'tts_generated',
      ttsGenerated: true,
      manuallyEdited: false,
    });
  } catch (err) {
    logger.warn(SERVICE_NAME, 'Retry segment save threw (non-fatal)', {
      segmentId,
      sceneId: scene.id,
      lang,
      error: String(err),
    });
  }

  logger.info(SERVICE_NAME, 'Retry scene completed', { sceneId: scene.id, lang });
  return { ok: true, translatedText, audioKey: ttsResult.audioKey };
}

// --- Missing scenes detection ---

export interface MissingScenesResult {
  completedScenes: string[];
  missingScenes: string[];
}

/**
 * Pure function: given segments and all scenes, return which scenes are missing for a given language.
 * A scene is "complete" only if it has a segment with both transcriptText (translated text) and audioKey.
 */
export function getMissingScenes(
  segments: SceneSegment[],
  scenes: StudioScene[],
  lang: string,
): string[] {
  const langSegments = segments.filter((s) => s.language === lang);
  const completedSceneIds = langSegments
    .filter((s) => s.transcriptText && s.audioKey)
    .map((s) => s.sceneId);
  const allSceneIds = scenes.map((s) => s.id);
  return allSceneIds.filter((id) => !completedSceneIds.includes(id));
}

/**
 * Detect missing scenes by fetching segments from the API for each scene,
 * then comparing with the full scene list.
 */
export async function detectMissingScenes(
  sessionId: string,
  scenes: StudioScene[],
  lang: string,
): Promise<MissingScenesResult> {
  logger.info(SERVICE_NAME, 'Detecting missing scenes', { sessionId, lang, totalScenes: scenes.length });

  // Fetch all segments across all scenes
  const allSegments: SceneSegment[] = [];
  for (const scene of scenes) {
    const segments = await listSegmentsByScene(scene.id);
    allSegments.push(...segments);
  }

  const missingScenes = getMissingScenes(allSegments, scenes, lang);
  const completedScenes = scenes
    .map((s) => s.id)
    .filter((id) => !missingScenes.includes(id));

  logger.info(SERVICE_NAME, 'Missing scenes detected', {
    sessionId,
    lang,
    completed: completedScenes.length,
    missing: missingScenes.length,
  });

  return { completedScenes, missingScenes };
}

// --- Error message helpers ---

export function getErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case BATCH_TRANSLATION_FAILED:
      return 'La traduction a echoue pour cette scene.';
    case BATCH_TTS_FAILED:
      return 'La generation audio a echoue pour cette scene.';
    case PROVIDER_UNAVAILABLE:
      return 'Le service de traduction est temporairement indisponible.';
    default:
      return 'Une erreur inconnue est survenue.';
  }
}
