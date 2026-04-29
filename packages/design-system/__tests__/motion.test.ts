// Story 1.6 — Motion tokens + useMotion hook tests.
// Source AC : _bmad-output/stories/1-6-motion-sound-tokens.md (AC 1, 4, 5, 6).

import {
  tg,
  tgMotion,
  tgMotionDuration,
  tgMotionEasing,
  tgDuration,
  tgEase,
  type TgMotionDuration,
  type TgMotionEasing,
} from '../tokens';
import { useMotion } from '../use-motion';

describe('tgMotion — durations (AC 1)', () => {
  it('expose exactement 3 durations (lecture, promenade, tournepage)', () => {
    expect(Object.keys(tgMotion.duration)).toHaveLength(3);
    expect(tgMotion.duration).toHaveProperty('lecture');
    expect(tgMotion.duration).toHaveProperty('promenade');
    expect(tgMotion.duration).toHaveProperty('tournepage');
  });

  it('valeurs exactes en ms (lecture < promenade < tournepage)', () => {
    expect(tgMotion.duration.lecture).toBe(180);
    expect(tgMotion.duration.promenade).toBe(320);
    expect(tgMotion.duration.tournepage).toBe(500);
  });

  it('monotonie : lecture < promenade < tournepage (calme = ralenti)', () => {
    expect(tgMotion.duration.lecture).toBeLessThan(tgMotion.duration.promenade);
    expect(tgMotion.duration.promenade).toBeLessThan(tgMotion.duration.tournepage);
  });

  it('toutes les durations sont des nombres positifs', () => {
    const keys: TgMotionDuration[] = ['lecture', 'promenade', 'tournepage'];
    for (const key of keys) {
      expect(typeof tgMotion.duration[key]).toBe('number');
      expect(tgMotion.duration[key]).toBeGreaterThan(0);
    }
  });

  it('tgMotionDuration est la même référence que tgMotion.duration', () => {
    expect(tgMotionDuration).toBe(tgMotion.duration);
  });
});

describe('tgMotion — easings (AC 1)', () => {
  it('expose exactement 3 easings (flaner, descendre, arriver)', () => {
    expect(Object.keys(tgMotion.easing)).toHaveLength(3);
    expect(tgMotion.easing).toHaveProperty('flaner');
    expect(tgMotion.easing).toHaveProperty('descendre');
    expect(tgMotion.easing).toHaveProperty('arriver');
  });

  it('valeurs exactes cubic-bezier', () => {
    expect(tgMotion.easing.flaner).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)');
    expect(tgMotion.easing.descendre).toBe('cubic-bezier(0.42, 0, 0.58, 1)');
    expect(tgMotion.easing.arriver).toBe('cubic-bezier(0.0, 0, 0.2, 1)');
  });

  it('toutes les easings sont des cubic-bezier strings', () => {
    const keys: TgMotionEasing[] = ['flaner', 'descendre', 'arriver'];
    for (const key of keys) {
      expect(typeof tgMotion.easing[key]).toBe('string');
      expect(tgMotion.easing[key]).toMatch(/^cubic-bezier\(/);
    }
  });

  it('tgMotionEasing est la même référence que tgMotion.easing', () => {
    expect(tgMotionEasing).toBe(tgMotion.easing);
  });
});

describe('tg.motion — intégration aggregate (AC 4)', () => {
  it('tg.motion === tgMotion (référence partagée)', () => {
    expect(tg.motion).toBe(tgMotion);
  });

  it('tg.motion.duration et tg.motion.easing accessibles', () => {
    expect(tg.motion.duration.promenade).toBe(320);
    expect(tg.motion.easing.flaner).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)');
  });
});

describe('tgDuration / tgEase — compat ascendante (AC 4)', () => {
  it('tg.duration legacy toujours exposé (compat Story 1.1 POC)', () => {
    expect(tg.duration.fast).toBe(120);
    expect(tg.duration.base).toBe(200);
    expect(tg.duration.slow).toBe(320);
    expect(tgDuration.fast).toBe(120);
  });

  it('tg.ease legacy toujours exposé (compat Story 1.1 POC)', () => {
    expect(tg.ease.out).toBe('cubic-bezier(0.2, 0.8, 0.2, 1)');
    expect(tg.ease.smooth).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(tgEase.out).toBeDefined();
  });
});

describe('useMotion — hook utilitaire (AC 5)', () => {
  it('résout {duration, easing} pour la clé `promenade`', () => {
    const { duration, easing } = useMotion('promenade');
    expect(duration).toBe(320);
    expect(easing).toBe(tgMotion.easing.flaner);
  });

  it('résout {duration, easing} pour la clé `lecture`', () => {
    const { duration } = useMotion('lecture');
    expect(duration).toBe(180);
  });

  it('résout {duration, easing} pour la clé `tournepage`', () => {
    const { duration } = useMotion('tournepage');
    expect(duration).toBe(500);
  });

  it('easing par défaut = `flaner`', () => {
    const { easing } = useMotion('promenade');
    expect(easing).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)');
  });

  it('easing override via 2e argument', () => {
    const { easing } = useMotion('tournepage', 'arriver');
    expect(easing).toBe('cubic-bezier(0.0, 0, 0.2, 1)');
  });

  it('shape stable {duration: number, easing: string}', () => {
    const result = useMotion('lecture', 'descendre');
    expect(typeof result.duration).toBe('number');
    expect(typeof result.easing).toBe('string');
    expect(Object.keys(result).sort()).toEqual(['duration', 'easing']);
  });
});

describe('tgMotion — snapshot anti-drift', () => {
  it('matches snapshot complet', () => {
    expect(tgMotion).toMatchSnapshot();
  });
});
