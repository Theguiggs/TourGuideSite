/** Catalog of ambient sounds available for scene background audio. */

export type AmbianceCategory = 'water' | 'city' | 'nature' | 'music' | 'indoor';

export interface AmbianceSound {
  id: string;
  label: string;
  icon: string;
  category: AmbianceCategory;
  file: string; // path relative to /sounds/ambiance/
  durationSec: number;
}

export interface SceneAudioMix {
  speechGain: number;      // 0-100, default 80
  ambiance: {
    soundId: string;
    gain: number;          // 0-100, default 30
  } | null;
}

export const DEFAULT_MIX: SceneAudioMix = {
  speechGain: 80,
  ambiance: null,
};

export const AMBIANCE_CATEGORIES: { key: AmbianceCategory; label: string; icon: string }[] = [
  { key: 'water', label: 'Eau', icon: '💧' },
  { key: 'city', label: 'Ville', icon: '🏙️' },
  { key: 'nature', label: 'Nature', icon: '🌿' },
  { key: 'music', label: 'Musique', icon: '🎵' },
  { key: 'indoor', label: 'Interieur', icon: '🏛️' },
];

export const AMBIANCE_SOUNDS: AmbianceSound[] = [
  // Water
  { id: 'fountain', label: 'Fontaine', icon: '⛲', category: 'water', file: 'fountain.mp3', durationSec: 10 },
  { id: 'river', label: 'Riviere', icon: '🏞️', category: 'water', file: 'river.mp3', durationSec: 10 },
  { id: 'waves', label: 'Vagues', icon: '🌊', category: 'water', file: 'waves.mp3', durationSec: 10 },
  { id: 'rain', label: 'Pluie legere', icon: '🌧️', category: 'water', file: 'rain.mp3', durationSec: 10 },

  // City
  { id: 'footsteps', label: 'Pas sur paves', icon: '👣', category: 'city', file: 'footsteps.mp3', durationSec: 10 },
  { id: 'cafe', label: 'Cafe terrasse', icon: '☕', category: 'city', file: 'cafe.mp3', durationSec: 10 },
  { id: 'market', label: 'Marche', icon: '🛒', category: 'city', file: 'market.mp3', durationSec: 10 },
  { id: 'church-bells', label: 'Cloches eglise', icon: '🔔', category: 'city', file: 'church-bells.mp3', durationSec: 10 },

  // Nature
  { id: 'birds', label: 'Oiseaux', icon: '🐦', category: 'nature', file: 'birds.mp3', durationSec: 10 },
  { id: 'wind', label: 'Vent', icon: '💨', category: 'nature', file: 'wind.mp3', durationSec: 10 },
  { id: 'cicadas', label: 'Cigales', icon: '🦗', category: 'nature', file: 'cicadas.mp3', durationSec: 10 },
  { id: 'forest', label: 'Foret', icon: '🌲', category: 'nature', file: 'forest.mp3', durationSec: 10 },

  // Music
  { id: 'guitar', label: 'Guitare acoustique', icon: '🎸', category: 'music', file: 'guitar.mp3', durationSec: 10 },
  { id: 'classical', label: 'Classique', icon: '🎻', category: 'music', file: 'classical.mp3', durationSec: 10 },

  // Indoor
  { id: 'museum', label: 'Musee (silence)', icon: '🖼️', category: 'indoor', file: 'museum.mp3', durationSec: 10 },
  { id: 'cathedral', label: 'Cathedrale', icon: '⛪', category: 'indoor', file: 'cathedral.mp3', durationSec: 10 },
];

export function getAmbianceById(id: string): AmbianceSound | undefined {
  return AMBIANCE_SOUNDS.find((s) => s.id === id);
}

export function getAmbiancesByCategory(category: AmbianceCategory): AmbianceSound[] {
  return AMBIANCE_SOUNDS.filter((s) => s.category === category);
}

export function getAmbianceUrl(sound: AmbianceSound): string {
  return `/sounds/ambiance/${sound.file}`;
}
