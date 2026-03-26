import type { TranscriptionStatus } from '@/types/studio';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'TranscriptionAPI';

// --- Types ---

export interface TranscriptionQuota {
  usedMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
  isWarning: boolean;    // >100 min used
  isExceeded: boolean;   // >=120 min used
}

export interface TranscriptionStatusResult {
  sceneId: string;
  status: TranscriptionStatus;
  transcriptText: string | null;
  jobId: string | null;
}

export type TriggerResult =
  | { ok: true; jobId: string; estimatedMinutes: number }
  | { ok: false; error: string; code?: number };

// --- Stub state (in-memory simulation) ---

const stubJobs = new Map<string, {
  sceneId: string;
  startedAt: number;
  durationMs: number;   // simulated transcription time
  willFail: boolean;
  text: string;
}>();

let stubQuotaUsed = 35.5; // minutes already used this month

const STUB_TRANSCRIPTS: Record<string, string> = {
  'scene-1': 'Bienvenue sur la Place aux Aires, ancien marché aux herbes de Grasse. Ici, les parfumeurs venaient s\'approvisionner en fleurs fraîches dès l\'aube...',
  'scene-2': 'Nous voici devant la Parfumerie Fragonard, fondée en 1926. Cette maison incarne l\'excellence grassoise dans l\'art du parfum...',
  'scene-3': 'Le Musée International de la Parfumerie retrace 5000 ans d\'histoire du parfum, depuis l\'Égypte ancienne...',
  'scene-4': 'Cette ruelle étroite nous mène vers le cœur historique de Grasse. Remarquez les façades colorées typiques de la Provence...',
  'scene-5': 'Le Jardin du MIP offre une collection unique de plantes à parfum cultivées en terrasses...',
  'scene-6': 'Depuis ce point de vue panoramique, vous pouvez admirer toute la baie de Cannes et les îles de Lérins...',
};

// --- Stub API ---

function stubTrigger(sceneId: string, audioDurationMin: number): TriggerResult {
  if (stubQuotaUsed >= 120) {
    return { ok: false, error: 'Quota de transcription atteint pour ce mois', code: 2307 };
  }

  // 10% chance of failure for demo
  const willFail = sceneId.includes('vv-3');
  const jobId = `job-${Date.now()}-${sceneId}`;

  stubJobs.set(jobId, {
    sceneId,
    startedAt: Date.now(),
    durationMs: 8000, // 8 seconds simulated
    willFail,
    text: STUB_TRANSCRIPTS[sceneId] ?? `Texte transcrit automatiquement pour la scène ${sceneId}.`,
  });

  stubQuotaUsed += audioDurationMin;
  logger.info(SERVICE_NAME, 'Stub transcription triggered', { jobId, sceneId, audioDurationMin });
  return { ok: true, jobId, estimatedMinutes: Math.ceil(audioDurationMin * 0.3) };
}

function stubCheckStatus(jobId: string): TranscriptionStatusResult | null {
  const job = stubJobs.get(jobId);
  if (!job) return null;

  const elapsed = Date.now() - job.startedAt;

  if (elapsed < job.durationMs) {
    return { sceneId: job.sceneId, status: 'processing', transcriptText: null, jobId };
  }

  if (job.willFail) {
    return { sceneId: job.sceneId, status: 'failed', transcriptText: null, jobId };
  }

  return { sceneId: job.sceneId, status: 'completed', transcriptText: job.text, jobId };
}

function stubGetQuota(): TranscriptionQuota {
  const remaining = Math.max(0, 120 - stubQuotaUsed);
  return {
    usedMinutes: Math.round(stubQuotaUsed * 10) / 10,
    limitMinutes: 120,
    remainingMinutes: Math.round(remaining * 10) / 10,
    isWarning: stubQuotaUsed > 100,
    isExceeded: stubQuotaUsed >= 120,
  };
}

// --- Public API ---

export async function triggerTranscription(
  sceneId: string,
  audioDurationMin: number,
): Promise<TriggerResult> {
  if (shouldUseStubs()) {
    // Simulate small network delay
    await new Promise((r) => setTimeout(r, 500));
    return stubTrigger(sceneId, audioDurationMin);
  }

  // Real mode: call AppSync custom mutation
  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).mutations.triggerTranscription(
      { sceneId, audioKey: `guide-studio/${sceneId}/audio/scene_0.aac`, languageCode: 'fr-FR' },
      { authMode: 'userPool' },
    );
    const data = result?.data;
    if (data?.ok) {
      return { ok: true, jobId: data.jobId!, estimatedMinutes: data.estimatedMinutes ?? 2 };
    }
    return { ok: false, error: data?.error ?? 'Erreur inconnue', code: data?.code ?? undefined };
  } catch (err) {
    logger.error(SERVICE_NAME, 'triggerTranscription real API failed', { error: String(err) });
    return { ok: false, error: 'Erreur réseau lors de la transcription.' };
  }
}

export async function getTranscriptionStatus(
  jobId: string,
): Promise<TranscriptionStatusResult | null> {
  if (shouldUseStubs()) {
    return stubCheckStatus(jobId);
  }

  // Real mode: call AppSync custom query
  try {
    const { getClient } = await import('@/lib/api/appsync-client');
    const client = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client as any).queries.checkTranscription(
      { jobId, sceneId: '' },
      { authMode: 'userPool' },
    );
    const data = result?.data;
    if (!data) return null;
    return {
      sceneId: data.sceneId,
      status: data.status as TranscriptionStatus,
      transcriptText: data.transcriptText ?? null,
      jobId: data.jobId,
    };
  } catch (err) {
    logger.error(SERVICE_NAME, 'checkTranscription real API failed', { error: String(err) });
    return null;
  }
}

export async function getTranscriptionQuota(
  guideId: string,
): Promise<TranscriptionQuota> {
  if (shouldUseStubs()) {
    logger.info(SERVICE_NAME, 'Getting quota (stub)', { guideId });
    return stubGetQuota();
  }
  logger.warn(SERVICE_NAME, 'Real API not yet implemented');
  return { usedMinutes: 0, limitMinutes: 120, remainingMinutes: 120, isWarning: false, isExceeded: false };
}

/** Test-only: reset stub state */
export function __resetTranscriptionStubs(): void {
  stubJobs.clear();
  stubQuotaUsed = 35.5;
}
