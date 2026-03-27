import { estimateCost, __resetTranslationStubs } from '../translation';

jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => true,
  shouldUseRealApi: () => false,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('Translation Billing', () => {
  beforeEach(() => {
    __resetTranslationStubs();
  });

  describe('MarianMT (gratuit)', () => {
    it('costProvider is 0 for marianmt', async () => {
      const cost = await estimateCost('Texte quelconque', 'marianmt');
      expect(cost.costProvider).toBe(0);
    });

    it('costCharged is 0 for marianmt', async () => {
      const cost = await estimateCost('Texte quelconque', 'marianmt');
      expect(cost.costCharged).toBe(0);
    });

    it('isFree is true for marianmt', async () => {
      const cost = await estimateCost('N\'importe quel texte', 'marianmt');
      expect(cost.isFree).toBe(true);
    });

    it('charCount matches text length for marianmt', async () => {
      const text = 'Bonjour le monde';
      const cost = await estimateCost(text, 'marianmt');
      expect(cost.charCount).toBe(text.length);
    });
  });

  describe('DeepL (premium)', () => {
    it('costCharged = costProvider × 3 (marge x3)', async () => {
      const cost = await estimateCost('A'.repeat(5000), 'deepl');
      expect(cost.isFree).toBe(false);
      expect(cost.costProvider).toBeGreaterThan(0);
      expect(cost.costCharged).toBe(cost.costProvider * 3);
    });

    it('costProvider scales with text length', async () => {
      const short = await estimateCost('A'.repeat(100), 'deepl');
      const long = await estimateCost('A'.repeat(10000), 'deepl');
      expect(long.costProvider).toBeGreaterThan(short.costProvider);
    });

    it('charCount matches text length', async () => {
      const text = 'X'.repeat(2500);
      const cost = await estimateCost(text, 'deepl');
      expect(cost.charCount).toBe(2500);
    });

    it('cost is integer centimes (Math.ceil)', async () => {
      const cost = await estimateCost('A'.repeat(1), 'deepl');
      expect(Number.isInteger(cost.costProvider)).toBe(true);
      expect(Number.isInteger(cost.costCharged)).toBe(true);
    });
  });

  describe('OpenAI (premium+)', () => {
    it('costCharged = costProvider × 3 (marge x3)', async () => {
      const cost = await estimateCost('A'.repeat(5000), 'openai');
      expect(cost.isFree).toBe(false);
      expect(cost.costProvider).toBeGreaterThan(0);
      expect(cost.costCharged).toBe(cost.costProvider * 3);
    });

    it('OpenAI is more expensive than DeepL per character', async () => {
      const deepl = await estimateCost('A'.repeat(10000), 'deepl');
      const openai = await estimateCost('A'.repeat(10000), 'openai');
      expect(openai.costProvider).toBeGreaterThan(deepl.costProvider);
    });

    it('charCount matches text length', async () => {
      const text = 'Y'.repeat(3000);
      const cost = await estimateCost(text, 'openai');
      expect(cost.charCount).toBe(3000);
    });
  });

  describe('Cross-provider comparisons', () => {
    it('marianmt is always free regardless of text length', async () => {
      const cost1k = await estimateCost('A'.repeat(1000), 'marianmt');
      const cost50k = await estimateCost('A'.repeat(50000), 'marianmt');
      expect(cost1k.costCharged).toBe(0);
      expect(cost50k.costCharged).toBe(0);
    });

    it('margin multiplier is consistent (x3) for all premium providers', async () => {
      const text = 'A'.repeat(5000);
      const deepl = await estimateCost(text, 'deepl');
      const openai = await estimateCost(text, 'openai');

      // Both use x3 margin
      expect(deepl.costCharged / deepl.costProvider).toBe(3);
      expect(openai.costCharged / openai.costProvider).toBe(3);
    });

    it('provider field matches request', async () => {
      const m = await estimateCost('Test', 'marianmt');
      const d = await estimateCost('Test', 'deepl');
      const o = await estimateCost('Test', 'openai');
      expect(m.provider).toBe('marianmt');
      expect(d.provider).toBe('deepl');
      expect(o.provider).toBe('openai');
    });
  });
});
