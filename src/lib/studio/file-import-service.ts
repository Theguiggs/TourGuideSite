import { logger } from '@/lib/logger';
import { StudioErrorCode, createStudioError, type StudioError } from '@/types/studio';

const SERVICE_NAME = 'FileImportService';

export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
];

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_DURATION_MIN = 30;

export interface ImportResult {
  blob: Blob;
  mimeType: string;
  fileName: string;
  fileSizeMB: number;
  durationMs: number | null; // null if duration can't be determined
}

export async function validateAndImportFile(
  file: File,
): Promise<{ ok: true; result: ImportResult } | { ok: false; error: StudioError }> {
  // Validate type
  const typeValid = ALLOWED_AUDIO_TYPES.includes(file.type);
  const extensionValid = !file.type && file.name.match(/\.(mp3|m4a|aac|wav|webm|ogg)$/i);
  if (!typeValid && !extensionValid) {
    logger.warn(SERVICE_NAME, 'Invalid file type', { type: file.type, name: file.name });
    return {
      ok: false,
      error: createStudioError(
        StudioErrorCode.FILE_IMPORT_INVALID,
        `Format non supporté : ${file.type || 'inconnu'}. Formats acceptés : MP3, M4A, AAC, WAV, WebM.`,
      ),
    };
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = Math.round(file.size / (1024 * 1024));
    logger.warn(SERVICE_NAME, 'File too large', { sizeMB, maxMB: MAX_FILE_SIZE_MB });
    return {
      ok: false,
      error: createStudioError(
        StudioErrorCode.FILE_IMPORT_INVALID,
        `Fichier trop volumineux : ${sizeMB} Mo (max ${MAX_FILE_SIZE_MB} Mo).`,
      ),
    };
  }

  // Try to get duration via HTMLAudioElement
  let durationMs: number | null = null;
  try {
    durationMs = await getAudioDuration(file);
    if (durationMs !== null && durationMs > MAX_DURATION_MIN * 60 * 1000) {
      const durationMin = Math.round(durationMs / 60000);
      logger.warn(SERVICE_NAME, 'File too long', { durationMin, maxMin: MAX_DURATION_MIN });
      return {
        ok: false,
        error: createStudioError(
          StudioErrorCode.FILE_IMPORT_INVALID,
          `Durée trop longue : ${durationMin} min (max ${MAX_DURATION_MIN} min).`,
        ),
      };
    }
  } catch {
    // Duration check failed — proceed without it
    logger.warn(SERVICE_NAME, 'Could not determine audio duration', { name: file.name });
  }

  const result: ImportResult = {
    blob: file,
    mimeType: file.type || 'audio/mpeg',
    fileName: file.name,
    fileSizeMB: Math.round((file.size / (1024 * 1024)) * 10) / 10,
    durationMs,
  };

  logger.info(SERVICE_NAME, 'File imported successfully', {
    name: file.name,
    sizeMB: result.fileSizeMB,
    mimeType: result.mimeType,
  });

  return { ok: true, result };
}

function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      cleanup();
      if (isFinite(duration)) {
        resolve(Math.round(duration * 1000));
      } else {
        resolve(null);
      }
    });

    audio.addEventListener('error', () => {
      cleanup();
      resolve(null);
    });

    // Timeout after 5s
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);
  });
}
