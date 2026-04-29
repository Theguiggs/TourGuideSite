/**
 * StudioUploadService — S3 upload for audio and photos with retry and signed URL cache.
 */

import { uploadData, getUrl } from 'aws-amplify/storage';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'StudioUploadService';

// --- Validation ---

const AUDIO_MIME_PREFIXES = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/x-aac', 'audio/aac', 'audio/wav', 'audio/wave', 'audio/x-wav'];
const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Check audio MIME with prefix match (handles codecs suffix like "audio/webm;codecs=opus") */
function isValidAudioMime(mime: string): boolean {
  const base = mime.split(';')[0].trim();
  return AUDIO_MIME_PREFIXES.includes(base);
}
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;  // 5MB

// --- Signed URL Cache (LRU, TTL 50min) ---

const URL_CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes
const URL_CACHE_MAX = 100;

interface CachedUrl {
  url: string;
  expiresAt: number;
}

const urlCache = new Map<string, CachedUrl>();

function evictLru(): void {
  if (urlCache.size <= URL_CACHE_MAX) return;
  // Delete oldest entry (first inserted in Map iteration order)
  const firstKey = urlCache.keys().next().value;
  if (firstKey) urlCache.delete(firstKey);
}

// --- Progress callbacks ---

type ProgressCallback = (progress: { loaded: number; total: number }) => void;
const progressCallbacks = new Map<string, Set<ProgressCallback>>();

function notifyProgress(uploadId: string, loaded: number, total: number): void {
  const cbs = progressCallbacks.get(uploadId);
  if (cbs) {
    for (const cb of cbs) cb({ loaded, total });
  }
}

// --- Retry helper ---

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  const delays = [1000, 2000, 4000];
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
      }
    }
  }
  throw lastError;
}

// --- Extension helper ---

function getExtFromMime(mime: string): string {
  const base = mime.split(';')[0].trim();
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/x-aac': 'aac',
    'audio/aac': 'aac',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[base] ?? 'bin';
}

// --- Public API ---

export async function uploadAudio(
  blob: Blob,
  sessionId: string,
  sceneIndex: number,
): Promise<{ ok: true; s3Key: string } | { ok: false; error: string }> {
  if (!isValidAudioMime(blob.type)) {
    return { ok: false, error: `Type audio non supporté : ${blob.type}` };
  }
  if (blob.size > MAX_AUDIO_SIZE) {
    return { ok: false, error: `Fichier audio trop volumineux (${Math.round(blob.size / 1024 / 1024)}MB > 50MB)` };
  }

  const ext = getExtFromMime(blob.type);
  const uploadId = `${sessionId}-scene-${sceneIndex}-audio`;

  try {
    const result = await withRetry(() =>
      uploadData({
        path: ({ identityId }) => `guide-studio/${identityId}/${sessionId}/audio/scene_${sceneIndex}.${ext}`,
        data: blob,
        options: {
          onProgress: (event) => {
            notifyProgress(uploadId, event.transferredBytes, event.totalBytes ?? blob.size);
          },
        },
      }).result,
    );

    const s3Key = result.path;
    logger.info(SERVICE_NAME, 'Audio uploaded', { sessionId, sceneIndex, s3Key });
    return { ok: true, s3Key };
  } catch (error) {
    logger.error(SERVICE_NAME, 'Audio upload failed after retries', { sessionId, sceneIndex, error: String(error) });
    return { ok: false, error: 'Upload audio échoué après 3 tentatives.' };
  }
}

export async function uploadPhoto(
  file: File,
  sessionId: string,
  sceneIndex: number,
  photoIndex: number,
): Promise<{ ok: true; s3Key: string } | { ok: false; error: string }> {
  if (!PHOTO_MIMES.has(file.type)) {
    return { ok: false, error: `Type photo non supporté : ${file.type}` };
  }
  if (file.size > MAX_PHOTO_SIZE) {
    return { ok: false, error: `Photo trop volumineuse (${Math.round(file.size / 1024 / 1024)}MB > 5MB)` };
  }

  const ext = getExtFromMime(file.type);
  const uploadId = `${sessionId}-scene-${sceneIndex}-photo-${photoIndex}`;

  try {
    const result = await withRetry(() =>
      uploadData({
        path: ({ identityId }) => `guide-studio/${identityId}/${sessionId}/photos/scene_${sceneIndex}_${photoIndex}.${ext}`,
        data: file,
        options: {
          onProgress: (event) => {
            notifyProgress(uploadId, event.transferredBytes, event.totalBytes ?? file.size);
          },
        },
      }).result,
    );

    const s3Key = result.path;
    logger.info(SERVICE_NAME, 'Photo uploaded', { sessionId, sceneIndex, photoIndex, s3Key });
    return { ok: true, s3Key };
  } catch (error) {
    logger.error(SERVICE_NAME, 'Photo upload failed after retries', { sessionId, sceneIndex, photoIndex, error: String(error) });
    return { ok: false, error: 'Upload photo échoué après 3 tentatives.' };
  }
}

export async function uploadCoverPhoto(
  file: File,
  sessionId: string,
): Promise<{ ok: true; s3Key: string } | { ok: false; error: string }> {
  if (!PHOTO_MIMES.has(file.type)) {
    return { ok: false, error: `Type photo non supporté : ${file.type}` };
  }
  if (file.size > MAX_PHOTO_SIZE) {
    return { ok: false, error: `Photo trop volumineuse (${Math.round(file.size / 1024 / 1024)}MB > 5MB)` };
  }

  const ext = getExtFromMime(file.type);
  const uploadId = `${sessionId}-cover`;

  try {
    const result = await withRetry(() =>
      uploadData({
        path: ({ identityId }) => `guide-studio/${identityId}/${sessionId}/cover.${ext}`,
        data: file,
        options: {
          onProgress: (event) => {
            notifyProgress(uploadId, event.transferredBytes, event.totalBytes ?? file.size);
          },
        },
      }).result,
    );

    const s3Key = result.path;
    logger.info(SERVICE_NAME, 'Cover photo uploaded', { sessionId, s3Key });
    return { ok: true, s3Key };
  } catch (error) {
    logger.error(SERVICE_NAME, 'Cover photo upload failed after retries', { sessionId, error: String(error) });
    return { ok: false, error: 'Upload photo de couverture échoué après 3 tentatives.' };
  }
}

export async function getPlayableUrl(s3Key: string): Promise<string> {
  const cached = urlCache.get(s3Key);
  if (cached && Date.now() < cached.expiresAt) {
    // Move to end for true LRU eviction
    urlCache.delete(s3Key);
    urlCache.set(s3Key, cached);
    return cached.url;
  }

  try {
    const result = await getUrl({ path: s3Key, options: { expiresIn: 3600 } });
    const url = result.url.toString();
    urlCache.set(s3Key, { url, expiresAt: Date.now() + URL_CACHE_TTL_MS });
    evictLru();
    return url;
  } catch (error) {
    logger.error(SERVICE_NAME, 'getPlayableUrl failed', { s3Key, error: String(error) });
    throw error;
  }
}

export function onProgress(uploadId: string, callback: ProgressCallback): () => void {
  if (!progressCallbacks.has(uploadId)) {
    progressCallbacks.set(uploadId, new Set());
  }
  progressCallbacks.get(uploadId)!.add(callback);
  return () => {
    progressCallbacks.get(uploadId)?.delete(callback);
  };
}

export async function uploadTTSAudio(
  blob: Blob,
  sessionId: string,
  sceneIndex: number,
  segmentIndex: number,
  language: string,
): Promise<{ ok: true; s3Key: string } | { ok: false; error: string }> {
  // Validate MIME — TTS generates WAV audio
  const baseMime = blob.type.split(';')[0].trim();
  if (baseMime && !baseMime.startsWith('audio/')) {
    return { ok: false, error: `Type non supporté pour audio TTS : ${blob.type}` };
  }
  if (blob.size > MAX_AUDIO_SIZE) {
    return { ok: false, error: `Audio TTS trop volumineux (${Math.round(blob.size / 1024 / 1024)}MB > 50MB)` };
  }

  const uploadId = `${sessionId}-scene-${sceneIndex}-seg-${segmentIndex}-${language}-tts`;

  try {
    const result = await withRetry(() =>
      uploadData({
        path: ({ identityId }) =>
          `guide-studio/${identityId}/${sessionId}/audio/scene_${sceneIndex}_seg_${segmentIndex}_${language}.wav`,
        data: blob,
        options: {
          onProgress: (event) => {
            notifyProgress(uploadId, event.transferredBytes, event.totalBytes ?? blob.size);
          },
        },
      }).result,
    );

    const s3Key = result.path;
    logger.info(SERVICE_NAME, 'TTS audio uploaded', { sessionId, sceneIndex, segmentIndex, language, s3Key });
    return { ok: true, s3Key };
  } catch (error) {
    logger.error(SERVICE_NAME, 'TTS audio upload failed after retries', {
      sessionId, sceneIndex, segmentIndex, language, error: String(error),
    });
    return { ok: false, error: 'Upload audio TTS échoué après 3 tentatives.' };
  }
}

/**
 * Upload a custom ambiance sound to the guide's personal sound bank.
 * Accepts mp3, m4a, wav, ogg, webm (recorded via MediaRecorder).
 */
export async function uploadCustomAmbiance(
  blob: Blob,
  guideId: string,
  soundId: string,
): Promise<{ ok: true; s3Key: string } | { ok: false; error: string }> {
  const base = blob.type.split(';')[0].trim();
  const acceptableAudio = base === '' || base.startsWith('audio/') || base.startsWith('video/webm');
  if (!acceptableAudio) {
    return { ok: false, error: `Type audio non supporte : ${blob.type}` };
  }
  if (blob.size > MAX_AUDIO_SIZE) {
    return { ok: false, error: `Fichier trop volumineux (${Math.round(blob.size / 1024 / 1024)}MB > 50MB)` };
  }

  // Preserve extension when possible (browser MediaRecorder → webm, phone uploads → m4a/mp3)
  const extMap: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    'video/webm': 'webm',
  };
  const ext = extMap[base] ?? 'bin';

  try {
    const result = await withRetry(() =>
      uploadData({
        path: ({ identityId }) => `guide-studio/${identityId}/ambiance/${soundId}.${ext}`,
        data: blob,
      }).result,
    );
    const s3Key = result.path;
    logger.info(SERVICE_NAME, 'Custom ambiance uploaded', { guideId, soundId, s3Key });
    return { ok: true, s3Key };
  } catch (error) {
    logger.error(SERVICE_NAME, 'Custom ambiance upload failed', { guideId, soundId, error: String(error) });
    return { ok: false, error: 'Upload echoue apres 3 tentatives.' };
  }
}

export function clearCache(): void {
  urlCache.clear();
}

/** Remove a single entry from the signed URL cache (e.g. after re-uploading the same key). */
export function clearCacheEntry(s3Key: string): void {
  urlCache.delete(s3Key);
}

// Exported for testing
export const _testExports = { urlCache, URL_CACHE_TTL_MS, withRetry };
