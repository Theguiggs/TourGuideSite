/**
 * Story 2.5 — Tests <Eyebrow>, <PullQuote>, <NumberMark> Web (DS package)
 *
 * Couvre :
 *  - 3 Eyebrow tests (default color = ink60, custom color, applies tgEyebrow constants)
 *  - 4 PullQuote tests (sm=18, md=22 default, lg=30, italic + ink80)
 *  - 5 NumberMark tests (n=1→01, n=5→05, n=12→12, custom size, custom color)
 *  - Wiring : RN sub-export contient bien `export * from '../components-rn/Typography'`
 *  - Existence du fichier RN miroir
 *
 * Pattern react-test-renderer + act() identique à Button.test.tsx (Story 2.1).
 *
 * Les valeurs `style.fontSize` sont des **nombres** (input JS), pas des strings
 * type "11px" — `react-test-renderer` ne sérialise pas en CSS, il préserve
 * l'objet JS tel quel.
 */

import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import TestRenderer, { act } from 'react-test-renderer';
import {
  Eyebrow as EyebrowWeb,
  PullQuote as PullQuoteWeb,
  NumberMark as NumberMarkWeb,
} from '../web';
import { tgColors, tgFonts, tgFontSize, tgTracking, tgEyebrow } from '../tokens';

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

describe('Typography — exports & wiring', () => {
  it('Eyebrow / PullQuote / NumberMark are exported from @tourguide/design-system/web', () => {
    expect(EyebrowWeb).toBeDefined();
    expect(PullQuoteWeb).toBeDefined();
    expect(NumberMarkWeb).toBeDefined();
  });

  it('RN miroir wired in @tourguide/design-system/rn (Story 2.5)', () => {
    const rnIndex = fs.readFileSync(
      path.join(__dirname, '..', 'rn', 'index.ts'),
      'utf8',
    );
    expect(rnIndex).toMatch(/export \* from '\.\.\/components-rn\/Typography';/);
  });

  it('Typography RN miroir file exists at design-system/components-rn/Typography.tsx', () => {
    const rnTypo = path.join(__dirname, '..', 'components-rn', 'Typography.tsx');
    expect(fs.existsSync(rnTypo)).toBe(true);
  });
});

describe('Eyebrow (Web)', () => {
  it('default color is tgColors.ink60', () => {
    const tree = renderToJSON(<EyebrowWeb>Section</EyebrowWeb>);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.color).toBe(tgColors.ink60);
  });

  it('color prop is applied (custom = grenadine)', () => {
    const tree = renderToJSON(
      <EyebrowWeb color={tgColors.grenadine}>Aix-en-Provence · 38 min</EyebrowWeb>,
    );
    const style = tree.props.style as Record<string, unknown>;
    expect(style.color).toBe(tgColors.grenadine);
  });

  it('applies tgEyebrow constants (fontSize, letterSpacing, fontWeight, textTransform) and tgFonts.sans', () => {
    const tree = renderToJSON(<EyebrowWeb>Section</EyebrowWeb>);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.fontSize).toBe(tgEyebrow.fontSize);
    expect(style.letterSpacing).toBe(tgEyebrow.letterSpacing);
    expect(style.fontWeight).toBe(tgEyebrow.fontWeight);
    expect(style.textTransform).toBe(tgEyebrow.textTransform);
    expect(style.fontFamily).toBe(tgFonts.sans);
  });
});

describe('PullQuote (Web)', () => {
  it('size=sm → fontSize 18 (h6)', () => {
    const tree = renderToJSON(<PullQuoteWeb size="sm">Quote</PullQuoteWeb>);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.fontSize).toBe(tgFontSize.h6);
    expect(style.fontSize).toBe(18);
  });

  it('size=md (default) → fontSize 22 (h5)', () => {
    const tree = renderToJSON(<PullQuoteWeb>Là où Zola courait, gamin.</PullQuoteWeb>);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.fontSize).toBe(tgFontSize.h5);
    expect(style.fontSize).toBe(22);
  });

  it('size=lg → fontSize 30 (h4)', () => {
    const tree = renderToJSON(<PullQuoteWeb size="lg">Quote</PullQuoteWeb>);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.fontSize).toBe(tgFontSize.h4);
    expect(style.fontSize).toBe(30);
  });

  it('uses fontStyle italic + color ink80 + fontFamily editorial (DM Serif Text)', () => {
    const tree = renderToJSON(<PullQuoteWeb>Quote</PullQuoteWeb>);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.fontStyle).toBe('italic');
    expect(style.color).toBe(tgColors.ink80);
    expect(style.fontFamily).toBe(tgFonts.editorial);
  });
});

describe('NumberMark (Web)', () => {
  it('n=1 renders as zero-padded "01"', () => {
    const tree = renderToJSON(<NumberMarkWeb n={1} />);
    expect(tree.children).toEqual(['01']);
  });

  it('n=5 renders as zero-padded "05"', () => {
    const tree = renderToJSON(<NumberMarkWeb n={5} />);
    expect(tree.children).toEqual(['05']);
  });

  it('n=12 renders as "12" (no padding when ≥ 10)', () => {
    const tree = renderToJSON(<NumberMarkWeb n={12} />);
    expect(tree.children).toEqual(['12']);
  });

  it('default size is 40 (= tgFontSize.h3) and default color is grenadine', () => {
    const tree = renderToJSON(<NumberMarkWeb n={3} />);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.fontSize).toBe(tgFontSize.h3);
    expect(style.fontSize).toBe(40);
    expect(style.color).toBe(tgColors.grenadine);
    expect(style.fontFamily).toBe(tgFonts.display);
    expect(style.letterSpacing).toBe(tgTracking.display);
  });

  it('custom size and custom color are applied', () => {
    const tree = renderToJSON(
      <NumberMarkWeb n={2} color={tgColors.ocre} size={48} />,
    );
    const style = tree.props.style as Record<string, unknown>;
    expect(style.fontSize).toBe(48);
    expect(style.color).toBe(tgColors.ocre);
    expect(tree.children).toEqual(['02']);
  });
});
