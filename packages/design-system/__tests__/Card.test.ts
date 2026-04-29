// Story 2.3 — Tests Card (constants Web + constants RN, pure-logic).
// Source AC : _bmad-output/stories/2-3-card-component.md (AC 1-9).
//
// Tests `node` env compatibles : on importe **uniquement** les modules
// `Card.constants.ts` (Web + RN), 100 % TS pur sans JSX ni `react/jsx-runtime`,
// pour vérifier la cohérence des maps shadow / elevation vis-à-vis des tokens.
//
// Le package DS n'a pas `react` en devDeps (peer-dep consumer) ; importer
// `Card.tsx` (Web ou RN) ferait échouer ts-jest sur la résolution
// `react/jsx-runtime`. Les tests rendering DOM/RN vivent au niveau consumer
// (TourGuideWeb / TourGuideApp), cf. AC 8 deferred Story 5.x.

import {
  CARD_SHADOW_MAP,
  CARD_DEFAULT_VARIANT,
  type CardVariant,
} from '../components/Card.constants';
import {
  CARD_ELEVATION_MAP,
  CARD_IOS_SHADOW_MAP,
} from '../components-rn/Card.constants';
import { tgShadow, tgColors } from '../tokens';

describe('CARD_SHADOW_MAP — no-drift vs tokens (AC 3)', () => {
  it('flat = "none"', () => {
    expect(CARD_SHADOW_MAP.flat).toBe('none');
  });

  it('sm/md/lg pointent vers tgShadow.sm/md/lg (référence stricte, no drift)', () => {
    expect(CARD_SHADOW_MAP.sm).toBe(tgShadow.sm);
    expect(CARD_SHADOW_MAP.md).toBe(tgShadow.md);
    expect(CARD_SHADOW_MAP.lg).toBe(tgShadow.lg);
  });

  it('expose exactement 4 variants', () => {
    const keys: CardVariant[] = ['flat', 'sm', 'md', 'lg'];
    expect(Object.keys(CARD_SHADOW_MAP).sort()).toEqual([...keys].sort());
  });

  it('default variant = "md" (AC 1, 3)', () => {
    expect(CARD_DEFAULT_VARIANT).toBe('md');
  });
});

describe('CARD_ELEVATION_MAP (RN Android) — convention 0/1/4/12 (AC 7)', () => {
  it('flat = 0', () => {
    expect(CARD_ELEVATION_MAP.flat).toBe(0);
  });

  it('sm = 1', () => {
    expect(CARD_ELEVATION_MAP.sm).toBe(1);
  });

  it('md = 4 (default, elevation visible)', () => {
    expect(CARD_ELEVATION_MAP.md).toBe(4);
  });

  it('lg = 12 (elevation Android non-nulle, AC 7 explicit)', () => {
    expect(CARD_ELEVATION_MAP.lg).toBe(12);
  });
});

describe('CARD_IOS_SHADOW_MAP (RN iOS) — chiffres extraits de tgShadow (AC 7)', () => {
  it('flat — pas d\'ombre (opacity 0)', () => {
    expect(CARD_IOS_SHADOW_MAP.flat.shadowOpacity).toBe(0);
    expect(CARD_IOS_SHADOW_MAP.flat.shadowRadius).toBe(0);
    expect(CARD_IOS_SHADOW_MAP.flat.shadowOffset).toEqual({ width: 0, height: 0 });
  });

  it('sm — offsetY 1, radius 2, opacity 0.06', () => {
    expect(CARD_IOS_SHADOW_MAP.sm.shadowOffset).toEqual({ width: 0, height: 1 });
    expect(CARD_IOS_SHADOW_MAP.sm.shadowRadius).toBe(2);
    expect(CARD_IOS_SHADOW_MAP.sm.shadowOpacity).toBe(0.06);
  });

  it('md — offsetY 4, radius 12, opacity 0.08 (default)', () => {
    expect(CARD_IOS_SHADOW_MAP.md.shadowOffset).toEqual({ width: 0, height: 4 });
    expect(CARD_IOS_SHADOW_MAP.md.shadowRadius).toBe(12);
    expect(CARD_IOS_SHADOW_MAP.md.shadowOpacity).toBe(0.08);
  });

  it('lg — offsetY 12, radius 28, opacity 0.14', () => {
    expect(CARD_IOS_SHADOW_MAP.lg.shadowOffset).toEqual({ width: 0, height: 12 });
    expect(CARD_IOS_SHADOW_MAP.lg.shadowRadius).toBe(28);
    expect(CARD_IOS_SHADOW_MAP.lg.shadowOpacity).toBe(0.14);
  });

  it('shadowColor = tgColors.ink (#102A43) pour tous les variants', () => {
    (['flat', 'sm', 'md', 'lg'] as CardVariant[]).forEach((v) => {
      expect(CARD_IOS_SHADOW_MAP[v].shadowColor).toBe(tgColors.ink);
    });
  });
});
