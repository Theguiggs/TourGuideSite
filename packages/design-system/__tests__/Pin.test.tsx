// Story 2.4 — Tests Pin + PinNegatif (Web).
// Sans dépendance @testing-library/react ni react-dom : on inspecte
// directement l'arbre React produit (`React.createElement` retourne un
// élément avec `type`, `props`, `children`). Suffisant pour des SVG purs.

import * as React from 'react';
import { Pin, PinNegatif } from '../components/Pin';
import { tgColors } from '../tokens';

type AnyEl = React.ReactElement<Record<string, any>>;

/** Rend un composant fonctionnel et retourne l'élément React produit. */
function render<P>(Comp: React.FC<P>, props: P): AnyEl {
  return Comp(props as any) as AnyEl;
}

/** Aplati un arbre React (children imbriqués, fragments) en liste plate. */
function flatten(node: any): any[] {
  if (node == null || typeof node !== 'object') return [];
  const out: any[] = [];
  const visit = (n: any) => {
    if (n == null) return;
    if (Array.isArray(n)) {
      n.forEach(visit);
      return;
    }
    if (typeof n !== 'object') return;
    out.push(n);
    if (n.props && n.props.children !== undefined) {
      visit(n.props.children);
    }
  };
  visit(node);
  return out;
}

/** Premier descendant matchant `type`. */
function findByType(node: AnyEl, type: string): any | undefined {
  return flatten(node).find((n) => n && n.type === type);
}

/** Tous les descendants matchant `type`. */
function findAllByType(node: AnyEl, type: string): any[] {
  return flatten(node).filter((n) => n && n.type === type);
}

describe('<Pin> Web (AC1, AC2, AC3)', () => {
  it('AC1 — taille par défaut, path grenadine, dot paper', () => {
    const el = render(Pin, { size: 24 });
    expect(el.type).toBe('svg');
    expect(el.props.width).toBe(24);
    expect(el.props.height).toBe(24);
    expect(el.props.viewBox).toBe('0 0 32 32');
    const path = findByType(el, 'path');
    expect(path.props.fill).toBe(tgColors.grenadine);
    const circle = findByType(el, 'circle');
    expect(circle.props.fill).toBe(tgColors.paper);
  });

  it('AC1 — role=presentation par défaut, role=img si aria-label', () => {
    const a = render(Pin, {}) as AnyEl;
    expect(a.props.role).toBe('presentation');
    const b = render(Pin, { 'aria-label': 'Marqueur' } as any) as AnyEl;
    expect(b.props.role).toBe('img');
    expect(b.props['aria-label']).toBe('Marqueur');
  });

  it('AC3 — color="grenadine" résout en #C1262A', () => {
    const el = render(Pin, { color: 'grenadine' });
    const path = findByType(el, 'path');
    expect(path.props.fill).toBe('#C1262A');
  });

  it('AC3 — color="ocre" résout en #C68B3E', () => {
    const el = render(Pin, { color: 'ocre' });
    const path = findByType(el, 'path');
    expect(path.props.fill).toBe(tgColors.ocre);
    expect(path.props.fill).toBe('#C68B3E');
  });

  it('AC3 — color="mer" résout en #2B6E8A', () => {
    const el = render(Pin, { color: 'mer' });
    const path = findByType(el, 'path');
    expect(path.props.fill).toBe(tgColors.mer);
    expect(path.props.fill).toBe('#2B6E8A');
  });

  it('AC3 — color="olive" résout en #6B7A45', () => {
    const el = render(Pin, { color: 'olive' });
    const path = findByType(el, 'path');
    expect(path.props.fill).toBe(tgColors.olive);
    expect(path.props.fill).toBe('#6B7A45');
  });

  it('AC3 — color="#FF0000" hex pass-through (cas non-clé tgColors)', () => {
    const el = render(Pin, { color: '#FF0000' });
    const path = findByType(el, 'path');
    expect(path.props.fill).toBe('#FF0000');
  });

  it('AC2 — label="7" rend un <text> avec contenu "7" en font display', () => {
    const el = render(Pin, { label: '7' });
    const text = findByType(el, 'text');
    expect(text).toBeDefined();
    expect(text.props.fontFamily).toContain('DM Serif Display');
    // contenu : children du <text>
    const children = text.props.children;
    const value = Array.isArray(children) ? children.join('') : children;
    expect(String(value)).toBe('7');
    // cercle paper de label (rayon 5.5)
    const circles = findAllByType(el, 'circle');
    const labelCircle = circles.find((c) => String(c.props.r) === '5.5');
    expect(labelCircle).toBeDefined();
    expect(labelCircle.props.fill).toBe(tgColors.paper);
  });
});

describe('<PinNegatif> Web (AC4, AC5)', () => {
  it('AC4 — bg=grenadine fg=paper rendu container + svg + rect/path/circle', () => {
    const el = render(PinNegatif, { size: 1024, bg: 'grenadine', fg: 'paper', rounded: false });
    expect(el.type).toBe('div');
    expect(el.props.style.width).toBe(1024);
    expect(el.props.style.height).toBe(1024);
    const svg = findByType(el, 'svg');
    expect(svg.props.viewBox).toBe('0 0 220 220');
    const rect = findByType(el, 'rect');
    expect(rect.props.fill).toBe(tgColors.grenadine);
    const path = findByType(el, 'path');
    expect(path.props.fill).toBe(tgColors.paper);
    const circle = findByType(el, 'circle');
    expect(circle.props.fill).toBe(tgColors.grenadine);
  });

  it('AC5 — rounded=false → borderRadius 0 (carré net)', () => {
    const el = render(PinNegatif, { size: 200, rounded: false });
    expect(el.props.style.borderRadius).toBe(0);
  });

  it('AC5 — rounded=true → borderRadius = size * 0.225 (default iOS)', () => {
    const size = 200;
    const el = render(PinNegatif, { size, rounded: true });
    expect(el.props.style.borderRadius).toBeCloseTo(size * 0.225, 5);
  });

  it('AC5 — rounded=number → borderRadius = size * ratio direct', () => {
    const size = 100;
    const el = render(PinNegatif, { size, rounded: 0.5 });
    expect(el.props.style.borderRadius).toBe(50);
  });

  it('AC3 — bg="#FF0000" hex pass-through', () => {
    const el = render(PinNegatif, { bg: '#FF0000' });
    const rect = findByType(el, 'rect');
    expect(rect.props.fill).toBe('#FF0000');
  });
});

describe('Snapshot', () => {
  it('<Pin size=48 label="3" color="grenadine" /> arbre stable', () => {
    const el = render(Pin, { size: 48, label: '3', color: 'grenadine' });
    expect(el).toMatchSnapshot();
  });
});
