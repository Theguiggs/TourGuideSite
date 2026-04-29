/**
 * Story 2.7 — Stories Chip (5 couleurs × 2 états).
 *
 * Démontre la matrice complète : 5 ChipColor (default + 4 villes) × 2 états
 * (default = bord ink20, active = fond *Soft + texte color).
 */
import * as React from 'react';
import { Chip } from './Chip';
import type { Meta, StoryObj } from '../.storybook/types';

const meta: Meta<typeof Chip> = {
  title: 'Composants/Chip',
  component: Chip,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Étiquette compacte — 5 couleurs (default + 4 villes), 2 états (default / active). Active = fond soft + texte color.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const colors = ['default', 'grenadine', 'ocre', 'mer', 'olive'] as const;
const labels: Record<typeof colors[number], string> = {
  default: 'Tous',
  grenadine: 'Paris',
  ocre: 'Rome',
  mer: 'Lisbonne',
  olive: 'Athènes',
};

export const AllDefault: Story = {
  name: 'Tous · état default',
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {colors.map((c) => (
        <Chip key={c} color={c}>{labels[c]}</Chip>
      ))}
    </div>
  ),
  parameters: { docs: { description: { story: 'Les 5 couleurs en état default — fond transparent, bord ink20.' } } },
};

export const AllActive: Story = {
  name: 'Tous · état active',
  render: () => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {colors.map((c) => (
        <Chip key={c} color={c} active>{labels[c]}</Chip>
      ))}
    </div>
  ),
  parameters: { docs: { description: { story: 'Les 5 couleurs en état active — fond *Soft, texte color, bord transparent.' } } },
};

export const Default: Story = {
  name: 'Default',
  render: () => <Chip>Filtre</Chip>,
};

export const Grenadine: Story = {
  name: 'Grenadine · active',
  render: () => <Chip color="grenadine" active>Paris</Chip>,
};

export const Ocre: Story = {
  name: 'Ocre · active',
  render: () => <Chip color="ocre" active>Rome</Chip>,
};

export const Mer: Story = {
  name: 'Mer · active',
  render: () => <Chip color="mer" active>Lisbonne</Chip>,
};

export const Olive: Story = {
  name: 'Olive · active',
  render: () => <Chip color="olive" active>Athènes</Chip>,
};

export const WithIcon: Story = {
  name: 'Avec icône',
  render: () => (
    <Chip color="grenadine" active iconLeft={<span aria-hidden>★</span>}>
      Coup de cœur
    </Chip>
  ),
  parameters: { docs: { description: { story: 'Slot iconLeft pour décor — emoji, SVG, etc.' } } },
};
