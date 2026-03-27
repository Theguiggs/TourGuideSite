import { useTranslationStore } from '../translation-store';

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/api/translation', () => ({
  getTranslationStatus: jest.fn(),
}));

describe('TranslationStore', () => {
  beforeEach(() => {
    useTranslationStore.getState().resetStore();
    jest.clearAllMocks();
  });

  describe('setSegmentStatus', () => {
    it('sets status for a segment', () => {
      useTranslationStore.getState().setSegmentStatus('seg-1', {
        status: 'processing',
        provider: 'deepl',
      });

      const state = useTranslationStore.getState().segments['seg-1'];
      expect(state).toBeDefined();
      expect(state.status).toBe('processing');
      expect(state.provider).toBe('deepl');
    });

    it('merges partial updates', () => {
      useTranslationStore.getState().setSegmentStatus('seg-1', {
        status: 'processing',
        provider: 'marianmt',
      });
      useTranslationStore.getState().setSegmentStatus('seg-1', {
        status: 'completed',
        translatedText: 'Hello world',
      });

      const state = useTranslationStore.getState().segments['seg-1'];
      expect(state.status).toBe('completed');
      expect(state.translatedText).toBe('Hello world');
      expect(state.provider).toBe('marianmt');
    });
  });

  describe('setCostEstimate', () => {
    it('stores cost estimate', () => {
      const estimate = {
        provider: 'deepl' as const,
        charCount: 500,
        costProvider: 1,
        costCharged: 3,
        isFree: false,
      };
      useTranslationStore.getState().setCostEstimate('seg-1', estimate);

      expect(useTranslationStore.getState().costEstimates['seg-1']).toEqual(estimate);
    });
  });

  describe('toast', () => {
    it('shows and auto-clears toast', () => {
      jest.useFakeTimers();
      useTranslationStore.getState().showToast('Test message');
      expect(useTranslationStore.getState().toastMessage).toBe('Test message');

      jest.advanceTimersByTime(5000);
      expect(useTranslationStore.getState().toastMessage).toBeNull();
      jest.useRealTimers();
    });
  });

  describe('polling', () => {
    it('starts and stops polling', () => {
      jest.useFakeTimers();
      useTranslationStore.getState().startPolling('seg-1', 'job-1');
      // Polling started — no error
      useTranslationStore.getState().stopPolling('seg-1');
      jest.useRealTimers();
    });

    it('stopAllPolling clears all timers', () => {
      jest.useFakeTimers();
      useTranslationStore.getState().startPolling('seg-1', 'job-1');
      useTranslationStore.getState().startPolling('seg-2', 'job-2');
      useTranslationStore.getState().stopAllPolling();
      jest.useRealTimers();
    });
  });

  describe('resetStore', () => {
    it('clears all state', () => {
      useTranslationStore.getState().setSegmentStatus('seg-1', { status: 'completed' });
      useTranslationStore.getState().showToast('test');
      useTranslationStore.getState().resetStore();

      expect(useTranslationStore.getState().segments).toEqual({});
      expect(useTranslationStore.getState().toastMessage).toBeNull();
    });
  });
});
