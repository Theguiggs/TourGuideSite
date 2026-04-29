/**
 * Story 2.7 — Foundations / Tokens (visualisation interactive).
 *
 * Render-prop direct depuis `tokens.ts` — pas de hardcode. Si les tokens
 * évoluent (`tokens.ts`), cette page se met à jour automatiquement.
 *
 * Sections :
 *   1. Palette couleurs (4 surfaces, ink + 4 opacités, line, 4 villes × soft, 4 états)
 *   2. Échelle typographique (11 niveaux : eyebrow → h1)
 *   3. Spacings (11 valeurs grille 4pt)
 *   4. Radius (5 niveaux)
 *   5. Shadows (5 niveaux)
 */
import * as React from 'react';
import {
  tgColors,
  tgFonts,
  tgFontSize,
  tgSpace,
  tgRadius,
  tgShadow,
  tgTracking,
  tgEyebrow,
} from './tokens';
import type { Meta, StoryObj } from './.storybook/types';

const meta: Meta = {
  title: 'Foundations/Tokens',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Source de vérité visuelle du DS TourGuide. Tous les tokens (couleurs, typo, spacing, radius, shadow) sont importés directement depuis `tokens.ts` — cette page se met à jour automatiquement.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Helpers locaux (jetables, scope cette story uniquement)

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: tgFonts.display,
        fontSize: tgFontSize.h4,
        color: tgColors.ink,
        letterSpacing: tgTracking.display,
        margin: '32px 0 16px',
      }}
    >
      {children}
    </h2>
  );
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        ...tgEyebrow,
        fontFamily: tgFonts.sans,
        color: tgColors.ink60,
        margin: '24px 0 12px',
      }}
    >
      {children}
    </div>
  );
}

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 12,
        background: tgColors.card,
        border: `1px solid ${tgColors.line}`,
        borderRadius: tgRadius.md,
        minWidth: 160,
      }}
    >
      <div
        style={{
          width: '100%',
          height: 64,
          background: value,
          borderRadius: tgRadius.sm,
          border: `1px solid ${tgColors.line}`,
        }}
      />
      <div style={{ fontFamily: tgFonts.sans, fontSize: 12, fontWeight: 700, color: tgColors.ink }}>
        {name}
      </div>
      <div style={{ fontFamily: tgFonts.mono, fontSize: 11, color: tgColors.ink60 }}>{value}</div>
    </div>
  );
}

function SwatchGrid({ entries }: { entries: Array<[string, string]> }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {entries.map(([name, value]) => (
        <ColorSwatch key={name} name={name} value={value} />
      ))}
    </div>
  );
}

function TypeRow({ label, fontSize, fontFamily }: { label: string; fontSize: number; fontFamily: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 24,
        padding: '8px 0',
        borderBottom: `1px solid ${tgColors.line}`,
      }}
    >
      <div
        style={{
          width: 100,
          fontFamily: tgFonts.mono,
          fontSize: 11,
          color: tgColors.ink60,
          flexShrink: 0,
        }}
      >
        {label} · {fontSize}px
      </div>
      <div style={{ fontFamily, fontSize, color: tgColors.ink, lineHeight: 1.2 }}>
        The quick brown fox
      </div>
    </div>
  );
}

function SpacingBar({ name, value }: { name: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 0' }}>
      <div
        style={{
          width: 100,
          fontFamily: tgFonts.mono,
          fontSize: 11,
          color: tgColors.ink60,
          flexShrink: 0,
        }}
      >
        space-{name} · {value}px
      </div>
      <div style={{ height: 12, width: value, background: tgColors.grenadine, borderRadius: 2 }} />
    </div>
  );
}

function RadiusBox({ name, value }: { name: string; value: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <div
        style={{
          width: 80,
          height: 80,
          background: tgColors.grenadineSoft,
          border: `1.5px solid ${tgColors.grenadine}`,
          borderRadius: value,
        }}
      />
      <div style={{ fontFamily: tgFonts.sans, fontSize: 12, fontWeight: 700, color: tgColors.ink }}>
        {name}
      </div>
      <div style={{ fontFamily: tgFonts.mono, fontSize: 11, color: tgColors.ink60 }}>
        {value === 999 ? 'pill' : `${value}px`}
      </div>
    </div>
  );
}

function ShadowCard({ name, value }: { name: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <div
        style={{
          width: 120,
          height: 80,
          background: tgColors.card,
          borderRadius: tgRadius.md,
          boxShadow: value,
        }}
      />
      <div style={{ fontFamily: tgFonts.sans, fontSize: 12, fontWeight: 700, color: tgColors.ink }}>
        shadow.{name}
      </div>
    </div>
  );
}

// ─── Stories

export const Colors: Story = {
  name: 'Couleurs',
  render: () => (
    <div style={{ padding: 32, background: tgColors.paper, minHeight: '100vh' }}>
      <SectionTitle>Palette couleurs</SectionTitle>

      <Subtitle>Surfaces</Subtitle>
      <SwatchGrid
        entries={[
          ['paper', tgColors.paper],
          ['paperSoft', tgColors.paperSoft],
          ['paperDeep', tgColors.paperDeep],
          ['card', tgColors.card],
        ]}
      />

      <Subtitle>Encre (ink + opacités)</Subtitle>
      <SwatchGrid
        entries={[
          ['ink', tgColors.ink],
          ['ink80', tgColors.ink80],
          ['ink60', tgColors.ink60],
          ['ink40', tgColors.ink40],
          ['ink20', tgColors.ink20],
          ['line', tgColors.line],
          ['ardoise', tgColors.ardoise],
        ]}
      />

      <Subtitle>Couleurs villes (× soft)</Subtitle>
      <SwatchGrid
        entries={[
          ['grenadine', tgColors.grenadine],
          ['grenadineSoft', tgColors.grenadineSoft],
          ['ocre', tgColors.ocre],
          ['ocreSoft', tgColors.ocreSoft],
          ['mer', tgColors.mer],
          ['merSoft', tgColors.merSoft],
          ['olive', tgColors.olive],
          ['oliveSoft', tgColors.oliveSoft],
        ]}
      />

      <Subtitle>États sémantiques</Subtitle>
      <SwatchGrid
        entries={[
          ['success', tgColors.success],
          ['warning', tgColors.warning],
          ['danger', tgColors.danger],
          ['info', tgColors.info],
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '4 surfaces + ink (5 opacités) + line + ardoise + 4 villes (× soft) + 4 états sémantiques. Tout depuis `tgColors`.',
      },
    },
  },
};

export const Typography: Story = {
  name: 'Typographie',
  render: () => (
    <div style={{ padding: 32, background: tgColors.paper, minHeight: '100vh' }}>
      <SectionTitle>Échelle typographique (11 niveaux)</SectionTitle>
      <Subtitle>DM Serif Display (titres ≥ 22px)</Subtitle>
      <TypeRow label="h1" fontSize={tgFontSize.h1} fontFamily={tgFonts.display} />
      <TypeRow label="h2" fontSize={tgFontSize.h2} fontFamily={tgFonts.display} />
      <TypeRow label="h3" fontSize={tgFontSize.h3} fontFamily={tgFonts.display} />
      <TypeRow label="h4" fontSize={tgFontSize.h4} fontFamily={tgFonts.display} />
      <TypeRow label="h5" fontSize={tgFontSize.h5} fontFamily={tgFonts.display} />

      <Subtitle>Manrope (UI, body, meta)</Subtitle>
      <TypeRow label="h6" fontSize={tgFontSize.h6} fontFamily={tgFonts.sans} />
      <TypeRow label="bodyLg" fontSize={tgFontSize.bodyLg} fontFamily={tgFonts.sans} />
      <TypeRow label="body" fontSize={tgFontSize.body} fontFamily={tgFonts.sans} />
      <TypeRow label="caption" fontSize={tgFontSize.caption} fontFamily={tgFonts.sans} />
      <TypeRow label="meta" fontSize={tgFontSize.meta} fontFamily={tgFonts.sans} />
      <TypeRow label="eyebrow" fontSize={tgFontSize.eyebrow} fontFamily={tgFonts.sans} />

      <Subtitle>DM Serif Text Italic (citations)</Subtitle>
      <div style={{ padding: '8px 0' }}>
        <div
          style={{
            fontFamily: tgFonts.editorial,
            fontStyle: 'italic',
            fontSize: tgFontSize.h5,
            color: tgColors.ink80,
          }}
        >
          « The quick brown fox jumps over the lazy dog. »
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Échelle 11 niveaux : eyebrow (11) → h1 (72). 3 familles : DM Serif Display (titres), Manrope (UI), DM Serif Text Italic (citations).',
      },
    },
  },
};

export const Spacings: Story = {
  name: 'Spacings',
  render: () => (
    <div style={{ padding: 32, background: tgColors.paper, minHeight: '100vh' }}>
      <SectionTitle>Spacings (grille 4pt)</SectionTitle>
      {(Object.entries(tgSpace) as Array<[string, number]>).map(([k, v]) => (
        <SpacingBar key={k} name={k} value={v} />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '11 valeurs sur grille 4pt : 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 px. Pas d\'autres tailles.',
      },
    },
  },
};

export const Radius: Story = {
  name: 'Radius',
  render: () => (
    <div style={{ padding: 32, background: tgColors.paper, minHeight: '100vh' }}>
      <SectionTitle>Radius (5 niveaux)</SectionTitle>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {(Object.entries(tgRadius) as Array<[string, number]>).map(([k, v]) => (
          <RadiusBox key={k} name={k} value={v} />
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '5 niveaux : sm (6) · md (12) · lg (18) · xl (28) · pill (999). Boutons/chips = pill, cards = md, hero/modales = lg/xl.',
      },
    },
  },
};

export const Shadows: Story = {
  name: 'Shadows',
  render: () => (
    <div style={{ padding: 32, background: tgColors.paper, minHeight: '100vh' }}>
      <SectionTitle>Shadows (5 niveaux)</SectionTitle>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', padding: 24 }}>
        {(Object.entries(tgShadow) as Array<[string, string]>).map(([k, v]) => (
          <ShadowCard key={k} name={k} value={v} />
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          '5 niveaux : sm (cards sur paper) · md (cards qui flottent) · lg (modales) · xl · accent (lueur grenadine, bouton CTA).',
      },
    },
  },
};
