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

// --- Real-mode microservice jobs ---
// The microservice TTS endpoint is async: submit → job_id → poll. We remember the
// language per job_id so getTTSStatus can build the TTSResult on completion.
const microserviceTTSJobs = new Map<string, { language: string }>();

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
    // Async: submit and return a job id. getTTSStatus polls GET /v1/jobs/{id}
    // and builds the data-URL audio key on completion.
    const response = await submitMicroserviceJob('/v1/tts/generate', { text, language });

    // 429 = backpressure exhausted after retries → transient failure, retryable.
    if (response.status === 429) {
      logger.error(SERVICE_NAME, 'TTS submit unavailable (429)', { language });
      return { jobId: '', status: 'failed', audioKey: null, language, durationMs: null };
    }

    const data = await response.json();
    if (data.ok && data.job_id) {
      microserviceTTSJobs.set(data.job_id, { language });
      return {
        jobId: data.job_id,
        status: 'processing',
        audioKey: null,
        language,
        durationMs: null,
      };
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

  // Microservice TTS job: poll /v1/jobs/{id} and build the data-URL on completion.
  const tracked = microserviceTTSJobs.get(jobId);
  if (tracked) {
    const body = await pollMicroserviceJob(jobId);
    // Transient network error → keep the caller polling.
    if (!body) {
      return { jobId, status: 'processing', audioKey: null, language: tracked.language, durationMs: null };
    }
    if (body.status === 'completed' && body.audio_base64) {
      microserviceTTSJobs.delete(jobId);
      return {
        jobId,
        status: 'completed',
        audioKey: `data:audio/wav;base64,${body.audio_base64 as string}`,
        language: tracked.language,
        durationMs: (body.duration_ms as number) ?? null,
      };
    }
    if (body.status === 'failed') {
      microserviceTTSJobs.delete(jobId);
      return { jobId, status: 'failed', audioKey: null, language: tracked.language, durationMs: null };
    }
    // queued | processing
    return { jobId, status: 'processing', audioKey: null, language: tracked.language, durationMs: null };
  }

  // Otherwise: a backend (Lambda/AppSync) TTS job.
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

import { submitMicroserviceJob, pollMicroserviceJob } from './microservice-config';

/** Test-only: reset stub state */
export function __resetTTSStubs(): void {
  stubJobs.clear();
  microserviceTTSJobs.clear();
}
