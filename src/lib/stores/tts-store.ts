import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { getTTSStatus } from '@/lib/api/tts';
import type { TTSJobStatus } from '@/types/studio';

const SERVICE_NAME = 'TTSStore';
const POLL_INTERVAL_MS = 15_000; // 15 seconds
/**
 * Au-delà de ce délai, on cesse d'interroger et on déclare l'échec.
 *
 * Le sondage n'avait AUCUNE borne : un job resté `processing` (microservice
 * redémarré, job perdu après un rechargement de page) faisait battre un
 * `setInterval` indéfiniment, et l'interface restait bloquée sur
 * « Génération en cours » sans jamais rien dire.
 */
const POLL_DEADLINE_MS = 10 * 60_000; // 10 minutes

export interface SegmentTTSState {
  status: TTSJobStatus;
  jobId: string | null;
  audioKey: string | null;
  language: string | null;
  durationMs: number | null;
  error: string | null;
}

interface TTSStoreState {
  segments: Record<string, SegmentTTSState>;
  toastMessage: string | null;

  // Actions
  setSegmentStatus: (segmentId: string, update: Partial<SegmentTTSState>) => void;
  startPolling: (segmentId: string, jobId: string) => void;
  stopPolling: (segmentId: string) => void;
  stopAllPolling: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  resetStore: () => void;
}

const pollingTimers = new Map<string, ReturnType<typeof setInterval>>();

function defaultSegmentState(): SegmentTTSState {
  return {
    status: 'pending',
    jobId: null,
    audioKey: null,
    language: null,
    durationMs: null,
    error: null,
  };
}

export const useTTSStore = create<TTSStoreState>((set, get) => ({
  segments: {},
  toastMessage: null,

  setSegmentStatus: (segmentId, update) => {
    set((state) => ({
      segments: {
        ...state.segments,
        [segmentId]: { ...defaultSegmentState(), ...state.segments[segmentId], ...update },
      },
    }));
  },

  startPolling: (segmentId, jobId) => {
    get().stopPolling(segmentId);

    logger.info(SERVICE_NAME, 'Starting TTS poll', { segmentId, jobId });

    const startedAt = Date.now();

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > POLL_DEADLINE_MS) {
        get().stopPolling(segmentId);
        get().setSegmentStatus(segmentId, {
          status: 'failed',
          error: 'La generation audio n’a pas abouti dans le temps imparti. Vous pouvez relancer.',
        });
        logger.warn(SERVICE_NAME, 'TTS poll deadline reached', { segmentId, jobId });
        return;
      }

      const result = await getTTSStatus(jobId);
      if (!result) return;

      if (result.status === 'completed') {
        get().stopPolling(segmentId);
        get().setSegmentStatus(segmentId, {
          status: 'completed',
          audioKey: result.audioKey,
          language: result.language,
          durationMs: result.durationMs,
          error: null,
        });
        get().showToast('Audio de synthèse généré.');
        logger.info(SERVICE_NAME, 'TTS completed', { segmentId, jobId, audioKey: result.audioKey });
      } else if (result.status === 'failed') {
        get().stopPolling(segmentId);
        get().setSegmentStatus(segmentId, {
          status: 'failed',
          error: 'Échec de la génération audio. Vous pouvez relancer.',
        });
        logger.warn(SERVICE_NAME, 'TTS failed', { segmentId, jobId });
      }
    }, POLL_INTERVAL_MS);

    pollingTimers.set(segmentId, timer);
  },

  stopPolling: (segmentId) => {
    const timer = pollingTimers.get(segmentId);
    if (timer) {
      clearInterval(timer);
      pollingTimers.delete(segmentId);
      logger.info(SERVICE_NAME, 'Stopped TTS poll', { segmentId });
    }
  },

  stopAllPolling: () => {
    pollingTimers.forEach((timer) => clearInterval(timer));
    pollingTimers.clear();
  },

  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => {
      set((state) => state.toastMessage === message ? { toastMessage: null } : state);
    }, 5000);
  },

  clearToast: () => set({ toastMessage: null }),

  resetStore: () => {
    get().stopAllPolling();
    set({ segments: {}, toastMessage: null });
  },
}));

// Selectors — memoized per segmentId
const segmentTTSCache = new Map<string, (s: TTSStoreState) => SegmentTTSState | null>();
export function selectSegmentTTS(segmentId: string) {
  let selector = segmentTTSCache.get(segmentId);
  if (!selector) {
    selector = (s: TTSStoreState) => s.segments[segmentId] ?? null;
    segmentTTSCache.set(segmentId, selector);
  }
  return selector;
}

export const selectTTSToast = (s: TTSStoreState) => s.toastMessage;
