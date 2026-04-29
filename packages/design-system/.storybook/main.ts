/**
 * Story 2.7 — Configuration Storybook 8.x avec Vite builder.
 *
 * Stories sont co-localisées sous `components/*.stories.tsx` (composants Web)
 * et à la racine du package (`Tokens.stories.tsx` — visualisation tokens).
 *
 * À activer (une fois) :
 *   cd design-system && npm install
 *   npm run storybook       # http://localhost:6006
 *   npm run build-storybook # produit storybook-static/
 *
 * RN Storybook on-device → Phase B post-V1.0 (placeholder `rn/index.ts`).
 */
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../*.stories.@(ts|tsx|mdx)',
    '../components/**/*.stories.@(ts|tsx|mdx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
