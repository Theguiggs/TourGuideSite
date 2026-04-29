/**
 * Story 2.2 — Tests <Chip> Web (DS package)
 *
 * Couvre :
 *  - 10 snapshots = 5 colors × 2 states (default / active) du Chip Web.
 *  - Bug fix Story 2.2 (active/default styling inversé en Story 1.0/1.1).
 *  - fontFamily explicite `tgFonts.sans` présent dans les styles inline.
 *  - Assertion exports : Chip accessible depuis `../web` (import direct) et
 *    depuis `../rn` (vérification source par fs.readFileSync — `../rn` n'est
 *    pas chargeable en Jest node env sans preset RN, conforme spec story
 *    2.2 ligne 200-201).
 *
 * Les tests d'interaction RN (onPress, accessibilityState.selected, hitSlop)
 * vivent côté TourGuideApp (`@testing-library/react-native`), pas ici.
 */

import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import TestRenderer, { act } from 'react-test-renderer';
import { Chip as ChipWeb, type ChipColor } from '../web';
import { tgColors, tgFonts, tgRadius } from '../tokens';

type RenderedNode = {
  type: string;
  props: Record<string, unknown>;
  children: unknown[] | null;
};

function renderToJSON(element: React.ReactElement): RenderedNode {
  let renderer: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(element);
  });
  const tree = renderer!.toJSON();
  if (tree === null || Array.isArray(tree) || typeof tree === 'string') {
    throw new Error('Expected single rendered element node');
  }
  return tree as RenderedNode;
}

const COLORS: ChipColor[] = ['default', 'grenadine', 'ocre', 'mer', 'olive'];

const SOFT_BY_COLOR: Record<ChipColor, string> = {
  default:   tgColors.paperDeep,
  grenadine: tgColors.grenadineSoft,
  ocre:      tgColors.ocreSoft,
  mer:       tgColors.merSoft,
  olive:     tgColors.oliveSoft,
};

const COLOR_BY_COLOR: Record<ChipColor, string> = {
  default:   tgColors.ink,
  grenadine: tgColors.grenadine,
  ocre:      tgColors.ocre,
  mer:       tgColors.mer,
  olive:     tgColors.olive,
};

describe('Chip — exports', () => {
  it('is exported from @tourguide/design-system/web', () => {
    expect(ChipWeb).toBeDefined();
    expect(typeof ChipWeb).toBe('function');
  });

  it('is wired in @tourguide/design-system/rn sub-export (Story 2.2)', () => {
    // On NE peut PAS importer `../rn` ici (Jest node env sans preset RN —
    // `react-native` ships Flow syntax non parsable par ts-jest).
    const rnIndex = fs.readFileSync(
      path.join(__dirname, '..', 'rn', 'index.ts'),
      'utf8',
    );
    expect(rnIndex).toMatch(/export \* from '\.\.\/components-rn\/Chip';/);
  });

  it('Chip RN miroir file exists at design-system/components-rn/Chip.tsx', () => {
    const rnChip = path.join(__dirname, '..', 'components-rn', 'Chip.tsx');
    expect(fs.existsSync(rnChip)).toBe(true);
  });
});

describe('Chip (Web) — snapshots 5 colors × 2 states (10 combinaisons)', () => {
  for (const color of COLORS) {
    it(`color=${color} state=default`, () => {
      const tree = renderToJSON(
        <ChipWeb color={color}>{`Chip-${color}`}</ChipWeb>,
      );
      expect(tree).toMatchSnapshot();
    });

    it(`color=${color} state=active`, () => {
      const tree = renderToJSON(
        <ChipWeb color={color} active>{`Chip-${color}`}</ChipWeb>,
      );
      expect(tree).toMatchSnapshot();
    });
  }
});

describe('Chip (Web) — bug fix Story 2.2 (active/default styling)', () => {
  function getStyle(color: ChipColor, active: boolean): Record<string, unknown> {
    const tree = renderToJSON(
      <ChipWeb color={color} active={active}>
        Test
      </ChipWeb>,
    );
    return tree.props.style as Record<string, unknown>;
  }

  it('active state: bg = c.soft, color = c.color, border transparent', () => {
    for (const color of COLORS) {
      const s = getStyle(color, true);
      expect(s.background).toBe(SOFT_BY_COLOR[color]);
      expect(s.color).toBe(COLOR_BY_COLOR[color]);
      expect(s.border).toBe('1px solid transparent');
    }
  });

  it('default state: bg = transparent, color = ink, border = 1px solid ink20', () => {
    for (const color of COLORS) {
      const s = getStyle(color, false);
      expect(s.background).toBe('transparent');
      expect(s.color).toBe(tgColors.ink);
      expect(s.border).toBe(`1px solid ${tgColors.ink20}`);
    }
  });

  it("fontFamily explicite tgFonts.sans (n'hérite plus du parent)", () => {
    const s = getStyle('grenadine', true);
    expect(s.fontFamily).toBe(tgFonts.sans);
  });

  it('borderRadius = tgRadius.pill (999), fontSize 12, fontWeight 600', () => {
    const s = getStyle('mer', true);
    expect(s.borderRadius).toBe(tgRadius.pill);
    expect(s.fontSize).toBe(12);
    expect(s.fontWeight).toBe(600);
  });
});
