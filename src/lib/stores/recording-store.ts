import { create } from 'zustand';
import { logger } from '@/lib/logger';
import type { RecorderState, AudioDevice, RecordingResult } from '@/lib/studio/media-recorder-service';

const SERVICE_NAME = 'RecordingStore';

/**
 * Où en est une prise vis-à-vis du backend.
 *
 * `pending` est l'état d'une prise qui n'existe QUE dans cet onglet : son Blob
 * vit en mémoire et rien ne l'a encore portée vers S3 ni vers la Scène. C'est
 * l'état dans lequel toutes les prises restaient avant le câblage de la
 * persistance — un rechargement, une navigation ou une fermeture d'onglet les
 * effaçait sans un mot.
 */
export type TakeSyncState = 'pending' | 'uploading' | 'synced' | 'error';

export interface Take {
  id: string;
  sceneId: string;
  blob: Blob;
  mimeType: string;
  durationMs: number;
  createdAt: number;
  /** Progression vers le backend. Voir {@link TakeSyncState}. */
  syncState: TakeSyncState;
  /** Clé S3 de l'objet téléversé — renseignée seulement en `synced`. */
  s3Key?: string;
  /** Message d'échec présentable au guide — renseigné seulement en `error`. */
  error?: string;
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
  addTake: (sceneId: string, result: RecordingResult) => string;
  selectTake: (sceneId: string, takeId: string) => void;
  deleteTake: (sceneId: string, takeId: string) => void;
  markTakeSync: (sceneId: string, takeId: string, patch: TakeSyncPatch) => void;
  getSceneTakes: (sceneId: string) => Take[];
  getSelectedTake: (sceneId: string) => Take | null;
  hasUnsyncedTakes: () => boolean;
  resetStore: () => void;
}

/** Mise à jour partielle de l'état de synchronisation d'une prise. */
export interface TakeSyncPatch {
  syncState: TakeSyncState;
  s3Key?: string;
  error?: string;
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
      syncState: 'pending',
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
    // L'identifiant est RENDU : l'appelant (enregistreur, import de fichier) en a
    // besoin pour suivre la prise qu'il vient de créer jusqu'à sa persistance.
    return takeId;
  },

  markTakeSync: (sceneId, takeId, patch) => {
    set((state) => {
      const sceneTakes = state.takes[sceneId];
      if (!sceneTakes) return state;
      const index = sceneTakes.findIndex((t) => t.id === takeId);
      if (index === -1) return state;
      const next = [...sceneTakes];
      // `s3Key` et `error` sont RÉÉCRITS à chaque transition, jamais fusionnés :
      // une prise repassée en `uploading` après un échec ne doit pas conserver
      // le message d'erreur précédent, et une prise repassée en `error` ne doit
      // pas conserver une clé S3 d'une tentative antérieure.
      next[index] = {
        ...next[index],
        syncState: patch.syncState,
        s3Key: patch.s3Key,
        error: patch.error,
      };
      return { takes: { ...state.takes, [sceneId]: next } };
    });
    logger.info(SERVICE_NAME, 'Take sync state', { sceneId, takeId, syncState: patch.syncState });
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

  /**
   * Reste-t-il du travail qui n'existe que dans cet onglet ? C'est la question
   * que doivent poser le garde `beforeunload` et le démontage de la page avant
   * de vider le store : `pending`, `uploading` et `error` désignent tous une
   * prise dont le Blob est la SEULE copie.
   */
  hasUnsyncedTakes: () =>
    Object.values(get().takes).some((sceneTakes) =>
      sceneTakes.some((take) => take.syncState !== 'synced'),
    ),

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
