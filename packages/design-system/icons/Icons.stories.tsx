/**
 * Story 3.6 — Storybook : Set 23 icônes Web (4 groupes).
 *
 * Affiche les 23 icônes en grille avec labels, organisée par groupe
 * (Navigation, Lecture, État, UI). Variantes pour `size` et `color`.
 */
import * as React from 'react';
import * as Icons from './index';
import type { Meta, StoryObj } from '../.storybook/types';
import { tg } from '../tokens';

const meta: Meta<React.FC> = {
  title: 'Iconographie/Set 23 icônes',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Set 23 icônes — viewBox 24×24, stroke 1.5, currentColor. Sources Lucide (MIT) + 4 hand-authored (SkipForward15, SkipBack15, Downloaded, Gps). Min 16px, optimal 20-24px. Wrap dans `<IconButton>` (Story 3.7) pour tap target 44pt.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

interface IconCellProps {
  name: string;
  Comp: React.FC<{
    size?: number;
    color?: string;
    'aria-label'?: string;
  }>;
  size?: number;
  color?: string;
}

function IconCell({ name, Comp, size = 28, color = tg.colors.ink }: IconCellProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        borderRadius: tg.radius.md,
        background: tg.colors.paper,
        border: `1px solid ${tg.colors.line}`,
      }}
    >
      <Comp size={size} color={color} aria-label={name} />
      <span
        style={{
          fontFamily: tg.fonts.sans,
          fontSize: 11,
          color: tg.colors.ink60,
          textAlign: 'center',
        }}
      >
        {name}
      </span>
    </div>
  );
}

interface IconSectionProps {
  title: string;
  items: Array<[string, React.FC<{ size?: number; color?: string; 'aria-label'?: string }>]>;
  size?: number;
  color?: string;
}

function IconSection({ title, items, size, color }: IconSectionProps) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h3
        style={{
          fontFamily: tg.fonts.display,
          fontSize: 18,
          marginBottom: 12,
          color: tg.colors.ink,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 12,
        }}
      >
        {items.map(([name, Comp]) => (
          <IconCell key={name} name={name} Comp={Comp} size={size} color={color} />
        ))}
      </div>
    </section>
  );
}

const NAVIGATION: IconSectionProps['items'] = [
  ['IconHome', Icons.IconHome],
  ['IconCatalog', Icons.IconCatalog],
  ['IconProfile', Icons.IconProfile],
  ['IconSearch', Icons.IconSearch],
  ['IconSettings', Icons.IconSettings],
  ['IconBack', Icons.IconBack],
  ['IconClose', Icons.IconClose],
];

const LECTURE: IconSectionProps['items'] = [
  ['IconPlay', Icons.IconPlay],
  ['IconPause', Icons.IconPause],
  ['IconSkipForward15', Icons.IconSkipForward15],
  ['IconSkipBack15', Icons.IconSkipBack15],
  ['IconDownload', Icons.IconDownload],
  ['IconDownloaded', Icons.IconDownloaded],
];

const ETAT: IconSectionProps['items'] = [
  ['IconCheck', Icons.IconCheck],
  ['IconLock', Icons.IconLock],
  ['IconAlert', Icons.IconAlert],
  ['IconInfo', Icons.IconInfo],
  ['IconGps', Icons.IconGps],
  ['IconOffline', Icons.IconOffline],
];

const UI: IconSectionProps['items'] = [
  ['IconHeart', Icons.IconHeart],
  ['IconShare', Icons.IconShare],
  ['IconMore', Icons.IconMore],
  ['IconChevron', Icons.IconChevron],
  ['IconPlus', Icons.IconPlus],
];

export const AllIcons: Story = {
  name: 'Set complet (23)',
  render: () => (
    <div style={{ padding: 24, background: tg.colors.paperSoft, minHeight: '100vh' }}>
      <IconSection title="Navigation (7)" items={NAVIGATION} />
      <IconSection title="Lecture (6)" items={LECTURE} />
      <IconSection title="État (6)" items={ETAT} />
      <IconSection title="UI (5)" items={UI} />
    </div>
  ),
};

export const Grenadine: Story = {
  name: 'Couleur · grenadine',
  render: () => (
    <div style={{ padding: 24, background: tg.colors.paperSoft, minHeight: '100vh' }}>
      <IconSection
        title="Navigation (7)"
        items={NAVIGATION}
        color={tg.colors.grenadine}
      />
      <IconSection title="Lecture (6)" items={LECTURE} color={tg.colors.grenadine} />
      <IconSection title="État (6)" items={ETAT} color={tg.colors.grenadine} />
      <IconSection title="UI (5)" items={UI} color={tg.colors.grenadine} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Démonstration de `currentColor` : on passe `color={tg.colors.grenadine}` pour basculer toute la grille. En contexte réel CSS, `color` est hérité du parent.',
      },
    },
  },
};

export const LargeSize: Story = {
  name: 'Taille · 48px',
  render: () => (
    <div style={{ padding: 24, background: tg.colors.paperSoft, minHeight: '100vh' }}>
      <IconSection title="Navigation (7)" items={NAVIGATION} size={48} />
      <IconSection title="Lecture (6)" items={LECTURE} size={48} />
      <IconSection title="État (6)" items={ETAT} size={48} />
      <IconSection title="UI (5)" items={UI} size={48} />
    </div>
  ),
};
