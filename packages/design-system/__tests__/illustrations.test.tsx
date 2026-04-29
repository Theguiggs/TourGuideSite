/**
 * Story 5.10.5 — Tests illustrations empty-states Web + miroir RN.
 *
 * Couvre :
 *  - 2 illustrations Web exportées depuis `../illustrations`
 *  - Chaque illustration Web rend un <svg> avec viewBox "0 0 200 200"
 *  - Props `size` et `color` correctement appliqués
 *  - Default `aria-hidden="true"` quand pas d'`aria-label`
 *  - Avec `aria-label="…"` → `role="img"`
 *  - 2 fichiers RN miroir présents (file-system check, RN non chargeable Jest node)
 *  - Sub-exports `package.json` câblés
 *
 * Pattern strictement aligné sur `icons.test.tsx` (Story 3.6).
 */

import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';

import * as IllustrationsWeb from '../illustrations';

const EXPECTED = ['EmptyOffline', 'EmptyGps'] as const;

type AnyEl = React.ReactElement<Record<string, unknown>>;

function render<P>(Comp: React.FC<P>, props: P): AnyEl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Comp(props as any) as AnyEl;
}

describe('Illustrations Web — barrel export (AC1, AC8)', () => {
  it('exporte exactement 2 illustrations', () => {
    const exported = Object.keys(IllustrationsWeb).filter((k) =>
      k.startsWith('Empty'),
    );
    expect(exported.length).toBe(EXPECTED.length);
  });

  it.each(EXPECTED)('exporte %s', (name) => {
    expect((IllustrationsWeb as Record<string, unknown>)[name]).toBeDefined();
    expect(typeof (IllustrationsWeb as Record<string, unknown>)[name]).toBe(
      'function',
    );
  });
});

describe('Illustrations Web — spec SVG uniforme (AC3, AC4)', () => {
  it.each(EXPECTED)('%s rend un <svg> viewBox 200×200', (name) => {
    const Comp = (IllustrationsWeb as Record<
      string,
      React.FC<Record<string, unknown>>
    >)[name];
    const el = render(Comp, {});
    expect(el.type).toBe('svg');
    expect(el.props.viewBox).toBe('0 0 200 200');
    expect(el.props.fill).toBe('none');
    expect(el.props.strokeWidth).toBe(1.5);
    expect(el.props.strokeLinecap).toBe('round');
    expect(el.props.strokeLinejoin).toBe('round');
  });

  it('default stroke = "currentColor" (AC4)', () => {
    const el = render(IllustrationsWeb.EmptyOffline, {});
    expect(el.props.stroke).toBe('currentColor');
  });
});

describe('Illustrations Web — props (AC2, AC3)', () => {
  it('size custom est propagée à width/height', () => {
    const el = render(IllustrationsWeb.EmptyOffline, { size: 160 });
    expect(el.props.width).toBe(160);
    expect(el.props.height).toBe(160);
  });

  it('default size = 200', () => {
    const el = render(IllustrationsWeb.EmptyGps, {});
    expect(el.props.width).toBe(200);
    expect(el.props.height).toBe(200);
  });

  it('color custom remplace currentColor', () => {
    const el = render(IllustrationsWeb.EmptyGps, { color: '#C1262A' });
    expect(el.props.stroke).toBe('#C1262A');
  });

  it('className et style transmis tel quel', () => {
    const el = render(IllustrationsWeb.EmptyOffline, {
      className: 'my-illustration',
      style: { opacity: 0.5 },
    });
    expect(el.props.className).toBe('my-illustration');
    expect((el.props.style as React.CSSProperties).opacity).toBe(0.5);
  });
});

describe('Illustrations Web — accessibilité (AC3)', () => {
  it('sans aria-label → aria-hidden=true, pas de role', () => {
    const el = render(IllustrationsWeb.EmptyOffline, {});
    expect(el.props['aria-hidden']).toBe(true);
    expect(el.props.role).toBeUndefined();
  });

  it('avec aria-label → role="img" + aria-label défini', () => {
    const el = render(IllustrationsWeb.EmptyGps, {
      'aria-label': 'GPS désactivé',
    });
    expect(el.props.role).toBe('img');
    expect(el.props['aria-label']).toBe('GPS désactivé');
    expect(el.props['aria-hidden']).toBeUndefined();
  });
});

describe('Illustrations RN — fichiers miroir (AC7)', () => {
  // RN non chargeable Jest node → on valide via file-system, comme icons.test.tsx
  it.each(EXPECTED)(
    '%s a un fichier miroir RN dans illustrations-rn/',
    (name) => {
      const rnFile = path.join(
        __dirname,
        '..',
        'illustrations-rn',
        `${name}.tsx`,
      );
      expect(fs.existsSync(rnFile)).toBe(true);
    },
  );

  it('illustrations-rn/index.ts re-exporte les 2 illustrations', () => {
    const rnIndex = fs.readFileSync(
      path.join(__dirname, '..', 'illustrations-rn', 'index.ts'),
      'utf8',
    );
    for (const name of EXPECTED) {
      expect(rnIndex).toMatch(
        new RegExp(`export \\{ ${name} \\} from '\\./${name}';`),
      );
    }
  });

  it('chaque miroir RN utilise react-native-svg', () => {
    for (const name of EXPECTED) {
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'illustrations-rn', `${name}.tsx`),
        'utf8',
      );
      expect(src).toMatch(/from 'react-native-svg'/);
    }
  });
});

describe('package.json — sub-exports illustrations + illustrations-rn (AC8)', () => {
  it('exports map déclare ./illustrations et ./illustrations-rn', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
    );
    expect(pkg.exports['./illustrations']).toBeDefined();
    expect(pkg.exports['./illustrations'].default).toBe(
      './illustrations/index.ts',
    );
    expect(pkg.exports['./illustrations-rn']).toBeDefined();
    expect(pkg.exports['./illustrations-rn'].default).toBe(
      './illustrations-rn/index.ts',
    );
  });

  it('illustrations NE SONT PAS re-exportées depuis le default index.ts (perf NFR)', () => {
    const defaultIndex = fs.readFileSync(
      path.join(__dirname, '..', 'index.ts'),
      'utf8',
    );
    expect(defaultIndex).not.toMatch(/from '\.\/illustrations/);
    expect(defaultIndex).not.toMatch(/from '\.\/illustrations-rn/);
  });
});
