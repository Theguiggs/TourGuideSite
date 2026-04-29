/**
 * Story 5.10.5 — Storybook : Illustrations empty-states (Web).
 *
 * Affiche les 2 illustrations (`EmptyOffline`, `EmptyGps`) en grille 2 colonnes
 * avec dimensions recommandées documentées (min 120px, optimal 160-240px,
 * max 320px) + démonstration `currentColor` héritage.
 */
import * as React from 'react';
import * as Illustrations from './index';
import type { Meta, StoryObj } from '../.storybook/types';
import { tg } from '../tokens';

const meta: Meta<React.FC> = {
  title: 'Illustrations/Empty states',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Pack illustrations empty-states — viewBox 200×200, stroke 1.5, currentColor pour les lignes principales, accent grenadine fixe (signature DS, Brief §6). Min usage 120px, optimal 160-240px, max 320px. Importer depuis `@tourguide/design-system/illustrations`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

interface IllustrationCellProps {
  name: string;
  Comp: React.FC<{
    size?: number;
    color?: string;
    'aria-label'?: string;
  }>;
  size?: number;
  color?: string;
}

function IllustrationCell({
  name,
  Comp,
  size = 200,
  color = tg.colors.ink,
}: IllustrationCellProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 24,
        borderRadius: tg.radius.md,
        background: tg.colors.paper,
        border: `1px solid ${tg.colors.line}`,
      }}
    >
      <Comp size={size} color={color} aria-label={name} />
      <span
        style={{
          fontFamily: tg.fonts.sans,
          fontSize: 13,
          fontWeight: 600,
          color: tg.colors.ink,
        }}
      >
        {name}
      </span>
      <span
        style={{
          fontFamily: tg.fonts.sans,
          fontSize: 11,
          color: tg.colors.ink60,
          textAlign: 'center',
        }}
      >
        min 120 · optimal 160-240 · max 320
      </span>
    </div>
  );
}

export const AllIllustrations: Story = {
  name: 'Toutes (2)',
  render: () => (
    <div
      style={{
        padding: 24,
        background: tg.colors.paperSoft,
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 24,
        maxWidth: 720,
      }}
    >
      <IllustrationCell name="EmptyOffline" Comp={Illustrations.EmptyOffline} />
      <IllustrationCell name="EmptyGps" Comp={Illustrations.EmptyGps} />
    </div>
  ),
};

export const WithGrenadineColor: Story = {
  name: 'Couleur · grenadine',
  render: () => (
    <div
      style={{
        padding: 24,
        background: tg.colors.paperSoft,
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 24,
        maxWidth: 720,
      }}
    >
      <IllustrationCell
        name="EmptyOffline"
        Comp={Illustrations.EmptyOffline}
        color={tg.colors.grenadine}
      />
      <IllustrationCell
        name="EmptyGps"
        Comp={Illustrations.EmptyGps}
        color={tg.colors.grenadine}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Démonstration `currentColor` : `color={tg.colors.grenadine}` tinte les lignes principales. L\'accent grenadine reste invariable (signature DS).',
      },
    },
  },
};
