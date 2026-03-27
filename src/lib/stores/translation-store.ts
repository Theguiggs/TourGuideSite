import { create } from 'zustand';
import { logger } from '@/lib/logger';
import {
  getTranslationStatus,
  type TranslationResult,
  type CostEstimate,
} from '@/lib/api/translation';
import type { TranslationProvider, TranslationJobStatus } from '@/types/studio';

const SERVICE_NAME = 'TranslationStore';
const POLL_INTERVAL_MS = 10_000; // 10 seconds (faster than STT)

export interface SegmentTranslationState {
  status: TranslationJobStatus;
  jobId: string | null;
  translatedText: string | null;
  targetLang: string | null;
  provider: TranslationProvider | null;
  costProvider: number | null;
  costCharged: number | null;
  error: string | null;
}

interface TranslationStoreState {
  segments: Record<string, SegmentTranslationState>;
  costEstimates: Record<string, CostEstimate | null>;
  toastMessage: string | null;

  // Actions
  setSegmentStatus: (segmentId: string, update: Partial<SegmentTranslationState>) => void;
  setCostEstimate: (segmentId: string, estimate: CostEstimate | null) => void;
  startPolling: (segmentId: string, jobId: string) => void;
  stopPolling: (segmentId: string) => void;
  stopAllPolling: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  resetStore: () => void;
}

const pollingTimers = new Map<string, ReturnType<typeof setInterval>>();

function defaultSegmentState(): SegmentTranslationState {
  return {
    status: 'pending',
    jobId: null,
    translatedText: null,
    targetLang: null,
    provider: null,
    costProvider: null,
    costCharged: null,
    error: null,
  };
}

export const useTranslationStore = create<TranslationStoreState>((set, get) => ({
  segments: {},
  costEstimates: {},
  toastMessage: null,

  setSegmentStatus: (segmentId, update) => {
    set((state) => ({
      segments: {
        ...state.segments,
        [segmentId]: { ...defaultSegmentState(), ...state.segments[segmentId], ...update },
      },
    }));
  },

  setCostEstimate: (segmentId, estimate) => {
    set((state) => ({
      costEstimates: { ...state.costEstimates, [segmentId]: estimate },
    }));
  },

  startPolling: (segmentId, jobId) => {
    get().stopPolling(segmentId);

    logger.info(SERVICE_NAME, 'Starting translation poll', { segmentId, jobId });

    const timer = setInterval(async () => {
      const result = await getTranslationStatus(jobId);
      if (!result) return;

      if (result.status === 'completed') {
        get().stopPolling(segmentId);
        get().setSegmentStatus(segmentId, {
          status: 'completed',
          translatedText: result.translatedText,
          costProvider: result.costProvider,
          costCharged: result.costCharged,
          error: null,
        });
        get().showToast(`Traduction terminée : ${segmentId}`);
        logger.info(SERVICE_NAME, 'Translation completed', { segmentId, jobId });
      } else if (result.status === 'failed') {
        get().stopPolling(segmentId);
        get().setSegmentStatus(segmentId, {
          status: 'failed',
          error: 'Échec de la traduction. Vous pouvez relancer.',
        });
        logger.warn(SERVICE_NAME, 'Translation failed', { segmentId, jobId });
      }
    }, POLL_INTERVAL_MS);

    pollingTimers.set(segmentId, timer);
  },

  stopPolling: (segmentId) => {
    const timer = pollingTimers.get(segmentId);
    if (timer) {
      clearInterval(timer);
      pollingTimers.delete(segmentId);
      logger.info(SERVICE_NAME, 'Stopped translation poll', { segmentId });
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
    set({ segments: {}, costEstimates: {}, toastMessage: null });
  },
}));

// Selectors — memoized per segmentId to avoid new function ref each render
const segmentTranslationCache = new Map<string, (s: TranslationStoreState) => SegmentTranslationState | null>();
export function selectSegmentTranslation(segmentId: string) {
  let selector = segmentTranslationCache.get(segmentId);
  if (!selector) {
    selector = (s: TranslationStoreState) => s.segments[segmentId] ?? null;
    segmentTranslationCache.set(segmentId, selector);
  }
  return selector;
}

const costEstimateCache = new Map<string, (s: TranslationStoreState) => import('@/lib/api/translation').CostEstimate | null>();
export function selectCostEstimate(segmentId: string) {
  let selector = costEstimateCache.get(segmentId);
  if (!selector) {
    selector = (s: TranslationStoreState) => s.costEstimates[segmentId] ?? null;
    costEstimateCache.set(segmentId, selector);
  }
  return selector;
}

export const selectTranslationToast = (s: TranslationStoreState) => s.toastMessage;
