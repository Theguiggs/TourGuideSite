import { useRecordingStore } from '../recording-store';

describe('useRecordingStore', () => {
  beforeEach(() => {
    useRecordingStore.getState().resetStore();
  });

  it('starts in idle state', () => {
    const state = useRecordingStore.getState();
    expect(state.recorderState).toBe('idle');
    expect(state.devices).toEqual([]);
    expect(state.takes).toEqual({});
  });

  it('sets recorder state', () => {
    useRecordingStore.getState().setRecorderState('recording');
    expect(useRecordingStore.getState().recorderState).toBe('recording');
  });

  it('sets devices', () => {
    useRecordingStore.getState().setDevices([
      { deviceId: 'mic-1', label: 'Built-in Mic' },
      { deviceId: 'mic-2', label: 'USB Mic' },
    ]);
    expect(useRecordingStore.getState().devices).toHaveLength(2);
  });

  it('adds take and auto-selects first', () => {
    const blob = new Blob(['audio'], { type: 'audio/webm' });
    useRecordingStore.getState().addTake('scene-1', { blob, mimeType: 'audio/webm', durationMs: 5000 });

    const takes = useRecordingStore.getState().takes['scene-1'];
    expect(takes).toHaveLength(1);
    expect(takes[0].durationMs).toBe(5000);

    // Auto-selected
    expect(useRecordingStore.getState().selectedTakeId['scene-1']).toBe(takes[0].id);
  });

  it('adds multiple takes without changing selection', () => {
    const blob1 = new Blob(['a'], { type: 'audio/webm' });
    const blob2 = new Blob(['b'], { type: 'audio/webm' });

    useRecordingStore.getState().addTake('scene-1', { blob: blob1, mimeType: 'audio/webm', durationMs: 3000 });
    const firstId = useRecordingStore.getState().takes['scene-1'][0].id;

    useRecordingStore.getState().addTake('scene-1', { blob: blob2, mimeType: 'audio/webm', durationMs: 4000 });

    expect(useRecordingStore.getState().takes['scene-1']).toHaveLength(2);
    // First take still selected
    expect(useRecordingStore.getState().selectedTakeId['scene-1']).toBe(firstId);
  });

  it('selects a specific take', () => {
    const blob1 = new Blob(['a'], { type: 'audio/webm' });
    const blob2 = new Blob(['b'], { type: 'audio/webm' });

    useRecordingStore.getState().addTake('scene-1', { blob: blob1, mimeType: 'audio/webm', durationMs: 3000 });
    useRecordingStore.getState().addTake('scene-1', { blob: blob2, mimeType: 'audio/webm', durationMs: 4000 });

    const secondId = useRecordingStore.getState().takes['scene-1'][1].id;
    useRecordingStore.getState().selectTake('scene-1', secondId);

    expect(useRecordingStore.getState().selectedTakeId['scene-1']).toBe(secondId);
  });

  it('deletes a take and updates selection', () => {
    const blob1 = new Blob(['a'], { type: 'audio/webm' });
    const blob2 = new Blob(['b'], { type: 'audio/webm' });

    useRecordingStore.getState().addTake('scene-1', { blob: blob1, mimeType: 'audio/webm', durationMs: 3000 });
    useRecordingStore.getState().addTake('scene-1', { blob: blob2, mimeType: 'audio/webm', durationMs: 4000 });

    const firstId = useRecordingStore.getState().takes['scene-1'][0].id;
    const secondId = useRecordingStore.getState().takes['scene-1'][1].id;

    // Select first, then delete it
    useRecordingStore.getState().selectTake('scene-1', firstId);
    useRecordingStore.getState().deleteTake('scene-1', firstId);

    expect(useRecordingStore.getState().takes['scene-1']).toHaveLength(1);
    // Selection falls back to remaining take
    expect(useRecordingStore.getState().selectedTakeId['scene-1']).toBe(secondId);
  });

  it('getSceneTakes returns empty array for unknown scene', () => {
    expect(useRecordingStore.getState().getSceneTakes('unknown')).toEqual([]);
  });

  it('getSelectedTake returns null when no takes', () => {
    expect(useRecordingStore.getState().getSelectedTake('unknown')).toBeNull();
  });

  it('resets store', () => {
    useRecordingStore.getState().addTake('scene-1', { blob: new Blob(), mimeType: 'audio/webm', durationMs: 1000 });
    useRecordingStore.getState().setRecorderState('recording');
    useRecordingStore.getState().resetStore();

    const state = useRecordingStore.getState();
    expect(state.recorderState).toBe('idle');
    expect(state.takes).toEqual({});
  });
});
