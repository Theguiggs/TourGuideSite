/**
 * Story 2.7 — Stories PullQuote (3 tailles : sm / md / lg).
 *
 * Citation italique (DM Serif Text) — sm=18, md=22 (default), lg=30.
 * Tailles alignées sur l'échelle 11 niveaux (h6/h5/h4).
 */
import * as React from 'react';
import { PullQuote } from './Typography';
import type { Meta, StoryObj } from '../.storybook/types';

const meta: Meta<typeof PullQuote> = {
  title: 'Composants/PullQuote',
  component: PullQuote,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Citation éditoriale italique — DM Serif Text. 3 tailles alignées sur l\'échelle typo (h6/h5/h4 = 18/22/30 px).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const QUOTE = '« Le Marais, c\'est d\'abord une géographie : un quartier né dans les marécages. »';

export const Sm: Story = {
  name: 'Size · sm (18px)',
  render: () => <PullQuote size="sm">{QUOTE}</PullQuote>,
  parameters: { docs: { description: { story: 'Petite citation en flux — légende, sidebar.' } } },
};

export const Md: Story = {
  name: 'Size · md (22px) · default',
  render: () => <PullQuote size="md">{QUOTE}</PullQuote>,
  parameters: { docs: { description: { story: 'Citation par défaut — encadré éditorial standard.' } } },
};

export const Lg: Story = {
  name: 'Size · lg (30px)',
  render: () => <PullQuote size="lg">{QUOTE}</PullQuote>,
  parameters: { docs: { description: { story: 'Grande citation — hero, ouverture de section.' } } },
};
