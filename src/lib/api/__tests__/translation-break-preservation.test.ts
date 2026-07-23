/**
 * Verifies that SSML <break/> tags survive auto-translation: they must be
 * stripped from what we send to MarianMT (markup is not translatable) and
 * re-inserted at their original positions in the result.
 *
 * The microservice translate endpoint is async (submit → job_id → poll), so the
 * real-mode flow is: requestTranslation() submits and returns {status:'processing'},
 * then getTranslationStatus() polls the job and reassembles the break tags on
 * completion. These tests drive that full flow against a mocked fetch.
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

import { requestTranslation, getTranslationStatus, __resetTranslationStubs } from '../translation';

interface FakeJob {
  status: 'completed' | 'failed';
  translations?: string[];
  error?: string;
}

// Configures the mocked fetch: POST /v1/translate/batch → 202 {job_id}; the
// matching GET /v1/jobs/{id} returns `job`. `submitStatus` overrides the submit
// response code (e.g. 429) to exercise backpressure.
function mockMicroservice(opts: { job?: FakeJob; submitStatus?: number; retryAfter?: string } = {}) {
  const sent: { texts: string[] } = { texts: [] };
  global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith('/v1/translate/batch')) {
      const body = JSON.parse((init?.body as string) ?? '{}');
      sent.texts = body.texts;
      const status = opts.submitStatus ?? 202;
      return {
        status,
        ok: status < 400,
        headers: { get: (h: string) => (h.toLowerCase() === 'retry-after' ? opts.retryAfter ?? null : null) },
        json: async () => (status === 202 ? { ok: true, job_id: 'job-1', status: 'queued' } : { ok: false, error: 'busy' }),
      } as unknown as Response;
    }
    if (u.includes('/v1/jobs/')) {
      const job = opts.job ?? { status: 'completed', translations: sent.texts.map((t) => `[es]${t}`) };
      return {
        status: 200,
        ok: true,
        headers: { get: () => null },
        json: async () => ({ ok: job.status !== 'failed', ...job }),
      } as unknown as Response;
    }
    throw new Error(`unexpected fetch: ${u}`);
  }) as unknown as typeof fetch;
  return sent;
}

// Drive the full async flow: submit, then poll once for the terminal result.
async function translateRealMode(src: string, lang = 'es') {
  const submit = await requestTranslation('seg-1', src, 'fr', lang, 'standard');
  if (submit.status !== 'processing') return submit; // failed/completed synchronously
  return (await getTranslationStatus(submit.jobId))!;
}

describe('break tag preservation (marianmt, async job/poll)', () => {
  beforeEach(() => {
    __resetTranslationStubs();
  });

  it('keeps <break/> tags out of the translation request', async () => {
    const sent = mockMicroservice();
    const src = 'Bonjour à tous.\n\n<break time="4s"/>\n\nBienvenue à Grasse.';
    await translateRealMode(src);
    expect(sent.texts.join(' ')).not.toContain('<break');
    expect(sent.texts.some((s) => s.includes('Bonjour'))).toBe(true);
    expect(sent.texts.some((s) => s.includes('Bienvenue'))).toBe(true);
  });

  it('submit returns processing + a job id, poll returns completed', async () => {
    mockMicroservice();
    const submit = await requestTranslation('seg-1', 'Bonjour le monde.', 'fr', 'es', 'standard');
    expect(submit.status).toBe('processing');
    expect(submit.jobId).toBe('job-1');
    const final = (await getTranslationStatus(submit.jobId))!;
    expect(final.status).toBe('completed');
  });

  it('re-inserts the break tag in the translated output', async () => {
    mockMicroservice();
    const src = 'Bonjour à tous.\n\n<break time="4s"/>\n\nBienvenue à Grasse.';
    const result = await translateRealMode(src);
    expect(result.status).toBe('completed');
    expect(result.translatedText).toContain('<break time="4s"/>');
    expect(result.translatedText).toContain('[es]Bonjour à tous.');
    expect(result.translatedText).toContain('[es]Bienvenue à Grasse.');
  });

  it('preserves multiple break tags in order', async () => {
    mockMicroservice();
    const src = 'A.\n\n<break time="2s"/>\n\nB.\n\n<break time="5s"/>\n\nC.';
    const result = await translateRealMode(src);
    const text = result.translatedText ?? '';
    expect((text.match(/<break/g) ?? []).length).toBe(2);
    expect(text.indexOf('2s')).toBeLessThan(text.indexOf('5s'));
  });

  it('handles text with no break tags normally', async () => {
    mockMicroservice();
    const result = await translateRealMode('Bonjour le monde.');
    expect(result.status).toBe('completed');
    expect(result.translatedText).toContain('[es]');
    expect(result.translatedText).not.toContain('<break');
  });

  it('surfaces 429 backpressure as a retryable failure (2609)', async () => {
    // submitStatus 429 + no Retry-After → submitMicroserviceJob exhausts its
    // (real-timer) backoff; keep attempts fast by using fake timers.
    jest.useFakeTimers();
    mockMicroservice({ submitStatus: 429 });
    const promise = requestTranslation('seg-1', 'Bonjour le monde.', 'fr', 'es', 'standard');
    await jest.runAllTimersAsync();
    const result = await promise;
    jest.useRealTimers();
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe(2609);
  });

  it('maps a failed microservice job to a failed result', async () => {
    mockMicroservice({ job: { status: 'failed', error: 'Paire non supportee' } });
    const result = await translateRealMode('Bonjour le monde.');
    expect(result.status).toBe('failed');
  });
});
