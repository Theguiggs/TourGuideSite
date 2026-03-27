import { requestTTS, getTTSStatus, __resetTTSStubs } from '../tts';

jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => true,
  shouldUseRealApi: () => false,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('TTSAPI', () => {
  beforeEach(() => {
    __resetTTSStubs();
  });

  describe('requestTTS', () => {
    it('returns processing status in stub mode', async () => {
      const result = await requestTTS('seg-1', 'Bonjour le monde', 'fr');
      expect(result.status).toBe('processing');
      expect(result.jobId).toMatch(/^tts-/);
      expect(result.language).toBe('fr');
      expect(result.audioKey).toBeNull();
    });

    it('sets correct language', async () => {
      const result = await requestTTS('seg-2', 'Hello world', 'en');
      expect(result.language).toBe('en');
    });
  });

  describe('getTTSStatus', () => {
    it('returns null for unknown job', async () => {
      const result = await getTTSStatus('unknown-job');
      expect(result).toBeNull();
    });

    it('returns processing before completion', async () => {
      const req = await requestTTS('seg-1', 'Test text', 'fr');
      const status = await getTTSStatus(req.jobId);
      expect(status).not.toBeNull();
      expect(status!.status).toBe('processing');
    });

    it('returns completed after delay with audio key', async () => {
      const req = await requestTTS('seg-1', 'Test text for TTS generation', 'en');

      // Wait for stub processing time (5s)
      await new Promise((r) => setTimeout(r, 5200));

      const status = await getTTSStatus(req.jobId);
      expect(status).not.toBeNull();
      expect(status!.status).toBe('completed');
      expect(status!.audioKey).toMatch(/\.wav$/);
      expect(status!.language).toBe('en');
      expect(status!.durationMs).toBeGreaterThan(0);
    }, 10000);
  });
});
