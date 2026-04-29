/**
 * Store for the guide's personal ambiance sound bank.
 * Persists metadata in localStorage (MVP). Audio files live on S3.
 *
 * Phase 2 will add cross-device sync via a `GuideAmbianceSound` AppSync model.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AmbianceCategory } from '@/lib/studio/ambiance-catalog';

export interface CustomAmbianceSound {
  id: string;
  guideId: string;
  title: string;
  description?: string;     // optional free text (e.g. "Enregistre place aux Aires, marche du samedi")
  category: AmbianceCategory;
  s3Key: string;           // path on S3 (guide-studio/{identityId}/ambiance/{id}.{ext})
  durationSec: number;
  createdAt: string;        // ISO 8601
  icon?: string;            // optional emoji chosen by guide
}

interface GuideAmbianceState {
  sounds: CustomAmbianceSound[];
  addSound: (sound: CustomAmbianceSound) => void;
  removeSound: (id: string) => void;
  renameSound: (id: string, title: string) => void;
  updateSound: (id: string, updates: Partial<Pick<CustomAmbianceSound, 'title' | 'description' | 'category' | 'icon'>>) => void;
  getSoundById: (id: string) => CustomAmbianceSound | undefined;
  getSoundsByGuide: (guideId: string) => CustomAmbianceSound[];
  getSoundsByCategory: (guideId: string, category: AmbianceCategory | 'all') => CustomAmbianceSound[];
}

export const useGuideAmbianceStore = create<GuideAmbianceState>()(
  persist(
    (set, get) => ({
      sounds: [],
      addSound: (sound) => set((state) => ({ sounds: [...state.sounds, sound] })),
      removeSound: (id) => set((state) => ({ sounds: state.sounds.filter((s) => s.id !== id) })),
      renameSound: (id, title) => set((state) => ({
        sounds: state.sounds.map((s) => s.id === id ? { ...s, title } : s),
      })),
      updateSound: (id, updates) => set((state) => ({
        sounds: state.sounds.map((s) => s.id === id ? { ...s, ...updates } : s),
      })),
      getSoundById: (id) => get().sounds.find((s) => s.id === id),
      getSoundsByGuide: (guideId) => get().sounds.filter((s) => s.guideId === guideId),
      getSoundsByCategory: (guideId, category) => {
        const mine = get().sounds.filter((s) => s.guideId === guideId);
        return category === 'all' ? mine : mine.filter((s) => s.category === category);
      },
    }),
    {
      name: 'guide-ambiance-bank',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Selectors
export const selectAllSounds = (s: GuideAmbianceState) => s.sounds;
export const selectAddSound = (s: GuideAmbianceState) => s.addSound;
export const selectRemoveSound = (s: GuideAmbianceState) => s.removeSound;
export const selectRenameSound = (s: GuideAmbianceState) => s.renameSound;
