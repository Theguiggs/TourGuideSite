/**
 * Story 2.7 — Stories Eyebrow (3 exemples couleurs).
 *
 * Eyebrow = signature visuelle DS — 11 px, MAJUSCULES, letter-spacing 0.18em.
 * Toujours posé au-dessus d'un H1/H2 éditorial.
 */
import * as React from 'react';
import { Eyebrow } from './Typography';
import { tgColors, tgFonts } from '../tokens';
import type { Meta, StoryObj } from '../.storybook/types';

const meta: Meta<typeof Eyebrow> = {
  title: 'Composants/Eyebrow',
  component: Eyebrow,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Surtitre éditorial — 11px, uppercase, letter-spacing 0.18em, weight 700. Default color: ink60 (discret).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const HeadingMock = (children: React.ReactNode) => (
  <h2 style={{ fontFamily: tgFonts.display, fontSize: 32, margin: '4px 0 0', color: tgColors.ink, letterSpacing: '-0.025em' }}>
    {children}
  </h2>
);

export const DefaultInk60: Story = {
  name: 'Default · ink60',
  render: () => (
    <div>
      <Eyebrow>Paris · 38 min</Eyebrow>
      {HeadingMock('Le Marais aujourd\'hui')}
    </div>
  ),
  parameters: { docs: { description: { story: 'Couleur par défaut ink60 — discret au-dessus du titre.' } } },
};

export const Grenadine: Story = {
  name: 'Color · grenadine',
  render: () => (
    <div>
      <Eyebrow color={tgColors.grenadine}>Édition limitée</Eyebrow>
      {HeadingMock('Visite spéciale')}
    </div>
  ),
  parameters: { docs: { description: { story: 'Grenadine — accentuation marketing, CTA éditoriaux.' } } },
};

export const Mer: Story = {
  name: 'Color · mer',
  render: () => (
    <div>
      <Eyebrow color={tgColors.mer}>Lisbonne · 42 min</Eyebrow>
      {HeadingMock('Alfama et ses ruelles')}
    </div>
  ),
  parameters: { docs: { description: { story: 'Couleur ville (mer / ocre / olive) selon le contexte.' } } },
};
