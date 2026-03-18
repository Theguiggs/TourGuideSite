import { useTranscriptionStore } from '../transcription-store';

describe('useTranscriptionStore', () => {
  beforeEach(() => {
    useTranscriptionStore.getState().resetStore();
  });

  it('starts with empty state', () => {
    const state = useTranscriptionStore.getState();
    expect(state.scenes).toEqual({});
    expect(state.quota).toBeNull();
    expect(state.toastMessage).toBeNull();
  });

  it('sets scene status', () => {
    useTranscriptionStore.getState().setSceneStatus('scene-1', { status: 'processing', jobId: 'job-1' });
    const scene = useTranscriptionStore.getState().scenes['scene-1'];
    expect(scene.status).toBe('processing');
    expect(scene.jobId).toBe('job-1');
  });

  it('updates existing scene status', () => {
    useTranscriptionStore.getState().setSceneStatus('scene-1', { status: 'processing' });
    useTranscriptionStore.getState().setSceneStatus('scene-1', { status: 'completed', transcriptText: 'Hello' });
    const scene = useTranscriptionStore.getState().scenes['scene-1'];
    expect(scene.status).toBe('completed');
    expect(scene.transcriptText).toBe('Hello');
  });

  it('sets quota', () => {
    useTranscriptionStore.getState().setQuota({
      usedMinutes: 50,
      limitMinutes: 120,
      remainingMinutes: 70,
      isWarning: false,
      isExceeded: false,
    });
    expect(useTranscriptionStore.getState().quota?.usedMinutes).toBe(50);
  });

  it('shows and auto-clears toast', () => {
    jest.useFakeTimers();
    useTranscriptionStore.getState().showToast('Test message');
    expect(useTranscriptionStore.getState().toastMessage).toBe('Test message');

    jest.advanceTimersByTime(5000);
    expect(useTranscriptionStore.getState().toastMessage).toBeNull();
    jest.useRealTimers();
  });

  it('clears toast manually', () => {
    useTranscriptionStore.getState().showToast('Test');
    useTranscriptionStore.getState().clearToast();
    expect(useTranscriptionStore.getState().toastMessage).toBeNull();
  });

  it('resets entire store', () => {
    useTranscriptionStore.getState().setSceneStatus('scene-1', { status: 'processing' });
    useTranscriptionStore.getState().setQuota({ usedMinutes: 50, limitMinutes: 120, remainingMinutes: 70, isWarning: false, isExceeded: false });
    useTranscriptionStore.getState().showToast('msg');

    useTranscriptionStore.getState().resetStore();
    const state = useTranscriptionStore.getState();
    expect(state.scenes).toEqual({});
    expect(state.quota).toBeNull();
    expect(state.toastMessage).toBeNull();
  });
});
