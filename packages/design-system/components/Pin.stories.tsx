/**
 * Story 2.7 — Stories Pin (4 couleurs nommées + hex + label).
 *
 * Pin = ADN visuel TourGuide. Démontre les 4 couleurs villes + accept hex
 * direct + variant `label` (numéro/lettre dans le cercle, pour étapes).
 */
import * as React from 'react';
import { Pin } from './Pin';
import type { Meta, StoryObj } from '../.storybook/types';

const meta: Meta<typeof Pin> = {
  title: 'Composants/Pin',
  component: Pin,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Marqueur de carte / icône / logo. Accepte une clé tgColors ("grenadine") ou un hex/rgb littéral. Optionnel : `label` pour numéroter une étape.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default · grenadine',
  render: () => <Pin />,
  parameters: { docs: { description: { story: 'Defaults : size=32, color=grenadine, dot=paper.' } } },
};

export const Ocre: Story = {
  name: 'Ocre',
  render: () => <Pin color="ocre" />,
};

export const Mer: Story = {
  name: 'Mer',
  render: () => <Pin color="mer" />,
};

export const Olive: Story = {
  name: 'Olive',
  render: () => <Pin color="olive" />,
};

export const HexLiteral: Story = {
  name: 'Hex littéral',
  render: () => <Pin color="#2C3E50" dot="#F4ECDD" />,
  parameters: { docs: { description: { story: 'Accepte aussi un hex direct (ardoise) — utile pour overrides ponctuels.' } } },
};

export const WithLabel: Story = {
  name: 'Avec label (étape)',
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Pin label={1} size={48} />
      <Pin label={2} color="ocre" size={48} />
      <Pin label={3} color="mer" size={48} />
      <Pin label="A" color="olive" size={48} />
    </div>
  ),
  parameters: { docs: { description: { story: 'Avec `label`, le cercle interne s\'agrandit pour héberger un numéro/lettre.' } } },
};

export const Sizes: Story = {
  name: 'Tailles',
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Pin size={16} />
      <Pin size={24} />
      <Pin size={32} />
      <Pin size={48} />
      <Pin size={64} />
    </div>
  ),
  parameters: { docs: { description: { story: 'Le SVG est viewBox-driven — n\'importe quelle taille (16/24/32/48/64...).' } } },
};
