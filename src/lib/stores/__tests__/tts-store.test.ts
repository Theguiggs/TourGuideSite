import { useTTSStore } from '../tts-store';

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/api/tts', () => ({
  getTTSStatus: jest.fn(),
}));

describe('TTSStore', () => {
  beforeEach(() => {
    useTTSStore.getState().resetStore();
    jest.clearAllMocks();
  });

  describe('setSegmentStatus', () => {
    it('sets status for a segment', () => {
      useTTSStore.getState().setSegmentStatus('seg-1', {
        status: 'processing',
        language: 'en',
      });

      const state = useTTSStore.getState().segments['seg-1'];
      expect(state.status).toBe('processing');
      expect(state.language).toBe('en');
    });

    it('merges partial updates', () => {
      useTTSStore.getState().setSegmentStatus('seg-1', {
        status: 'processing',
        language: 'en',
      });
      useTTSStore.getState().setSegmentStatus('seg-1', {
        status: 'completed',
        audioKey: 'tts/seg-1_en.wav',
        durationMs: 15000,
      });

      const state = useTTSStore.getState().segments['seg-1'];
      expect(state.status).toBe('completed');
      expect(state.audioKey).toBe('tts/seg-1_en.wav');
      expect(state.durationMs).toBe(15000);
      expect(state.language).toBe('en');
    });
  });

  describe('toast', () => {
    it('shows toast message', () => {
      useTTSStore.getState().showToast('Audio TTS ready');
      expect(useTTSStore.getState().toastMessage).toBe('Audio TTS ready');
    });

    it('auto-clears after 5s', () => {
      jest.useFakeTimers();
      useTTSStore.getState().showToast('Done');
      jest.advanceTimersByTime(5000);
      expect(useTTSStore.getState().toastMessage).toBeNull();
      jest.useRealTimers();
    });
  });

  describe('polling', () => {
    it('starts and stops without error', () => {
      jest.useFakeTimers();
      useTTSStore.getState().startPolling('seg-1', 'tts-job-1');
      useTTSStore.getState().stopPolling('seg-1');
      jest.useRealTimers();
    });
  });

  describe('resetStore', () => {
    it('clears all segments and toast', () => {
      useTTSStore.getState().setSegmentStatus('seg-1', { status: 'completed', audioKey: 'test.wav' });
      useTTSStore.getState().showToast('test');
      useTTSStore.getState().resetStore();

      expect(useTTSStore.getState().segments).toEqual({});
      expect(useTTSStore.getState().toastMessage).toBeNull();
    });
  });
});
