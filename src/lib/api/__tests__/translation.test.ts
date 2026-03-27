import {
  requestTranslation,
  getTranslationStatus,
  estimateCost,
  checkMicroserviceHealth,
  __resetTranslationStubs,
  __setStubGpuDown,
} from '../translation';

// Force stub mode
jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => true,
  shouldUseRealApi: () => false,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('TranslationAPI', () => {
  beforeEach(() => {
    __resetTranslationStubs();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('requestTranslation', () => {
    it('returns processing status for marianmt', async () => {
      jest.useRealTimers();
      const result = await requestTranslation('seg-1', 'Bonjour le monde', 'fr', 'en', 'marianmt');
      expect(result.status).toBe('processing');
      expect(result.jobId).toMatch(/^trans-/);
      expect(result.provider).toBe('marianmt');
    });

    it('returns processing status for deepl', async () => {
      jest.useRealTimers();
      const result = await requestTranslation('seg-2', 'Bonjour', 'fr', 'en', 'deepl');
      expect(result.status).toBe('processing');
      expect(result.provider).toBe('deepl');
    });
  });

  describe('getTranslationStatus', () => {
    it('returns null for unknown job', () => {
      const result = getTranslationStatus('unknown-job');
      // It's async but in stub mode returns synchronously via promise
      expect(result).resolves.toBeNull();
    });

    it('returns completed after delay', async () => {
      jest.useRealTimers();
      const req = await requestTranslation('seg-1', 'Texte de test', 'fr', 'en', 'marianmt');

      // Wait for stub processing time (3s for marianmt)
      await new Promise((r) => setTimeout(r, 3200));

      const status = await getTranslationStatus(req.jobId);
      expect(status).not.toBeNull();
      expect(status!.status).toBe('completed');
      expect(status!.translatedText).toBeTruthy();
      expect(status!.costProvider).toBe(0); // marianmt is free
      expect(status!.costCharged).toBe(0);
    }, 10000);
  });

  describe('estimateCost', () => {
    it('returns free for marianmt', async () => {
      jest.useRealTimers();
      const cost = await estimateCost('Hello world', 'marianmt');
      expect(cost.isFree).toBe(true);
      expect(cost.costProvider).toBe(0);
      expect(cost.costCharged).toBe(0);
      expect(cost.charCount).toBe(11);
    });

    it('returns cost with margin for deepl', async () => {
      jest.useRealTimers();
      const cost = await estimateCost('A'.repeat(1000), 'deepl');
      expect(cost.isFree).toBe(false);
      expect(cost.costProvider).toBeGreaterThan(0);
      expect(cost.costCharged).toBe(cost.costProvider * 3); // x3 margin
      expect(cost.charCount).toBe(1000);
    });

    it('returns higher cost for openai', async () => {
      jest.useRealTimers();
      const costDeepL = await estimateCost('A'.repeat(1000), 'deepl');
      const costOpenAI = await estimateCost('A'.repeat(1000), 'openai');
      expect(costOpenAI.costProvider).toBeGreaterThan(costDeepL.costProvider);
    });
  });

  describe('checkMicroserviceHealth', () => {
    it('returns healthy by default', async () => {
      jest.useRealTimers();
      const health = await checkMicroserviceHealth();
      expect(health.tts).toBe(true);
      expect(health.translation).toBe(true);
    });

    it('returns gpu down when simulated', async () => {
      jest.useRealTimers();
      __setStubGpuDown(true);
      const health = await checkMicroserviceHealth();
      expect(health.tts).toBe(false);
      expect(health.translation).toBe(false);
    });
  });
});
