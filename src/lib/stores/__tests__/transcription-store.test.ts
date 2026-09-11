import { useTranscriptionStore } from '../transcription-store';
import { useToastStore } from '../toast-store';

describe('useTranscriptionStore', () => {
  beforeEach(() => {
    useTranscriptionStore.getState().resetStore();
  });

  it('starts with empty state', () => {
    const state = useTranscriptionStore.getState();
    expect(state.scenes).toEqual({});
    expect(state.quota).toBeNull();
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

  it('délègue le toast au magasin partagé, qui l’efface seul', () => {
    jest.useFakeTimers();
    useToastStore.getState().clear();
    useTranscriptionStore.getState().showToast('Test message');
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(['Test message']);
    expect(useToastStore.getState().toasts[0].variant).toBe('success');
    jest.advanceTimersByTime(4000);
    expect(useToastStore.getState().toasts).toEqual([]);
    jest.useRealTimers();
  });

  it('resets entire store', () => {
    useTranscriptionStore.getState().setSceneStatus('scene-1', { status: 'processing' });
    useTranscriptionStore.getState().setQuota({ usedMinutes: 50, limitMinutes: 120, remainingMinutes: 70, isWarning: false, isExceeded: false });
    useTranscriptionStore.getState().showToast('msg');

    useTranscriptionStore.getState().resetStore();
    const state = useTranscriptionStore.getState();
    expect(state.scenes).toEqual({});
    expect(state.quota).toBeNull();
  });
});
