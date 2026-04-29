/**
 * TourGuide Design System — Sound tokens (Story 1.6)
 *
 * Identité sonore Player : "papier qui se tourne" — calme, lente, cultivée.
 *
 * ⚠️ AVERTISSEMENT IMPORTANT — ASSETS NON LIVRÉS DANS CE PACKAGE ⚠️
 *
 * Les `path` exposés ci-dessous sont des **références placeholder**. Les
 * fichiers audio (.aac / .mp3) correspondants ne sont PAS distribués avec
 * ce package : ils seront produits par l'équipe sound design en Story 6.3.
 *
 * Le runtime (Web ou React Native) ne doit PAS tenter de charger ces fichiers
 * tant qu'ils n'existent pas (sous peine d'erreur 404 / ENOENT). Les
 * consommateurs doivent vérifier l'existence de l'asset avant instanciation
 * (`new Audio(path)`, `react-native-sound`, etc.).
 *
 * La charte sonore complète est dans `sound-charter.md`.
 *
 * Source : `_bmad-output/stories/1-6-motion-sound-tokens.md` AC 2.
 */

/**
 * Une entrée sonore : référence + métadonnées de lecture.
 *
 * - `path` : chemin relatif vers l'asset (placeholder en attendant Story 6.3).
 * - `duration` : durée approximative de l'asset en ms (50-300 ms typiquement).
 * - `volume` : volume de lecture entre 0 et 1, modeste (0.3-0.5 max).
 */
export interface SoundAsset {
  path: string;
  duration: number;
  volume: number;
}

export type TgSoundEntry = SoundAsset;

/**
 * Tokens sonores Player — 3 transitions narratives.
 *
 * - `transition.scene` : passage entre POI (220 ms, vol 0.4).
 * - `transition.start` : démarrage tour (180 ms, vol 0.5).
 * - `transition.end`   : fin tour (280 ms, vol 0.4).
 */
export const tgSound = {
  transition: {
    scene: { path: 'sounds/scene.aac', duration: 220, volume: 0.4 } as SoundAsset,
    start: { path: 'sounds/start.aac', duration: 180, volume: 0.5 } as SoundAsset,
    end:   { path: 'sounds/end.aac',   duration: 280, volume: 0.4 } as SoundAsset,
  },
} as const;

export type TgSound = typeof tgSound;
export type TgSoundKey = keyof typeof tgSound.transition;
