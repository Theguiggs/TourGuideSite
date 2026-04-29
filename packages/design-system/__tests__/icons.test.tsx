/**
 * Story 3.6 — Tests set 23 icônes Web + miroir RN.
 *
 * Couvre :
 *  - 23 icônes Web exportées depuis `../icons` (loop liste attendue)
 *  - Chaque icône Web rend un <svg> avec viewBox "0 0 24 24"
 *  - Props `size` et `color` correctement appliqués (échantillon)
 *  - Default `aria-hidden="true"` quand pas d'`aria-label`
 *  - Avec `aria-label="…"` → `role="img"`
 *  - 23 fichiers RN miroir présents (file-system check, RN non chargeable Jest node)
 *  - Sub-exports `package.json` câblés vers `./icons/index.ts` + `./icons-rn/index.ts`
 *  - Tous les exports RN re-exportés dans `icons-rn/index.ts`
 *
 * Style : pas de `@testing-library/react` (composants Web purs SVG).
 *         On rend en appelant la FC directement et on inspecte l'élément React.
 */

import * as React from 'react';
import * as fs from 'fs';
import * as path from 'path';

// Web icon barrel — chargeable côté Jest node (pure React, pas de DOM/RN deps).
import * as IconsWeb from '../icons';

const EXPECTED_ICONS = [
  // Navigation (7)
  'IconHome',
  'IconCatalog',
  'IconProfile',
  'IconSearch',
  'IconSettings',
  'IconBack',
  'IconClose',
  // Lecture (6)
  'IconPlay',
  'IconPause',
  'IconSkipForward15',
  'IconSkipBack15',
  'IconDownload',
  'IconDownloaded',
  // État (6)
  'IconCheck',
  'IconLock',
  'IconAlert',
  'IconInfo',
  'IconGps',
  'IconOffline',
  // UI (5)
  'IconHeart',
  'IconShare',
  'IconMore',
  'IconChevron',
  'IconPlus',
] as const;

type AnyEl = React.ReactElement<Record<string, unknown>>;

function render<P>(Comp: React.FC<P>, props: P): AnyEl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Comp(props as any) as AnyEl;
}

describe('Icons Web — barrel export (AC1, AC8)', () => {
  it('exporte exactement 23 icônes', () => {
    const exported = Object.keys(IconsWeb).filter((k) => k.startsWith('Icon'));
    expect(exported.length).toBe(EXPECTED_ICONS.length);
  });

  it.each(EXPECTED_ICONS)('exporte %s', (name) => {
    expect(
      (IconsWeb as Record<string, unknown>)[name],
    ).toBeDefined();
    expect(
      typeof (IconsWeb as Record<string, unknown>)[name],
    ).toBe('function');
  });
});

describe('Icons Web — spec SVG uniforme (AC3, AC4)', () => {
  it.each(EXPECTED_ICONS)('%s rend un <svg> viewBox 24×24', (name) => {
    const Comp = (IconsWeb as Record<string, React.FC<Record<string, unknown>>>)[name];
    const el = render(Comp, {});
    expect(el.type).toBe('svg');
    expect(el.props.viewBox).toBe('0 0 24 24');
    expect(el.props.fill).toBe('none');
    expect(el.props.strokeWidth).toBe(1.5);
    expect(el.props.strokeLinecap).toBe('round');
    expect(el.props.strokeLinejoin).toBe('round');
  });

  it('default stroke = "currentColor" (AC4)', () => {
    const el = render(IconsWeb.IconHome, {});
    expect(el.props.stroke).toBe('currentColor');
  });
});

describe('Icons Web — props (AC2)', () => {
  it('size custom est propagée à width/height', () => {
    const el = render(IconsWeb.IconPlay, { size: 32 });
    expect(el.props.width).toBe(32);
    expect(el.props.height).toBe(32);
  });

  it('default size = 24', () => {
    const el = render(IconsWeb.IconClose, {});
    expect(el.props.width).toBe(24);
    expect(el.props.height).toBe(24);
  });

  it('color custom remplace currentColor', () => {
    const el = render(IconsWeb.IconHeart, { color: '#C1262A' });
    expect(el.props.stroke).toBe('#C1262A');
  });

  it('className et style transmis tel quel', () => {
    const el = render(IconsWeb.IconSearch, {
      className: 'my-icon',
      style: { opacity: 0.5 },
    });
    expect(el.props.className).toBe('my-icon');
    expect((el.props.style as React.CSSProperties).opacity).toBe(0.5);
  });
});

describe('Icons Web — accessibilité (AC2)', () => {
  it('sans aria-label → aria-hidden=true, pas de role', () => {
    const el = render(IconsWeb.IconChevron, {});
    expect(el.props['aria-hidden']).toBe(true);
    expect(el.props.role).toBeUndefined();
  });

  it('avec aria-label → role="img" + aria-label défini', () => {
    const el = render(IconsWeb.IconChevron, { 'aria-label': 'Suivant' });
    expect(el.props.role).toBe('img');
    expect(el.props['aria-label']).toBe('Suivant');
    expect(el.props['aria-hidden']).toBeUndefined();
  });
});

describe('Icons RN — fichiers miroir (AC7)', () => {
  // RN non chargeable Jest node → on valide via file-system, comme Pin/Button.
  it.each(EXPECTED_ICONS)(
    '%s a un fichier miroir RN dans icons-rn/',
    (name) => {
      // IconHome → Home.tsx, IconSkipForward15 → SkipForward15.tsx
      const file = name.replace(/^Icon/, '');
      const rnFile = path.join(
        __dirname,
        '..',
        'icons-rn',
        `${file}.tsx`,
      );
      expect(fs.existsSync(rnFile)).toBe(true);
    },
  );

  it('icons-rn/index.ts re-exporte les 23 icônes', () => {
    const rnIndex = fs.readFileSync(
      path.join(__dirname, '..', 'icons-rn', 'index.ts'),
      'utf8',
    );
    for (const name of EXPECTED_ICONS) {
      const file = name.replace(/^Icon/, '');
      expect(rnIndex).toMatch(
        new RegExp(`export \\{ ${name} \\} from '\\./${file}';`),
      );
    }
  });

  it('chaque miroir RN utilise react-native-svg', () => {
    for (const name of EXPECTED_ICONS) {
      const file = name.replace(/^Icon/, '');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'icons-rn', `${file}.tsx`),
        'utf8',
      );
      expect(src).toMatch(/from 'react-native-svg'/);
    }
  });
});

describe('package.json — sub-exports icons + icons-rn (AC8)', () => {
  it('exports map déclare ./icons et ./icons-rn', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
    );
    expect(pkg.exports['./icons']).toBeDefined();
    expect(pkg.exports['./icons'].default).toBe('./icons/index.ts');
    expect(pkg.exports['./icons-rn']).toBeDefined();
    expect(pkg.exports['./icons-rn'].default).toBe('./icons-rn/index.ts');
  });

  it('icons NE SONT PAS re-exportées depuis le default index.ts (perf NFR)', () => {
    const defaultIndex = fs.readFileSync(
      path.join(__dirname, '..', 'index.ts'),
      'utf8',
    );
    expect(defaultIndex).not.toMatch(/from '\.\/icons/);
    expect(defaultIndex).not.toMatch(/from '\.\/icons-rn/);
  });
});
