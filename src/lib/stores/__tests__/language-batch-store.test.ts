import {
  useLanguageBatchStore,
  selectOverallBatchProgress,
  selectBatchProgress,
  selectIsBatchRunning,
  estimateBatchDuration,
} from '../language-batch-store';

describe('useLanguageBatchStore', () => {
  beforeEach(() => {
    useLanguageBatchStore.getState().resetBatch();
  });

  it('initBatch initialises progress with correct total and idle status', () => {
    useLanguageBatchStore.getState().initBatch('en', 5);

    const progress = selectBatchProgress('en')(useLanguageBatchStore.getState());
    expect(progress).toEqual({
      total: 5,
      completed: 0,
      currentScene: null,
      status: 'idle',
      failedScenes: [],
    });
  });

  it('updateProgress increments completed and sets currentScene', () => {
    useLanguageBatchStore.getState().initBatch('es', 3);
    useLanguageBatchStore.getState().updateProgress('es', 'scene-intro');

    const progress = selectBatchProgress('es')(useLanguageBatchStore.getState());
    expect(progress?.completed).toBe(1);
    expect(progress?.currentScene).toBe('scene-intro');
    expect(progress?.status).toBe('running');
  });

  it('markFailed adds sceneId to failedScenes and sets status to failed', () => {
    useLanguageBatchStore.getState().initBatch('de', 4);
    useLanguageBatchStore.getState().markFailed('de', 'scene-3');

    const progress = selectBatchProgress('de')(useLanguageBatchStore.getState());
    expect(progress?.failedScenes).toEqual(['scene-3']);
    expect(progress?.status).toBe('failed');
  });

  it('selectOverallBatchProgress calculates global percentage across multiple langs', () => {
    useLanguageBatchStore.getState().initBatch('en', 4);
    useLanguageBatchStore.getState().initBatch('es', 4);
    // en: 2/4, es: 1/4 => 3/8 = 37.5% => 38%
    useLanguageBatchStore.getState().updateProgress('en', 'scene-1');
    useLanguageBatchStore.getState().updateProgress('en', 'scene-2');
    useLanguageBatchStore.getState().updateProgress('es', 'scene-1');

    const overall = selectOverallBatchProgress(useLanguageBatchStore.getState());
    expect(overall.totalScenes).toBe(8);
    expect(overall.completedScenes).toBe(3);
    expect(overall.percentage).toBe(38);
  });

  it('selectIsBatchRunning returns true when any lang is running or idle', () => {
    useLanguageBatchStore.getState().initBatch('en', 2);
    expect(selectIsBatchRunning(useLanguageBatchStore.getState())).toBe(true);

    useLanguageBatchStore.getState().markCompleted('en');
    expect(selectIsBatchRunning(useLanguageBatchStore.getState())).toBe(false);
  });

  it('estimateBatchDuration returns scenes * langs * 5 seconds', () => {
    expect(estimateBatchDuration(12, 3)).toBe(180);
    expect(estimateBatchDuration(1, 1)).toBe(5);
  });
});
