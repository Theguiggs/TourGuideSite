/** Shared config + client helpers for microservice API calls (TTS, translation,
 * silence detection).
 *
 * The browser ALWAYS talks to /api/microservice/* (Next.js server-side proxy).
 * The proxy injects the real API key from a server-only env var. This keeps the
 * shared secret out of the bundled JS.
 *
 * The heavy endpoints (translate / tts) are async: POST returns 202 {job_id} (or
 * 429 when the microservice's in-process queue is full), and the caller polls
 * GET /v1/jobs/{job_id} until completed|failed. submitMicroserviceJob() and
 * pollMicroserviceJob() encapsulate that contract for translation.ts + tts.ts.
 */

import { logger } from '@/lib/logger';
import { fetchAuthSession } from 'aws-amplify/auth';

const SERVICE_NAME = 'MicroserviceClient';
const SUBMIT_MAX_ATTEMPTS = 5;

export function getMicroserviceUrl(): string {
  return '/api/microservice';
}

export async function getMicroserviceHeaders(): Promise<Record<string, string>> {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString();
  if (!accessToken) {
    throw new Error('Authenticated Cognito session required');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface MicroserviceJobBody {
  ok?: boolean;
  status?: string;
  error?: string;
  // Result fields are inlined on completion (translations / audio_base64 / ...).
  [key: string]: unknown;
}

/**
 * POST a job-submit to the microservice with bounded backoff on 429 backpressure.
 * The microservice answers 429 + Retry-After when its in-process queue is full;
 * for a handful of concurrent guides the queue drains quickly, so retrying lets a
 * queued submit through instead of failing the scene. Returns the final Response
 * (which may still be 429 if every attempt is exhausted).
 */
export async function submitMicroserviceJob(path: string, body: unknown): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 1; attempt <= SUBMIT_MAX_ATTEMPTS; attempt++) {
    const response = await fetch(`${getMicroserviceUrl()}${path}`, {
      method: 'POST',
      headers: await getMicroserviceHeaders(),
      body: JSON.stringify(body),
    });
    if (response.status !== 429) return response;
    last = response;
    const retryAfter = Number(response.headers.get('Retry-After')) || attempt * 2;
    logger.warn(SERVICE_NAME, 'Microservice busy (429), backing off', { path, attempt, retryAfter });
    if (attempt < SUBMIT_MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
    }
  }
  return last as Response;
}

/**
 * Poll a microservice job. Returns the parsed body, or null on a transient
 * network error (the caller should keep polling). A 404 (unknown job — e.g. the
 * service restarted and lost in-flight state) is surfaced as a terminal failure.
 */
export async function pollMicroserviceJob(jobId: string): Promise<MicroserviceJobBody | null> {
  // Authentication failures are not transient network failures. Resolve the
  // session before entering the retryable fetch block so callers can stop.
  const headers = await getMicroserviceHeaders();
  try {
    const response = await fetch(`${getMicroserviceUrl()}/v1/jobs/${jobId}`, {
      headers,
    });
    if (response.status === 404) {
      return { ok: false, status: 'failed', error: 'job not found' };
    }
    return (await response.json()) as MicroserviceJobBody;
  } catch (err) {
    logger.error(SERVICE_NAME, 'pollMicroserviceJob failed', { jobId, error: String(err) });
    return null;
  }
}
