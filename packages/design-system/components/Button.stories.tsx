/**
 * Story 2.7 — Stories Button (3 variants × 3 tailles = 9 combinaisons).
 *
 * Couvre les 3 variantes (primary / accent / ghost) sur les 3 tailles (sm / md / lg)
 * + un état disabled + un exemple iconLeft pour montrer l'API render.
 */
import * as React from 'react';
import { Button } from './Button';
import type { Meta, StoryObj } from '../.storybook/types';

const meta: Meta<typeof Button> = {
  title: 'Composants/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Bouton TourGuide — primary (encre), accent (grenadine, CTA fort), ghost (bord encre, action secondaire).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Variants × tailles
export const PrimarySm: Story = {
  name: 'Primary · sm',
  render: () => <Button variant="primary" size="sm">Action</Button>,
  parameters: { docs: { description: { story: 'Primary encre, taille compacte (8/14 px).' } } },
};

export const PrimaryMd: Story = {
  name: 'Primary · md',
  render: () => <Button variant="primary" size="md">Action</Button>,
  parameters: { docs: { description: { story: 'Primary encre, taille standard.' } } },
};

export const PrimaryLg: Story = {
  name: 'Primary · lg',
  render: () => <Button variant="primary" size="lg">Action</Button>,
  parameters: { docs: { description: { story: 'Primary encre, large (CTA hero).' } } },
};

export const AccentSm: Story = {
  name: 'Accent · sm',
  render: () => <Button variant="accent" size="sm">Écouter</Button>,
  parameters: { docs: { description: { story: 'Accent grenadine, compact — utiliser avec parcimonie.' } } },
};

export const AccentMd: Story = {
  name: 'Accent · md',
  render: () => <Button variant="accent" size="md">Écouter le guide</Button>,
  parameters: { docs: { description: { story: 'Accent grenadine — CTA principal sur cards.' } } },
};

export const AccentLg: Story = {
  name: 'Accent · lg',
  render: () => <Button variant="accent" size="lg">Écouter le guide</Button>,
  parameters: { docs: { description: { story: 'Accent grenadine, large — CTA hero/landing page.' } } },
};

export const GhostSm: Story = {
  name: 'Ghost · sm',
  render: () => <Button variant="ghost" size="sm">Annuler</Button>,
  parameters: { docs: { description: { story: 'Ghost — action secondaire compacte.' } } },
};

export const GhostMd: Story = {
  name: 'Ghost · md',
  render: () => <Button variant="ghost" size="md">Annuler</Button>,
  parameters: { docs: { description: { story: 'Ghost — action secondaire standard.' } } },
};

export const GhostLg: Story = {
  name: 'Ghost · lg',
  render: () => <Button variant="ghost" size="lg">Annuler</Button>,
  parameters: { docs: { description: { story: 'Ghost — action secondaire large.' } } },
};

// ─── États
export const Disabled: Story = {
  name: 'Disabled',
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      <Button variant="primary" disabled>Primary</Button>
      <Button variant="accent" disabled>Accent</Button>
      <Button variant="ghost" disabled>Ghost</Button>
    </div>
  ),
  parameters: { docs: { description: { story: 'État disabled — opacity 0.4, pointer-events: none.' } } },
};

export const WithIcon: Story = {
  name: 'Avec icône',
  render: () => (
    <Button variant="accent" iconLeft={<span aria-hidden>▶</span>}>Écouter</Button>
  ),
  parameters: { docs: { description: { story: 'Slot iconLeft / iconRight — accepte n\'importe quel ReactNode.' } } },
};
