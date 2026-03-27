import type { TTSJobStatus } from '@/types/studio';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'TTSAPI';

// --- Types ---

export interface TTSResult {
  jobId: string;
  status: TTSJobStatus;
  audioKey: string | null;
  language: string;
  durationMs: number | null;
}

// --- Stub state ---

const stubJobs = new Map<string, {
  segmentId: string;
  text: string;
  language: string;
  startedAt: number;
  durationMs: number;
}>();

// --- Stub API ---

function stubRequestTTS(segmentId: string, text: string, language: string): TTSResult {
  const jobId = `tts-${Date.now()}-${segmentId}`;

  stubJobs.set(jobId, {
    segmentId,
    text,
    language,
    startedAt: Date.now(),
    durationMs: 5000, // 5s simulated
  });

  logger.info(SERVICE_NAME, 'Stub TTS triggered', { jobId, segmentId, language });
  return {
    jobId,
    status: 'processing',
    audioKey: null,
    language,
    durationMs: null,
  };
}

function stubGetStatus(jobId: string): TTSResult | null {
  const job = stubJobs.get(jobId);
  if (!job) return null;

  const elapsed = Date.now() - job.startedAt;

  if (elapsed < job.durationMs) {
    return {
      jobId,
      status: 'processing',
      audioKey: null,
      language: job.language,
      durationMs: null,
    };
  }

  // Simulate audio duration proportional to text length (~150 words/min)
  const wordCount = job.text.split(/\s+/).length;
  const estimatedDurationMs = Math.round((wordCount / 150) * 60 * 1000);

  return {
    jobId,
    status: 'completed',
    audioKey: `guide-studio/stub/${job.segmentId}_${job.language}.wav`,
    language: job.language,
    durationMs: estimatedDurationMs,
  };
}

// --- Public API ---

export async function requestTTS(
  segmentId: string,
  text: string,
  language: string,
): Promise<TTSResult> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 300));
    return stubRequestTTS(segmentId, text, language);
  }

  try {
    const url = getMicroserviceUrl();
    const response = await fetch(`${url}/v1/tts/generate`, {
      method: 'POST',
      headers: getMicroserviceHeaders(),
      body: JSON.stringify({ text, language }),
    });
    const data = await response.json();

    if (data.ok && data.audio_base64) {
      // Decode base64 and upload to S3 via studioUploadService
      try {
        const binaryString = atob(data.audio_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });

        const { uploadTTSAudio } = await import('@/lib/studio/studio-upload-service');
        // Extract sessionId and sceneIndex from segmentId pattern or use defaults
        const uploadResult = await uploadTTSAudio(blob, 'tts-session', 0, 0, language);
        if (uploadResult.ok) {
          return {
            jobId: `tts-${Date.now()}-${segmentId}`,
            status: 'completed',
            audioKey: uploadResult.s3Key,
            language,
            durationMs: data.duration_ms ?? null,
          };
        }
        logger.error(SERVICE_NAME, 'TTS S3 upload failed', { error: uploadResult.error });
      } catch (uploadErr) {
        logger.error(SERVICE_NAME, 'TTS base64 decode/upload failed', { error: String(uploadErr) });
      }
      return { jobId: '', status: 'failed', audioKey: null, language, durationMs: null };
    }

    return {
      jobId: '',
      status: 'failed',
      audioKey: null,
      language,
      durationMs: null,
    };
  } catch (err) {
    logger.error(SERVICE_NAME, 'requestTTS failed', { error: String(err) });
    return {
      jobId: '',
      status: 'failed',
      audioKey: null,
      language,
      durationMs: null,
    };
  }
}

export async function getTTSStatus(jobId: string): Promise<TTSResult | null> {
  if (shouldUseStubs()) {
    return stubGetStatus(jobId);
  }

  // Real mode: query backend for TTS job status
  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).queries.checkTTS(
      { jobId },
      { authMode: 'userPool' },
    );
    return result?.data ?? null;
  } catch (err) {
    logger.error(SERVICE_NAME, 'getTTSStatus failed', { error: String(err) });
    return null;
  }
}

import { getMicroserviceUrl, getMicroserviceHeaders } from './microservice-config';

/** Test-only: reset stub state */
export function __resetTTSStubs(): void {
  stubJobs.clear();
}
