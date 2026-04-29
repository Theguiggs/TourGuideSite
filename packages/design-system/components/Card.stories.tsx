/**
 * Story 2.7 — Stories Card (4 variants ombres + usage compound).
 *
 * Card a 4 niveaux d'ombre (flat / sm / md / lg) — `flat` est sans ombre,
 * les autres correspondent aux tokens `tg.shadow.{sm,md,lg}`.
 * La compound API (`Card.Header`, `Card.Body`, `Card.Footer`) est aussi
 * démontrée.
 */
import * as React from 'react';
import { Card } from './Card';
import { tgColors, tgFonts } from '../tokens';
import type { Meta, StoryObj } from '../.storybook/types';

const meta: Meta<typeof Card> = {
  title: 'Composants/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Surface élevée fond blanc, bord 1px line, radius lg (18px). 4 niveaux d\'ombre + compound Header/Body/Footer.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleBody = (
  <div style={{ padding: 20, fontFamily: tgFonts.sans, color: tgColors.ink }}>
    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Le Marais aujourd'hui</div>
    <div style={{ fontSize: 14, color: tgColors.ink60 }}>Paris · 38 min · 5 étapes</div>
  </div>
);

export const Flat: Story = {
  name: 'Variant · flat',
  render: () => <Card variant="flat" style={{ width: 320 }}>{sampleBody}</Card>,
  parameters: { docs: { description: { story: 'Sans ombre — surface posée, intégrée dans une grille.' } } },
};

export const ShadowSm: Story = {
  name: 'Variant · sm',
  render: () => <Card variant="sm" style={{ width: 320 }}>{sampleBody}</Card>,
  parameters: { docs: { description: { story: 'Ombre légère — cards reposant sur paper.' } } },
};

export const ShadowMd: Story = {
  name: 'Variant · md',
  render: () => <Card variant="md" style={{ width: 320 }}>{sampleBody}</Card>,
  parameters: { docs: { description: { story: 'Ombre standard — cards qui flottent (default).' } } },
};

export const ShadowLg: Story = {
  name: 'Variant · lg',
  render: () => <Card variant="lg" style={{ width: 320 }}>{sampleBody}</Card>,
  parameters: { docs: { description: { story: 'Ombre forte — modales, hero cards.' } } },
};

export const Compound: Story = {
  name: 'Compound (Header + Body + Footer)',
  render: () => (
    <Card variant="md" style={{ width: 360 }}>
      <Card.Header>
        <div style={{ fontFamily: tgFonts.sans, fontWeight: 700, color: tgColors.ink }}>
          Le Marais aujourd'hui
        </div>
      </Card.Header>
      <Card.Body>
        <div style={{ fontFamily: tgFonts.sans, fontSize: 14, color: tgColors.ink80, lineHeight: 1.5 }}>
          Un quartier né dans les marécages, devenu cœur royal puis refuge juif.
          Trois siècles d'histoire en 38 minutes.
        </div>
      </Card.Body>
      <Card.Footer>
        <div style={{ fontFamily: tgFonts.sans, fontSize: 12, color: tgColors.ink60 }}>
          Paris · 38 min · 5 étapes
        </div>
      </Card.Footer>
    </Card>
  ),
  parameters: {
    docs: { description: { story: 'API compound : sous-composants Header/Body/Footer avec séparateurs 1px line.' } },
  },
};
