/**
 * Story 2.7 — Ambient declarations Storybook (fallback tant que les vrais
 * packages ne sont pas installés via `npm install`).
 *
 * Ces shims permettent à `tsc --noEmit` de passer 0 erreur sur :
 *   - `.storybook/main.ts` (StorybookConfig de @storybook/react-vite)
 *   - `.storybook/preview.ts` (Preview de @storybook/react)
 *
 * Une fois `cd design-system && npm install` exécuté, les vrais types issus
 * de `node_modules/@storybook/*` prendront le relais (TypeScript préfère les
 * types réels si un module a une déclaration concrète).
 */

declare module '@storybook/react-vite' {
  export interface StorybookConfig {
    stories: string[];
    addons?: string[];
    framework?: { name: string; options?: Record<string, unknown> };
    docs?: { autodocs?: 'tag' | boolean };
    typescript?: {
      check?: boolean;
      reactDocgen?: 'react-docgen-typescript' | 'react-docgen' | false;
    };
    [key: string]: unknown;
  }
}

declare module '@storybook/react' {
  export interface Preview {
    parameters?: Record<string, unknown>;
    decorators?: Array<unknown>;
    [key: string]: unknown;
  }
}
