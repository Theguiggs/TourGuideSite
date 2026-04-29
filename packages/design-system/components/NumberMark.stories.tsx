/**
 * Story 2.7 — Stories NumberMark (5 numéros + 3 tailles).
 *
 * Gros numéro éditorial (01, 02, 03...) — sections, étapes, cards paywall.
 * DM Serif Display, grenadine par défaut, zero-padded sur 2 chiffres.
 */
import * as React from 'react';
import { NumberMark } from './Typography';
import { tgColors, tgFontSize } from '../tokens';
import type { Meta, StoryObj } from '../.storybook/types';

const meta: Meta<typeof NumberMark> = {
  title: 'Composants/NumberMark',
  component: NumberMark,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Numérotation éditoriale (01, 02...) — DM Serif Display, grenadine par défaut. Zero-padded automatique sur 2 chiffres.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Series: Story = {
  name: '01 → 05 (série)',
  render: () => (
    <div style={{ display: 'flex', gap: 32, alignItems: 'baseline' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <NumberMark key={n} n={n} />
      ))}
    </div>
  ),
  parameters: { docs: { description: { story: 'Série 01-05 (zero-padded automatiquement).' } } },
};

export const SizeSm: Story = {
  name: 'Taille · sm (h5 / 22px)',
  render: () => <NumberMark n={1} size={tgFontSize.h5} />,
  parameters: { docs: { description: { story: 'Petit format — inline avec un titre h5.' } } },
};

export const SizeMd: Story = {
  name: 'Taille · md (h3 / 40px) · default',
  render: () => <NumberMark n={2} />,
  parameters: { docs: { description: { story: 'Taille par défaut (h3 = 40px).' } } },
};

export const SizeLg: Story = {
  name: 'Taille · lg (h1 / 72px)',
  render: () => <NumberMark n={3} size={tgFontSize.h1} />,
  parameters: { docs: { description: { story: 'Très grand — hero, ouverture de chapitre.' } } },
};

export const ColorOcre: Story = {
  name: 'Color · ocre',
  render: () => <NumberMark n={4} color={tgColors.ocre} />,
};

export const ColorMer: Story = {
  name: 'Color · mer',
  render: () => <NumberMark n={5} color={tgColors.mer} />,
};

export const TwoDigit: Story = {
  name: 'Numéro à 2 chiffres',
  render: () => <NumberMark n={42} />,
  parameters: { docs: { description: { story: 'Numéro déjà à 2+ chiffres — pas de padding.' } } },
};
