/**
 * Story 2.7 — Stories PinNegatif (variantes app-icon).
 *
 * Pin évidée sur fond couleur — destinée à l'icône d'app, splash, favicon.
 * Démontre : 4 couleurs de fond + 3 modes `rounded` (false / true / number).
 */
import * as React from 'react';
import { PinNegatif } from './Pin';
import type { Meta, StoryObj } from '../.storybook/types';

const meta: Meta<typeof PinNegatif> = {
  title: 'Composants/PinNegatif',
  component: PinNegatif,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Version « icône d\'app » de Pin — fond couleur plein, pin évidée. App-icon iOS, Android adaptive, splash, favicon.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Grenadine: Story = {
  name: 'Bg · grenadine (default)',
  render: () => <PinNegatif bg="grenadine" />,
};

export const Ocre: Story = {
  name: 'Bg · ocre',
  render: () => <PinNegatif bg="ocre" />,
};

export const Mer: Story = {
  name: 'Bg · mer',
  render: () => <PinNegatif bg="mer" />,
};

export const Olive: Story = {
  name: 'Bg · olive',
  render: () => <PinNegatif bg="olive" />,
};

export const RoundedFalse: Story = {
  name: 'Rounded · false (square)',
  render: () => <PinNegatif bg="grenadine" rounded={false} />,
  parameters: { docs: { description: { story: 'Carré net (borderRadius=0) — Android adaptive icon foreground.' } } },
};

export const RoundedTrue: Story = {
  name: 'Rounded · true (iOS ratio 0.225)',
  render: () => <PinNegatif bg="grenadine" rounded />,
  parameters: { docs: { description: { story: 'Ratio iOS standard (0.225) — defaults pour app-icon iOS.' } } },
};

export const RoundedHalf: Story = {
  name: 'Rounded · 0.5 (pill)',
  render: () => <PinNegatif bg="grenadine" rounded={0.5} />,
  parameters: { docs: { description: { story: 'Ratio 0.5 → cercle parfait — favicon circulaire.' } } },
};

export const Sizes: Story = {
  name: 'Tailles',
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <PinNegatif size={48} />
      <PinNegatif size={80} />
      <PinNegatif size={120} />
      <PinNegatif size={180} />
    </div>
  ),
  parameters: { docs: { description: { story: 'Tailles app-icon usuelles : 48 (Android mdpi), 80 (default), 120, 180 (iOS @3x).' } } },
};
