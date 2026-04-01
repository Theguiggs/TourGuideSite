import {
  getProviderForTier,
  getPriceForLanguage,
  isLanguagePremium,
} from '../provider-router';

describe('ProviderRouter', () => {
  describe('isLanguagePremium', () => {
    it('returns true for premium languages (ja, zh)', () => {
      expect(isLanguagePremium('ja')).toBe(true);
      expect(isLanguagePremium('zh')).toBe(true);
      expect(isLanguagePremium('ko')).toBe(true);
      expect(isLanguagePremium('ar')).toBe(true);
      expect(isLanguagePremium('pt')).toBe(true);
    });

    it('returns false for EU languages (en, es)', () => {
      expect(isLanguagePremium('en')).toBe(false);
      expect(isLanguagePremium('es')).toBe(false);
      expect(isLanguagePremium('de')).toBe(false);
      expect(isLanguagePremium('it')).toBe(false);
    });
  });

  describe('getProviderForTier', () => {
    it('returns marianmt for standard tier', () => {
      expect(getProviderForTier('standard')).toBe('marianmt');
    });

    it('returns deepl for pro tier', () => {
      expect(getProviderForTier('pro')).toBe('deepl');
    });
  });

  describe('getPriceForLanguage', () => {
    it('returns correct prices for EU languages', () => {
      const euStandard = getPriceForLanguage('en', 'standard', 'single');
      expect(euStandard).toEqual({ ok: true, value: 199 });

      const euPro = getPriceForLanguage('es', 'pro', 'single');
      expect(euPro).toEqual({ ok: true, value: 299 });

      const premiumPro = getPriceForLanguage('ja', 'pro', 'single');
      expect(premiumPro).toEqual({ ok: true, value: 499 });

      const freeFirst = getPriceForLanguage('en', 'standard', 'free_first');
      expect(freeFirst).toEqual({ ok: true, value: 0 });
    });

    it('returns error for premium + standard (invalid combination)', () => {
      const result = getPriceForLanguage('ja', 'standard', 'single');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(2609);
        expect(result.error.message).toContain('Premium');
      }
    });
  });
});
