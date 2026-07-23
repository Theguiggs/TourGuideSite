/**
 * Real-mode TTS flow against the async microservice: requestTTS() submits and
 * returns {status:'processing', jobId}; getTTSStatus() polls GET /v1/jobs/{id}
 * and builds the data-URL audio key on completion. Backpressure (429) and a
 * failed job map to a failed TTSResult.
 */
jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => false,
  shouldUseRealApi: () => true,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn().mockResolvedValue({
    tokens: { accessToken: { toString: () => 'valid-access-token' } },
  }),
}));

import { requestTTS, getTTSStatus, __resetTTSStubs } from '../tts';

function mockMicroservice(opts: {
  submitStatus?: number;
  job?: { status: string; audio_base64?: string; duration_ms?: number };
} = {}) {
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith('/v1/tts/generate')) {
      const status = opts.submitStatus ?? 202;
      return {
        status,
        ok: status < 400,
        headers: { get: () => null },
        json: async () => (status === 202 ? { ok: true, job_id: 'tts-1', status: 'queued' } : { ok: false, error: 'busy' }),
      } as unknown as Response;
    }
    if (u.includes('/v1/jobs/')) {
      const job = opts.job ?? { status: 'completed', audio_base64: 'QUJD', duration_ms: 4200 };
      return {
        status: 200,
        ok: true,
        headers: { get: () => null },
        json: async () => ({ ok: job.status !== 'failed', ...job }),
      } as unknown as Response;
    }
    throw new Error(`unexpected fetch: ${u}`);
  }) as unknown as typeof fetch;
}

describe('TTS real-mode (async job/poll)', () => {
  beforeEach(() => {
    __resetTTSStubs();
  });

  it('submit returns processing + job id', async () => {
    mockMicroservice();
    const result = await requestTTS('seg-1', 'Bonjour', 'fr');
    expect(result.status).toBe('processing');
    expect(result.jobId).toBe('tts-1');
    expect(result.audioKey).toBeNull();
    expect(result.language).toBe('fr');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/microservice/v1/tts/generate',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-access-token',
        }),
      }),
    );
  });

  it('poll returns completed with a data-URL audio key + duration', async () => {
    mockMicroservice();
    const submit = await requestTTS('seg-1', 'Bonjour', 'fr');
    const final = (await getTTSStatus(submit.jobId))!;
    expect(final.status).toBe('completed');
    expect(final.audioKey).toBe('data:audio/wav;base64,QUJD');
    expect(final.durationMs).toBe(4200);
    expect(final.language).toBe('fr');
  });

  it('maps 429 backpressure to a failed result', async () => {
    // Submit retries with backoff before giving up — drive the timers fast.
    jest.useFakeTimers();
    mockMicroservice({ submitStatus: 429 });
    const promise = requestTTS('seg-1', 'Bonjour', 'fr');
    await jest.runAllTimersAsync();
    const result = await promise;
    jest.useRealTimers();
    expect(result.status).toBe('failed');
    expect(result.audioKey).toBeNull();
  });

  it('maps a failed microservice job to a failed result', async () => {
    mockMicroservice({ job: { status: 'failed' } });
    const submit = await requestTTS('seg-1', 'Bonjour', 'fr');
    const final = (await getTTSStatus(submit.jobId))!;
    expect(final.status).toBe('failed');
    expect(final.audioKey).toBeNull();
  });

  it('returns processing while the job is still queued', async () => {
    mockMicroservice({ job: { status: 'processing' } });
    const submit = await requestTTS('seg-1', 'Bonjour', 'fr');
    const status = (await getTTSStatus(submit.jobId))!;
    expect(status.status).toBe('processing');
  });
});
