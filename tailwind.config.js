/**
 * TourGuideWeb — Tailwind config
 *
 * Tailwind 4 ne lit pas `tailwind.config.js` automatiquement ; ce fichier
 * est référencé via la directive `@config` dans `src/app/globals.css` pour
 * activer le preset legacy `@murmure/design-system/tailwind`.
 *
 * Cf. Story 1.3 (preset DS + polices Google Fonts).
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tgPreset = require('@murmure/design-system/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [tgPreset],
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
};
