import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { getTranscriptionStatus, type TranscriptionQuota } from '@/lib/api/transcription';
import type { TranscriptionStatus } from '@/types/studio';

const SERVICE_NAME = 'TranscriptionStore';
const POLL_INTERVAL_MS = 15_000; // 15 seconds (FR8)

export interface SceneTranscriptionState {
  status: TranscriptionStatus;
  jobId: string | null;
  transcriptText: string | null;
  error: string | null;
}

interface TranscriptionStoreState {
  scenes: Record<string, SceneTranscriptionState>;
  quota: TranscriptionQuota | null;
  toastMessage: string | null;

  // Actions
  setSceneStatus: (sceneId: string, state: Partial<SceneTranscriptionState>) => void;
  startPolling: (sceneId: string, jobId: string) => void;
  stopPolling: (sceneId: string) => void;
  stopAllPolling: () => void;
  setQuota: (quota: TranscriptionQuota) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  resetStore: () => void;
}

// Active polling intervals per scene
const pollingTimers = new Map<string, ReturnType<typeof setInterval>>();

export const useTranscriptionStore = create<TranscriptionStoreState>((set, get) => ({
  scenes: {},
  quota: null,
  toastMessage: null,

  setSceneStatus: (sceneId, update) => {
    set((state) => ({
      scenes: {
        ...state.scenes,
        [sceneId]: { ...defaultSceneState(), ...state.scenes[sceneId], ...update },
      },
    }));
  },

  startPolling: (sceneId, jobId) => {
    // Stop existing polling for this scene
    get().stopPolling(sceneId);

    logger.info(SERVICE_NAME, 'Starting poll', { sceneId, jobId });

    const timer = setInterval(async () => {
      const result = await getTranscriptionStatus(jobId);
      if (!result) return;

      if (result.status === 'completed') {
        get().stopPolling(sceneId);
        get().setSceneStatus(sceneId, {
          status: 'completed',
          transcriptText: result.transcriptText,
          error: null,
        });
        get().showToast(`Transcription terminée : ${sceneId}`);
        logger.info(SERVICE_NAME, 'Transcription completed', { sceneId, jobId });
      } else if (result.status === 'failed') {
        get().stopPolling(sceneId);
        get().setSceneStatus(sceneId, {
          status: 'failed',
          error: 'Échec de la transcription. Vous pouvez relancer.',
        });
        logger.warn(SERVICE_NAME, 'Transcription failed', { sceneId, jobId });
      }
      // If still 'processing', keep polling
    }, POLL_INTERVAL_MS);

    pollingTimers.set(sceneId, timer);
  },

  stopPolling: (sceneId) => {
    const timer = pollingTimers.get(sceneId);
    if (timer) {
      clearInterval(timer);
      pollingTimers.delete(sceneId);
      logger.info(SERVICE_NAME, 'Stopped poll', { sceneId });
    }
  },

  stopAllPolling: () => {
    pollingTimers.forEach((timer) => clearInterval(timer));
    pollingTimers.clear();
  },

  setQuota: (quota) => set({ quota }),

  showToast: (message) => {
    set({ toastMessage: message });
    // Auto-clear after 5s
    setTimeout(() => {
      set((state) => state.toastMessage === message ? { toastMessage: null } : state);
    }, 5000);
  },

  clearToast: () => set({ toastMessage: null }),

  resetStore: () => {
    get().stopAllPolling();
    set({ scenes: {}, quota: null, toastMessage: null });
  },
}));

function defaultSceneState(): SceneTranscriptionState {
  return { status: 'pending', jobId: null, transcriptText: null, error: null };
}

// Selectors
export const selectSceneTranscription = (sceneId: string) =>
  (s: TranscriptionStoreState) => s.scenes[sceneId] ?? null;
export const selectQuota = (s: TranscriptionStoreState) => s.quota;
export const selectToastMessage = (s: TranscriptionStoreState) => s.toastMessage;
export const selectClearToast = (s: TranscriptionStoreState) => s.clearToast;
