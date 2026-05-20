import { computeMixedOrder, effectiveTierFor, type LangSelections } from '../language-pricing';

describe('effectiveTierFor', () => {
  it('manual stays manual', () => {
    expect(effectiveTierFor('en', 'manual')).toBe('manual');
  });
  it('EU standard stays standard', () => {
    expect(effectiveTierFor('en', 'standard')).toBe('standard');
  });
  it('premium standard is coerced to pro', () => {
    expect(effectiveTierFor('ja', 'standard')).toBe('pro');
  });
  it('premium pro stays pro', () => {
    expect(effectiveTierFor('zh', 'pro')).toBe('pro');
  });
});

describe('computeMixedOrder', () => {
  it('empty selection → 0', () => {
    const order = computeMixedOrder({}, false);
    expect(order.totalCents).toBe(0);
    expect(order.lines).toHaveLength(0);
  });

  it('manual only → free', () => {
    const order = computeMixedOrder({ en: 'manual', es: 'manual' }, true);
    expect(order.totalCents).toBe(0);
    expect(order.lines.every((l) => l.billing === 'manual')).toBe(true);
  });

  it('single EU standard, free not used → free_first', () => {
    const order = computeMixedOrder({ en: 'standard' }, false);
    expect(order.totalCents).toBe(0);
    expect(order.lines[0].billing).toBe('free_first');
  });

  it('single EU standard, free already used → 1,99€', () => {
    const order = computeMixedOrder({ en: 'standard' }, true);
    expect(order.totalCents).toBe(199);
    expect(order.lines[0].billing).toBe('single');
  });

  it('mix manual + auto: en manual, ja pro → only ja billed', () => {
    const order: LangSelections = { en: 'manual', ja: 'pro' };
    const result = computeMixedOrder(order, true);
    expect(result.totalCents).toBe(499); // premium pro
    const enLine = result.lines.find((l) => l.language === 'en');
    const jaLine = result.lines.find((l) => l.language === 'ja');
    expect(enLine?.billing).toBe('manual');
    expect(jaLine?.priceCents).toBe(499);
  });

  it('premium standard is billed as pro (499)', () => {
    const order = computeMixedOrder({ ja: 'standard' }, true);
    expect(order.lines[0].effectiveTier).toBe('pro');
    expect(order.totalCents).toBe(499);
  });

  it('3 paid EU standard → pack_3 (499) when free already used', () => {
    const order = computeMixedOrder({ en: 'standard', es: 'standard', de: 'standard' }, true);
    expect(order.totalCents).toBe(499);
    expect(order.lines.filter((l) => l.billing === 'pack_3')).toHaveLength(3);
  });

  it('3 EU standard with free_first → free + 2 singles = 398', () => {
    const order = computeMixedOrder({ en: 'standard', es: 'standard', de: 'standard' }, false);
    // free (0) + 199 + 199 = 398 (cheaper than pack_3 at 499)
    expect(order.totalCents).toBe(398);
    expect(order.lines.find((l) => l.billing === 'free_first')).toBeTruthy();
  });

  it('all 4 EU + 3 premium in auto → Pack Toutes 12,99€', () => {
    const order = computeMixedOrder(
      { en: 'standard', es: 'standard', de: 'standard', it: 'standard', ja: 'pro', zh: 'pro', pt: 'pro' },
      true,
    );
    expect(order.packAllApplied).toBe(true);
    expect(order.totalCents).toBe(1299);
    expect(order.lines.every((l) => l.billing === 'pack_all')).toBe(true);
  });

  it('Pack Toutes applies even with mixed EU tiers (some pro)', () => {
    const order = computeMixedOrder(
      { en: 'pro', es: 'standard', de: 'standard', it: 'standard', ja: 'pro', zh: 'pro', pt: 'pro' },
      true,
    );
    expect(order.packAllApplied).toBe(true);
    expect(order.totalCents).toBe(1299);
  });

  it('Pack Toutes NOT applied if one language is manual', () => {
    const order = computeMixedOrder(
      { en: 'manual', es: 'standard', de: 'standard', it: 'standard', ja: 'pro', zh: 'pro', pt: 'pro' },
      true,
    );
    expect(order.packAllApplied).toBe(false);
  });

  it('hints how many languages remain for Pack Toutes', () => {
    // 6 auto, missing 1 (it) → hint = 1
    const order = computeMixedOrder(
      { en: 'standard', es: 'standard', de: 'standard', ja: 'pro', zh: 'pro', pt: 'pro' },
      true,
    );
    expect(order.packAllMissing).toBe(1);
  });
});
