import type { TranslationProvider, TranslationJobStatus } from '@/types/studio';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'TranslationAPI';

// --- Types ---

export interface TranslationResult {
  jobId: string;
  status: TranslationJobStatus;
  translatedText: string | null;
  provider: TranslationProvider;
  costProvider: number | null;   // centimes
  costCharged: number | null;    // centimes
}

export interface CostEstimate {
  provider: TranslationProvider;
  charCount: number;
  costProvider: number;  // centimes
  costCharged: number;   // centimes
  isFree: boolean;
}

export interface MicroserviceHealth {
  tts: boolean;
  translation: boolean;
  silence_detection: boolean;
}

// --- Stub state ---

const stubJobs = new Map<string, {
  segmentId: string;
  text: string;
  targetLang: string;
  provider: TranslationProvider;
  startedAt: number;
  durationMs: number;
}>();

const STUB_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    default: 'Welcome to this wonderful tour through the historic streets of the city...',
  },
  it: {
    default: 'Benvenuti in questo meraviglioso tour attraverso le strade storiche della città...',
  },
  de: {
    default: 'Willkommen zu dieser wunderbaren Tour durch die historischen Straßen der Stadt...',
  },
  es: {
    default: 'Bienvenidos a este maravilloso tour por las calles históricas de la ciudad...',
  },
};

let stubHealthGpuDown = false;

// --- Stub API ---

function stubRequestTranslation(
  segmentId: string,
  text: string,
  _sourceLang: string,
  targetLang: string,
  provider: TranslationProvider,
): TranslationResult {
  const jobId = `trans-${Date.now()}-${segmentId}`;
  stubJobs.set(jobId, {
    segmentId,
    text,
    targetLang,
    provider,
    startedAt: Date.now(),
    durationMs: provider === 'marianmt' ? 3000 : 2000,
  });

  logger.info(SERVICE_NAME, 'Stub translation triggered', { jobId, segmentId, provider, targetLang });
  return {
    jobId,
    status: 'processing',
    translatedText: null,
    provider,
    costProvider: null,
    costCharged: null,
  };
}

function stubGetStatus(jobId: string): TranslationResult | null {
  const job = stubJobs.get(jobId);
  if (!job) return null;

  const elapsed = Date.now() - job.startedAt;

  if (elapsed < job.durationMs) {
    return {
      jobId,
      status: 'processing',
      translatedText: null,
      provider: job.provider,
      costProvider: null,
      costCharged: null,
    };
  }

  const translatedText = STUB_TRANSLATIONS[job.targetLang]?.default
    ?? `[${job.targetLang.toUpperCase()}] ${job.text.substring(0, 100)}...`;

  const cost = job.provider === 'marianmt' ? 0 : Math.ceil(job.text.length * 0.002);
  const margin = job.provider === 'marianmt' ? 1 : 3;

  return {
    jobId,
    status: 'completed',
    translatedText,
    provider: job.provider,
    costProvider: cost,
    costCharged: cost * margin,
  };
}

function stubEstimateCost(
  text: string,
  provider: TranslationProvider,
): CostEstimate {
  const charCount = text.length;

  if (provider === 'marianmt') {
    return { provider, charCount, costProvider: 0, costCharged: 0, isFree: true };
  }

  // DeepL: ~0.002€/char, OpenAI: ~0.003€/char (in centimes)
  const ratePerChar = provider === 'deepl' ? 0.002 : 0.003;
  const costProvider = Math.ceil(charCount * ratePerChar);
  const costCharged = costProvider * 3; // default margin x3

  return { provider, charCount, costProvider, costCharged, isFree: false };
}

// --- Public API ---

export async function requestTranslation(
  segmentId: string,
  text: string,
  sourceLang: string,
  targetLang: string,
  provider: TranslationProvider,
): Promise<TranslationResult> {
  if (shouldUseStubs()) {
    await new Promise((r) => setTimeout(r, 300));
    return stubRequestTranslation(segmentId, text, sourceLang, targetLang, provider);
  }

  // Real mode: route to microservice or Lambda based on provider
  try {
    if (provider === 'marianmt') {
      const response = await fetch(`${getMicroserviceUrl()}/v1/translate/marianmt`, {
        method: 'POST',
        headers: getMicroserviceHeaders(),
        body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang }),
      });
      const data = await response.json();
      if (data.ok) {
        return {
          jobId: `trans-${Date.now()}-${segmentId}`,
          status: 'completed',
          translatedText: data.translated_text,
          provider,
          costProvider: 0,
          costCharged: 0,
        };
      }
      return {
        jobId: '',
        status: 'failed',
        translatedText: null,
        provider,
        costProvider: null,
        costCharged: null,
      };
    }

    // Premium providers: call Lambda
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).mutations.requestTranslation(
      { segmentId, text, sourceLang, targetLang, provider },
      { authMode: 'userPool' },
    );
    const data = result?.data;
    return {
      jobId: data?.jobId ?? '',
      status: data?.status ?? 'failed',
      translatedText: data?.translatedText ?? null,
      provider,
      costProvider: data?.costProvider ?? null,
      costCharged: data?.costCharged ?? null,
    };
  } catch (err) {
    logger.error(SERVICE_NAME, 'requestTranslation failed', { error: String(err) });
    return {
      jobId: '',
      status: 'failed',
      translatedText: null,
      provider,
      costProvider: null,
      costCharged: null,
    };
  }
}

export async function getTranslationStatus(jobId: string): Promise<TranslationResult | null> {
  if (shouldUseStubs()) {
    return stubGetStatus(jobId);
  }

  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).queries.checkTranslation(
      { jobId },
      { authMode: 'userPool' },
    );
    return result?.data ?? null;
  } catch (err) {
    logger.error(SERVICE_NAME, 'getTranslationStatus failed', { error: String(err) });
    return null;
  }
}

export async function estimateCost(
  text: string,
  provider: TranslationProvider,
): Promise<CostEstimate> {
  if (shouldUseStubs()) {
    return stubEstimateCost(text, provider);
  }

  // Real mode: cost calculation can be done client-side for estimates
  return stubEstimateCost(text, provider);
}

export async function checkMicroserviceHealth(): Promise<MicroserviceHealth> {
  if (shouldUseStubs()) {
    return {
      tts: !stubHealthGpuDown,
      translation: !stubHealthGpuDown,
      silence_detection: true,
    };
  }

  try {
    const response = await fetch(`${getMicroserviceUrl()}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return await response.json();
  } catch {
    return { tts: false, translation: false, silence_detection: false };
  }
}

// Re-export from shared config
import { getMicroserviceUrl, getMicroserviceHeaders } from './microservice-config';

/** Test-only: reset stub state */
export function __resetTranslationStubs(): void {
  stubJobs.clear();
  stubHealthGpuDown = false;
}

/** Test-only: simulate GPU down */
export function __setStubGpuDown(down: boolean): void {
  stubHealthGpuDown = down;
}
