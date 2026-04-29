// Story 1.2 — Tokens TS : tests valeurs exactes + counts + snapshot.
// Source AC : _bmad-output/stories/1-2-tokens-ts-css.md (AC 1, 2, 3, 4, 8).

import {
  tg,
  tgColors,
  tgFontSize,
  tgEyebrow,
  tgTracking,
  tgRadius,
  tgSpace,
  tgShadow,
  type TgFontSizeKey,
} from '../tokens';

describe('tg.fontSize — échelle 11 niveaux (AC 1)', () => {
  it('expose exactement 11 clés', () => {
    expect(Object.keys(tg.fontSize)).toHaveLength(11);
  });

  it('contient les 11 clés camelCase attendues du brief §2.2', () => {
    const expected: TgFontSizeKey[] = [
      'eyebrow',
      'meta',
      'caption',
      'body',
      'bodyLg',
      'h6',
      'h5',
      'h4',
      'h3',
      'h2',
      'h1',
    ];
    for (const key of expected) {
      expect(tg.fontSize).toHaveProperty(key);
    }
  });

  it('valeurs numériques exactes (px) du brief §2.2', () => {
    expect(tg.fontSize.eyebrow).toBe(11);
    expect(tg.fontSize.meta).toBe(12);
    expect(tg.fontSize.caption).toBe(13);
    expect(tg.fontSize.body).toBe(14);
    expect(tg.fontSize.bodyLg).toBe(16);
    expect(tg.fontSize.h6).toBe(18);
    expect(tg.fontSize.h5).toBe(22);
    expect(tg.fontSize.h4).toBe(30);
    expect(tg.fontSize.h3).toBe(40);
    expect(tg.fontSize.h2).toBe(56);
    expect(tg.fontSize.h1).toBe(72);
  });

  it('ré-exporte aussi tgFontSize (constante autonome)', () => {
    expect(tgFontSize.h1).toBe(72);
    expect(tgFontSize).toBe(tg.fontSize);
  });
});

describe('tg — agrégat (AC 2)', () => {
  it('expose les 12 sous-objets attendus (colors..ease + motion + sound, Story 1.6)', () => {
    expect(tg.colors).toBeDefined();
    expect(tg.fonts).toBeDefined();
    expect(tg.fontSize).toBeDefined();
    expect(tg.tracking).toBeDefined();
    expect(tg.eyebrow).toBeDefined();
    expect(tg.space).toBeDefined();
    expect(tg.radius).toBeDefined();
    expect(tg.shadow).toBeDefined();
    expect(tg.duration).toBeDefined();
    expect(tg.ease).toBeDefined();
    expect(tg.motion).toBeDefined();
    expect(tg.sound).toBeDefined();
  });
});

describe('tg.colors — palette inchangée (AC 3)', () => {
  it('contient 23 couleurs exactes (4 surfaces + ink+4 opacités + line + ardoise + 4 accents×soft + 4 états)', () => {
    // Comptage Story 1.2 : 4 (paper/soft/deep/card) + 5 (ink/ink80/60/40/20)
    // + 2 (line/ardoise) + 8 (grenadine/ocre/mer/olive × soft) + 4 (états) = 23.
    expect(Object.keys(tg.colors).length).toBe(23);
  });

  it('grenadine signature = #C1262A', () => {
    expect(tg.colors.grenadine).toBe('#C1262A');
    expect(tgColors.grenadine).toBe('#C1262A');
  });

  it('paper = #F4ECDD (fond crème principal)', () => {
    expect(tg.colors.paper).toBe('#F4ECDD');
  });

  it('expose les 4 accents ville × variantes soft', () => {
    expect(tg.colors.grenadine).toBe('#C1262A');
    expect(tg.colors.grenadineSoft).toBe('#FBE5E2');
    expect(tg.colors.ocre).toBe('#C68B3E');
    expect(tg.colors.ocreSoft).toBe('#F5E4C7');
    expect(tg.colors.mer).toBe('#2B6E8A');
    expect(tg.colors.merSoft).toBe('#D7E5EC');
    expect(tg.colors.olive).toBe('#6B7A45');
    expect(tg.colors.oliveSoft).toBe('#E2E5D2');
  });
});

describe('tg.space — grille 4pt (AC 3)', () => {
  it('space[20] = 80 (max)', () => {
    expect(tg.space[20]).toBe(80);
    expect(tgSpace[20]).toBe(80);
  });

  it('space[1] = 4 (min, base de la grille)', () => {
    expect(tg.space[1]).toBe(4);
  });
});

describe('tg.radius — 5 niveaux (AC 3)', () => {
  it('radius.sm = 6, radius.md = 12, radius.lg = 18, radius.xl = 28, radius.pill = 999', () => {
    expect(tg.radius.sm).toBe(6);
    expect(tg.radius.md).toBe(12);
    expect(tg.radius.lg).toBe(18);
    expect(tg.radius.xl).toBe(28);
    expect(tg.radius.pill).toBe(999);
    expect(tgRadius.lg).toBe(18);
  });
});

describe('tg.shadow — 5 ombres + accent grenadine (AC 3)', () => {
  it('shadow.accent contient la lueur grenadine rgba(193, 38, 42, ...)', () => {
    expect(tg.shadow.accent).toContain('193, 38, 42');
    expect(tgShadow.accent).toContain('193, 38, 42');
  });
});

describe('tg.eyebrow — signature visuelle (AC 4)', () => {
  it('expose fontSize 11, letterSpacing 0.18em, fontWeight 700, textTransform uppercase', () => {
    expect(tg.eyebrow.fontSize).toBe(11);
    expect(tg.eyebrow.letterSpacing).toBe('0.18em');
    expect(tg.eyebrow.fontWeight).toBe(700);
    expect(tg.eyebrow.textTransform).toBe('uppercase');
    expect(tgEyebrow).toBe(tg.eyebrow);
  });

  it('cohérence : tg.eyebrow.fontSize === tg.fontSize.eyebrow', () => {
    expect(tg.eyebrow.fontSize).toBe(tg.fontSize.eyebrow);
  });

  it('cohérence : tg.eyebrow.letterSpacing === tg.tracking.eyebrow', () => {
    expect(tg.eyebrow.letterSpacing).toBe(tg.tracking.eyebrow);
  });
});

describe('tg.tracking — letter-spacing display + eyebrow', () => {
  it('display = -0.025em (resserrement DM Serif Display)', () => {
    expect(tg.tracking.display).toBe('-0.025em');
  });

  it('eyebrow = 0.18em (signature uppercase)', () => {
    expect(tg.tracking.eyebrow).toBe('0.18em');
  });
});

describe('tg — snapshot global (anti-drift, AC 8)', () => {
  it('matches snapshot complet', () => {
    expect(tg).toMatchSnapshot();
  });
});
