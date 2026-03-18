import { create } from 'zustand';
import { logger } from '@/lib/logger';
import type { RecorderState, AudioDevice, RecordingResult } from '@/lib/studio/media-recorder-service';

const SERVICE_NAME = 'RecordingStore';

export interface Take {
  id: string;
  sceneId: string;
  blob: Blob;
  mimeType: string;
  durationMs: number;
  createdAt: number;
}

interface RecordingStoreState {
  recorderState: RecorderState;
  devices: AudioDevice[];
  selectedDeviceId: string | null;
  activeSceneId: string | null;
  takes: Record<string, Take[]>; // sceneId → takes
  selectedTakeId: Record<string, string | null>; // sceneId → selected take id

  // Actions
  setRecorderState: (state: RecorderState) => void;
  setDevices: (devices: AudioDevice[]) => void;
  selectDevice: (deviceId: string) => void;
  setActiveScene: (sceneId: string) => void;
  addTake: (sceneId: string, result: RecordingResult) => void;
  selectTake: (sceneId: string, takeId: string) => void;
  deleteTake: (sceneId: string, takeId: string) => void;
  getSceneTakes: (sceneId: string) => Take[];
  getSelectedTake: (sceneId: string) => Take | null;
  resetStore: () => void;
}

export const useRecordingStore = create<RecordingStoreState>((set, get) => ({
  recorderState: 'idle',
  devices: [],
  selectedDeviceId: null,
  activeSceneId: null,
  takes: {},
  selectedTakeId: {},

  setRecorderState: (recorderState) => set({ recorderState }),

  setDevices: (devices) => set({ devices }),

  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

  setActiveScene: (sceneId) => set({ activeSceneId: sceneId }),

  addTake: (sceneId, result) => {
    const takeId = `take-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const take: Take = {
      id: takeId,
      sceneId,
      blob: result.blob,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      createdAt: Date.now(),
    };

    set((state) => {
      const sceneTakes = [...(state.takes[sceneId] ?? []), take];
      const newSelectedTakeId = { ...state.selectedTakeId };
      // Auto-select first take if none selected
      if (!newSelectedTakeId[sceneId]) {
        newSelectedTakeId[sceneId] = takeId;
      }
      return {
        takes: { ...state.takes, [sceneId]: sceneTakes },
        selectedTakeId: newSelectedTakeId,
      };
    });

    logger.info(SERVICE_NAME, 'Take added', { sceneId, takeId, durationMs: result.durationMs });
  },

  selectTake: (sceneId, takeId) => {
    set((state) => ({
      selectedTakeId: { ...state.selectedTakeId, [sceneId]: takeId },
    }));
    logger.info(SERVICE_NAME, 'Take selected', { sceneId, takeId });
  },

  deleteTake: (sceneId, takeId) => {
    set((state) => {
      const sceneTakes = (state.takes[sceneId] ?? []).filter((t) => t.id !== takeId);
      const newSelectedTakeId = { ...state.selectedTakeId };
      if (newSelectedTakeId[sceneId] === takeId) {
        newSelectedTakeId[sceneId] = sceneTakes[0]?.id ?? null;
      }
      return {
        takes: { ...state.takes, [sceneId]: sceneTakes },
        selectedTakeId: newSelectedTakeId,
      };
    });
    logger.info(SERVICE_NAME, 'Take deleted', { sceneId, takeId });
  },

  getSceneTakes: (sceneId) => get().takes[sceneId] ?? [],

  getSelectedTake: (sceneId) => {
    const selectedId = get().selectedTakeId[sceneId];
    if (!selectedId) return null;
    return (get().takes[sceneId] ?? []).find((t) => t.id === selectedId) ?? null;
  },

  resetStore: () => set({
    recorderState: 'idle',
    devices: [],
    selectedDeviceId: null,
    activeSceneId: null,
    takes: {},
    selectedTakeId: {},
  }),
}));

// Selectors
export const selectRecorderState = (s: RecordingStoreState) => s.recorderState;
export const selectDevices = (s: RecordingStoreState) => s.devices;
export const selectSelectedDeviceId = (s: RecordingStoreState) => s.selectedDeviceId;
export const selectActiveSceneId = (s: RecordingStoreState) => s.activeSceneId;
