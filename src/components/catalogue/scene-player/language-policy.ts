/** LW-3 : ne résoudre que des narrations présentes dans la réponse servie. */
import type { PublicTourScene } from '@/lib/api/published-tour-content';

export interface SceneAudioVariants {
  base?: string;
  translations: Record<string, string>;
}
export type AudioVariants = Readonly<Record<string, SceneAudioVariants>>;
export type LanguageInventory = Readonly<Record<string, { hasBase: boolean; languages: readonly string[] }>>;

/** Conserver les variantes régionales : en-US et en-GB peuvent porter des fichiers distincts. */
export function audioLanguageCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase().replaceAll('_', '-');
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code) ? code : null;
}

export function audioVariants(scenes: readonly PublicTourScene[]): AudioVariants {
  return Object.fromEntries(scenes.map((scene) => [scene.id, {
    base: scene.audioUrl,
    translations: Object.fromEntries(Object.entries(scene.translatedAudioUrls ?? {}).flatMap(([key, url]) => {
      const code = audioLanguageCode(key);
      return code && url ? [[code, url]] : [];
    })),
  }]));
}

export function languageInventory(variants: AudioVariants): LanguageInventory {
  return Object.fromEntries(Object.entries(variants).map(([id, audio]) => [id, {
    hasBase: Boolean(audio.base), languages: Object.keys(audio.translations),
  }]));
}

export function availableAudioLanguages(inventory: LanguageInventory | null, base: string, sceneIds: readonly string[]): string[] {
  const translated = new Set(sceneIds.flatMap((id) => inventory?.[id]?.languages ?? []));
  translated.delete(base);
  return [base, ...[...translated].sort()];
}

export function chooseAudioLanguage(available: readonly string[], base: string, locale: string, preferred?: string | null): string {
  if (preferred && available.includes(preferred)) return preferred;
  return available.find((language) => language === locale)
    ?? available.find((language) => language.split('-')[0] === locale)
    ?? base;
}

export function resolveSceneAudio(variants: AudioVariants, sceneId: string, selected: string, base: string): { url: string; language: string } | null {
  const audio = variants[sceneId];
  if (!audio) return null;
  if (selected === base && audio.base) return { url: audio.base, language: base };
  const translated = audio.translations[selected];
  if (translated) return { url: translated, language: selected };
  return audio.base ? { url: audio.base, language: base } : null;
}

/** Compter uniquement les replis réellement possibles, pas les étapes verrouillées ou muettes. */
export function fallbackSceneCount(inventory: LanguageInventory | null, sceneIds: readonly string[], selected: string, base: string): number {
  if (selected === base) return 0;
  return sceneIds.filter((id) => inventory?.[id]?.hasBase && !inventory[id].languages.includes(selected)).length;
}
