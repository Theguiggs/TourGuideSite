/**
 * Story 2.1 — Tests <Button> Web (DS package)
 *
 * Couvre :
 *  - 9 snapshots (3 variants × 3 sizes) du Button Web.
 *  - Assertion exports : Button accessible depuis `../web` ; ligne RN câblée
 *    dans `rn/index.ts` (lecture source — `../rn` n'est pas chargeable en
 *    Jest node sans preset RN).
 *  - Disabled state (opacity 0.4 + cursor not-allowed).
 *  - Accent variant inclut `boxShadow: tgShadow.accent`.
 *  - `accessibilityLabel` → `aria-label`.
 *  - `testID` → `data-testid`.
 *
 * Note React 19 : `react-test-renderer` requiert `act()` pour que le rendu
 * soit committé (rendu concurrent par défaut). Sans `act()`, `toJSON()`
 * retourne `null`.
 *
 * Les tests d'interaction RN (onPress, hit target Pressable) vivent côté
 * TourGuideApp (`@testing-library/react-native`), pas ici (DS package = Jest node).
 */

import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import TestRenderer, { act } from 'react-test-renderer';
import { Button as ButtonWeb, type ButtonVariant, type ButtonSize } from '../web';
import { tgShadow } from '../tokens';

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

const VARIANTS: ButtonVariant[] = ['primary', 'accent', 'ghost'];
const SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

describe('Button (Web) — exports', () => {
  it('is exported from @tourguide/design-system/web', () => {
    expect(ButtonWeb).toBeDefined();
    // forwardRef returns an object with $$typeof — not a plain function.
    expect(['function', 'object']).toContain(typeof ButtonWeb);
  });

  it('is wired in @tourguide/design-system/rn sub-export (Story 2.1)', () => {
    // On NE peut PAS importer `../rn` ici (Jest node env sans preset RN —
    // `react-native` n'est pas chargeable). On valide donc le câblage en
    // lisant le fichier source.
    const rnIndex = fs.readFileSync(
      path.join(__dirname, '..', 'rn', 'index.ts'),
      'utf8',
    );
    expect(rnIndex).toMatch(/export \* from '\.\.\/components-rn\/Button';/);
  });

  it('Button RN miroir file exists at design-system/components-rn/Button.tsx', () => {
    const rnButton = path.join(__dirname, '..', 'components-rn', 'Button.tsx');
    expect(fs.existsSync(rnButton)).toBe(true);
  });
});

describe('Button (Web) — snapshots 3 variants × 3 sizes', () => {
  for (const variant of VARIANTS) {
    for (const size of SIZES) {
      it(`variant=${variant} size=${size}`, () => {
        const tree = renderToJSON(
          <ButtonWeb variant={variant} size={size}>
            Écouter
          </ButtonWeb>,
        );
        expect(tree).toMatchSnapshot();
      });
    }
  }
});

describe('Button (Web) — features', () => {
  it('disabled applies opacity 0.4 and cursor not-allowed', () => {
    const tree = renderToJSON(<ButtonWeb disabled>Off</ButtonWeb>);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.opacity).toBe(0.4);
    expect(style.cursor).toBe('not-allowed');
  });

  it('accent variant includes tgShadow.accent', () => {
    const tree = renderToJSON(<ButtonWeb variant="accent">CTA</ButtonWeb>);
    const style = tree.props.style as Record<string, unknown>;
    expect(style.boxShadow).toBe(tgShadow.accent);
  });

  it('accessibilityLabel maps to aria-label', () => {
    const tree = renderToJSON(
      <ButtonWeb accessibilityLabel="Lire la visite">Play</ButtonWeb>,
    );
    expect(tree.props['aria-label']).toBe('Lire la visite');
  });

  it('testID maps to data-testid', () => {
    const tree = renderToJSON(<ButtonWeb testID="btn-1">Play</ButtonWeb>);
    expect(tree.props['data-testid']).toBe('btn-1');
  });
});
