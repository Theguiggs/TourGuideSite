/**
 * Story 2.7 — Types Storybook locaux (fallback tant que `@storybook/react` n'est
 * pas installé — voir `npm install` à exécuter par Guillaume).
 *
 * Une fois Storybook installé, ces types peuvent être remplacés par leurs
 * équivalents officiels :
 *
 *   import type { Meta, StoryObj } from '@storybook/react';
 *
 * Le format CSF des stories reste 100% compatible — seul le path d'import
 * de Meta/StoryObj change.
 */
import type * as React from 'react';

export interface Meta<TComponent = unknown> {
  title?: string;
  component?: TComponent;
  parameters?: Record<string, unknown>;
  argTypes?: Record<string, unknown>;
  args?: Record<string, unknown>;
  tags?: string[];
  decorators?: Array<(Story: React.ComponentType) => React.ReactElement>;
}

export interface StoryObj<TMeta = unknown> {
  args?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  render?: (args: Record<string, unknown>) => React.ReactElement;
  name?: string;
  tags?: string[];
}

// Suppress unused warning — TMeta is the documented future-compat slot.
export type _PreserveMeta<T> = T;
