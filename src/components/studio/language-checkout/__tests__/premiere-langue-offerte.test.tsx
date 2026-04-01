/**
 * ML-2.5: Premiere langue offerte — unit tests for computeOrderTotal / isFreeFirstEligible
 *
 * Payment flow integration tests removed: payment/auto-translation moved to Scenes page.
 * These unit tests validate the pricing logic which is still used by PaymentSummary.
 */

import { computeOrderTotal, isFreeFirstEligible } from '../payment-summary';

// Mock provider-router
jest.mock('@/lib/multilang/provider-router', () => ({
  getPriceForLanguage: jest.fn().mockImplementation((lang: string, tier: string) => {
    const premium = ['ja', 'zh', 'ko', 'ar', 'pt'].includes(lang);
    if (premium) return { ok: true, value: 499 };
    const prices: Record<string, number> = { standard: 199, pro: 299 };
    return { ok: true, value: prices[tier] ?? 199 };
  }),
  isLanguagePremium: jest.fn().mockImplementation((lang: string) =>
    ['ja', 'zh', 'ko', 'ar', 'pt'].includes(lang),
  ),
  EU_LANGUAGES: ['en', 'es', 'de', 'it'],
  PREMIUM_LANGUAGES: ['ja', 'zh', 'ko', 'ar', 'pt'],
  PRICING_TABLE: [
    { purchaseType: 'single', qualityTier: 'standard', amountCents: 199 },
    { purchaseType: 'single', qualityTier: 'pro', amountCents: 299 },
    { purchaseType: 'pack_3', qualityTier: 'standard', amountCents: 499 },
    { purchaseType: 'pack_3', qualityTier: 'pro', amountCents: 699 },
    { purchaseType: 'free_first', qualityTier: 'standard', amountCents: 0 },
    { purchaseType: 'free_first', qualityTier: 'pro', amountCents: 0 },
  ],
}));

describe('ML-2.5: Premiere langue offerte — pricing logic', () => {
  // Test 6.1: premiere langue gratuite
  it('premiere gratuite — eligible, 1 langue: total 0', () => {
    expect(isFreeFirstEligible(false, 'standard')).toBe(true);
    expect(isFreeFirstEligible(false, 'pro')).toBe(false); // Pro tier: no free language

    const order = computeOrderTotal(['en'], 'standard', false);
    expect(order.totalCents).toBe(0);
    expect(order.lines).toHaveLength(1);
    expect(order.lines[0].purchaseType).toBe('free_first');
    expect(order.lines[0].priceCents).toBe(0);
  });

  // Test 6.2: deja utilisee
  it('deja utilisee — freeLanguageUsed=true: prix normal', () => {
    expect(isFreeFirstEligible(true, 'standard')).toBe(false);

    const order = computeOrderTotal(['en'], 'standard', true);
    expect(order.totalCents).toBe(199);
    expect(order.lines).toHaveLength(1);
    expect(order.lines[0].purchaseType).toBe('single');
    expect(order.lines[0].priceCents).toBe(199);
  });

  // Test 6.3: multi-langues avec gratuite
  it('multi-langues avec gratuite — premiere gratuite, deuxieme au prix, total = prix deuxieme', () => {
    const order = computeOrderTotal(['en', 'es'], 'standard', false);

    expect(order.lines[0].language).toBe('en');
    expect(order.lines[0].purchaseType).toBe('free_first');
    expect(order.lines[0].priceCents).toBe(0);

    expect(order.lines[1].language).toBe('es');
    expect(order.lines[1].purchaseType).toBe('single');
    expect(order.lines[1].priceCents).toBe(199);

    expect(order.totalCents).toBe(199);
  });

  // Test 6.5: Pro tier — NO free language
  it('pro tier — pas de langue gratuite meme si freeLanguageUsed=false', () => {
    expect(isFreeFirstEligible(false, 'pro')).toBe(false);

    const order = computeOrderTotal(['en'], 'pro', false);
    expect(order.totalCents).toBe(299);
    expect(order.lines).toHaveLength(1);
    expect(order.lines[0].purchaseType).toBe('single');
    expect(order.lines[0].priceCents).toBe(299);

    const orderPremium = computeOrderTotal(['ja'], 'pro', false);
    expect(orderPremium.totalCents).toBe(499);
    expect(orderPremium.lines[0].purchaseType).toBe('single');
  });
});
