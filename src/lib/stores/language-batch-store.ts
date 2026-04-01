import { create } from 'zustand';
import { logger } from '@/lib/logger';
import type { BatchProgressStep } from '@/lib/multilang/batch-translation-service';

const SERVICE_NAME = 'LanguageBatchStore';

// --- Types ---

export interface BatchProgress {
  total: number;
  completed: number;
  currentScene: string | null;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  failedScenes: string[];
}

export interface OverallBatchProgress {
  totalScenes: number;
  completedScenes: number;
  percentage: number;
}

export interface FailedSceneEntry {
  sceneId: string;
  errorCode: number;
  message: string;
}

interface LanguageBatchStoreState {
  progress: Record<string, BatchProgress>;
  failedSceneDetails: Record<string, FailedSceneEntry[]>; // key: lang
  retryingScenes: Record<string, string[]>; // key: lang, value: sceneIds currently retrying

  // Actions
  initBatch: (lang: string, total: number) => void;
  updateProgress: (lang: string, sceneId: string) => void;
  markCompleted: (lang: string) => void;
  markFailed: (lang: string, sceneId: string) => void;
  markFailedWithDetails: (lang: string, sceneId: string, errorCode: number, message: string) => void;
  removeFromFailed: (lang: string, sceneId: string) => void;
  setRetrying: (lang: string, sceneId: string, retrying: boolean) => void;
  resetBatch: () => void;
}

// --- Store ---

export const useLanguageBatchStore = create<LanguageBatchStoreState>((set, get) => ({
  progress: {},
  failedSceneDetails: {},
  retryingScenes: {},

  initBatch: (lang, total) => {
    logger.info(SERVICE_NAME, 'Init batch', { lang, total });
    set((state) => ({
      progress: {
        ...state.progress,
        [lang]: {
          total,
          completed: 0,
          currentScene: null,
          status: 'idle',
          failedScenes: [],
        },
      },
    }));
  },

  updateProgress: (lang, sceneId) => {
    set((state) => {
      const existing = state.progress[lang];
      if (!existing) return state;
      return {
        progress: {
          ...state.progress,
          [lang]: {
            ...existing,
            completed: existing.completed + 1,
            currentScene: sceneId,
            status: 'running',
          },
        },
      };
    });
  },

  markCompleted: (lang) => {
    logger.info(SERVICE_NAME, 'Batch completed for lang', { lang });
    set((state) => {
      const existing = state.progress[lang];
      if (!existing) return state;
      return {
        progress: {
          ...state.progress,
          [lang]: {
            ...existing,
            currentScene: null,
            status: 'completed',
          },
        },
      };
    });
  },

  markFailed: (lang, sceneId) => {
    logger.warn(SERVICE_NAME, 'Scene failed', { lang, sceneId });
    set((state) => {
      const existing = state.progress[lang];
      if (!existing) return state;
      return {
        progress: {
          ...state.progress,
          [lang]: {
            ...existing,
            status: 'failed',
            failedScenes: [...existing.failedScenes, sceneId],
          },
        },
      };
    });
  },

  markFailedWithDetails: (lang, sceneId, errorCode, message) => {
    logger.warn(SERVICE_NAME, 'Scene failed with details', { lang, sceneId, errorCode });
    set((state) => {
      const existing = state.progress[lang];
      if (!existing) return state;
      const existingDetails = state.failedSceneDetails[lang] ?? [];
      // Replace existing entry for same sceneId if retry fails again
      const filtered = existingDetails.filter((e) => e.sceneId !== sceneId);
      return {
        progress: {
          ...state.progress,
          [lang]: {
            ...existing,
            status: 'failed',
            failedScenes: existing.failedScenes.includes(sceneId)
              ? existing.failedScenes
              : [...existing.failedScenes, sceneId],
          },
        },
        failedSceneDetails: {
          ...state.failedSceneDetails,
          [lang]: [...filtered, { sceneId, errorCode, message }],
        },
      };
    });
  },

  removeFromFailed: (lang, sceneId) => {
    logger.info(SERVICE_NAME, 'Scene removed from failed', { lang, sceneId });
    set((state) => {
      const existing = state.progress[lang];
      if (!existing) return state;
      const newFailed = existing.failedScenes.filter((id) => id !== sceneId);
      const existingDetails = state.failedSceneDetails[lang] ?? [];
      const newCompleted = existing.completed + 1;
      const newStatus = newFailed.length === 0 && newCompleted >= existing.total
        ? 'completed' as const
        : existing.status;
      return {
        progress: {
          ...state.progress,
          [lang]: {
            ...existing,
            completed: newCompleted,
            failedScenes: newFailed,
            status: newStatus,
          },
        },
        failedSceneDetails: {
          ...state.failedSceneDetails,
          [lang]: existingDetails.filter((e) => e.sceneId !== sceneId),
        },
      };
    });
  },

  setRetrying: (lang, sceneId, retrying) => {
    set((state) => {
      const existing = state.retryingScenes[lang] ?? [];
      const updated = retrying
        ? [...existing, sceneId]
        : existing.filter((id) => id !== sceneId);
      return {
        retryingScenes: {
          ...state.retryingScenes,
          [lang]: updated,
        },
      };
    });
  },

  resetBatch: () => {
    logger.info(SERVICE_NAME, 'Batch reset');
    set({ progress: {}, failedSceneDetails: {}, retryingScenes: {} });
  },
}));

// --- Selectors (cached for Zustand v5) ---

const progressCache = new Map<string, (s: LanguageBatchStoreState) => BatchProgress | null>();
export function selectBatchProgress(lang: string) {
  let selector = progressCache.get(lang);
  if (!selector) {
    selector = (s: LanguageBatchStoreState) => s.progress[lang] ?? null;
    progressCache.set(lang, selector);
  }
  return selector;
}

const statusCache = new Map<string, (s: LanguageBatchStoreState) => BatchProgress['status'] | null>();
export function selectBatchStatus(lang: string) {
  let selector = statusCache.get(lang);
  if (!selector) {
    selector = (s: LanguageBatchStoreState) => s.progress[lang]?.status ?? null;
    statusCache.set(lang, selector);
  }
  return selector;
}

const failedCache = new Map<string, (s: LanguageBatchStoreState) => string[]>();
export function selectFailedScenes(lang: string) {
  let selector = failedCache.get(lang);
  if (!selector) {
    selector = (s: LanguageBatchStoreState) => s.progress[lang]?.failedScenes ?? [];
    failedCache.set(lang, selector);
  }
  return selector;
}

const failedDetailsCache = new Map<string, (s: LanguageBatchStoreState) => FailedSceneEntry[]>();
export function selectFailedSceneDetails(lang: string) {
  let selector = failedDetailsCache.get(lang);
  if (!selector) {
    selector = (s: LanguageBatchStoreState) => s.failedSceneDetails[lang] ?? [];
    failedDetailsCache.set(lang, selector);
  }
  return selector;
}

const retryingCache = new Map<string, (s: LanguageBatchStoreState) => string[]>();
export function selectRetryingScenes(lang: string) {
  let selector = retryingCache.get(lang);
  if (!selector) {
    selector = (s: LanguageBatchStoreState) => s.retryingScenes[lang] ?? [];
    retryingCache.set(lang, selector);
  }
  return selector;
}

/** Non-reactive helper — use getOverallBatchProgress() for non-component code or individual selectors in components */
export function getOverallBatchProgress(state: LanguageBatchStoreState): OverallBatchProgress {
  const entries = Object.values(state.progress);
  if (entries.length === 0) {
    return { totalScenes: 0, completedScenes: 0, percentage: 0 };
  }
  const totalScenes = entries.reduce((sum, p) => sum + p.total, 0);
  const completedScenes = entries.reduce((sum, p) => sum + p.completed, 0);
  const percentage = totalScenes > 0 ? Math.round((completedScenes / totalScenes) * 100) : 0;
  return { totalScenes, completedScenes, percentage };
}

// Individual primitive selectors safe for Zustand v5 (no new object per call)
export const selectOverallPercentage = (s: LanguageBatchStoreState): number => {
  const entries = Object.values(s.progress);
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, p) => sum + p.total, 0);
  const completed = entries.reduce((sum, p) => sum + p.completed, 0);
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

export const selectOverallCompleted = (s: LanguageBatchStoreState): number => {
  return Object.values(s.progress).reduce((sum, p) => sum + p.completed, 0);
};

export const selectOverallTotal = (s: LanguageBatchStoreState): number => {
  return Object.values(s.progress).reduce((sum, p) => sum + p.total, 0);
};

/** @deprecated Use getOverallBatchProgress for non-component code. In components use selectOverallPercentage/selectOverallCompleted/selectOverallTotal */
export const selectOverallBatchProgress = getOverallBatchProgress;

export const selectIsBatchRunning = (s: LanguageBatchStoreState): boolean => {
  return Object.values(s.progress).some(
    (p) => p.status === 'running' || p.status === 'idle',
  );
};

export const selectBatchCurrentScene = (s: LanguageBatchStoreState): string | null => {
  for (const entry of Object.values(s.progress)) {
    if (entry.status === 'running' && entry.currentScene) {
      return entry.currentScene;
    }
  }
  return null;
};

export const selectBatchLangCount = (s: LanguageBatchStoreState): number => {
  return Object.keys(s.progress).length;
};

export const selectBatchCompletedLangs = (s: LanguageBatchStoreState): number => {
  return Object.values(s.progress).filter((p) => p.status === 'completed').length;
};

export const selectAllBatchCompleted = (s: LanguageBatchStoreState): boolean => {
  const entries = Object.values(s.progress);
  return entries.length > 0 && entries.every((p) => p.status === 'completed');
};

// --- Estimation ---

export function estimateBatchDuration(sceneCount: number, langCount: number): number {
  return sceneCount * langCount * 5; // seconds — NFR ML-NFR1
}

// --- onProgress callback wired to store (used by BatchTranslationService) ---

/**
 * Creates an onProgress callback for BatchTranslationService.executeBatch()
 * that automatically updates the language-batch-store.
 *
 * Call initBatch() for each lang before starting the batch, then pass this
 * callback as onProgress.
 */
export function createBatchProgressCallback(): (
  lang: string,
  sceneId: string,
  step: BatchProgressStep,
) => void {
  return (lang: string, sceneId: string, step: BatchProgressStep) => {
    const store = useLanguageBatchStore.getState();
    if (step === 'failed') {
      store.markFailed(lang, sceneId);
    } else if (step === 'tts_completed') {
      store.updateProgress(lang, sceneId);
    }
    // 'translated' is an intermediate step — we count completion at tts_completed
  };
}
