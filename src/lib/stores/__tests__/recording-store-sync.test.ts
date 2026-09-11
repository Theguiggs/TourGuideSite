/**
 * Une prise n'existe d'abord que dans l'onglet. Le store doit le DIRE, pour que
 * la page sache ne pas se vider et que le garde de fermeture puisse avertir.
 */

import { useRecordingStore } from '../recording-store';

const result = (ms = 1000) => ({
  blob: new Blob(['audio'], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  durationMs: ms,
});

beforeEach(() => {
  useRecordingStore.getState().resetStore();
});

describe('take sync state', () => {
  it('starts every take as pending — nothing has left the tab yet', () => {
    const takeId = useRecordingStore.getState().addTake('scene-a', result());

    const take = useRecordingStore.getState().takes['scene-a'][0];
    expect(take.id).toBe(takeId);
    expect(take.syncState).toBe('pending');
    expect(take.s3Key).toBeUndefined();
  });

  it('returns the new take id so the caller can follow it to persistence', () => {
    const takeId = useRecordingStore.getState().addTake('scene-a', result());
    expect(typeof takeId).toBe('string');
    expect(takeId).toMatch(/^take-/);
  });

  it('records the S3 key on success', () => {
    const takeId = useRecordingStore.getState().addTake('scene-a', result());

    useRecordingStore.getState().markTakeSync('scene-a', takeId, { syncState: 'synced', s3Key: 'key-1' });

    const take = useRecordingStore.getState().takes['scene-a'][0];
    expect(take.syncState).toBe('synced');
    expect(take.s3Key).toBe('key-1');
  });

  it('clears a stale error when the take is retried', () => {
    const takeId = useRecordingStore.getState().addTake('scene-a', result());
    useRecordingStore.getState().markTakeSync('scene-a', takeId, { syncState: 'error', error: 'réseau' });

    useRecordingStore.getState().markTakeSync('scene-a', takeId, { syncState: 'uploading' });

    const take = useRecordingStore.getState().takes['scene-a'][0];
    expect(take.error).toBeUndefined();
  });

  it('ignores a mark for a take that no longer exists', () => {
    useRecordingStore.getState().addTake('scene-a', result());
    expect(() =>
      useRecordingStore.getState().markTakeSync('scene-a', 'take-inconnue', { syncState: 'synced' }),
    ).not.toThrow();
    expect(useRecordingStore.getState().takes['scene-a']).toHaveLength(1);
  });
});

describe('hasUnsyncedTakes', () => {
  it('is false when there is nothing to lose', () => {
    expect(useRecordingStore.getState().hasUnsyncedTakes()).toBe(false);
  });

  it('is true while a take is pending, uploading or in error', () => {
    const takeId = useRecordingStore.getState().addTake('scene-a', result());
    expect(useRecordingStore.getState().hasUnsyncedTakes()).toBe(true);

    for (const state of ['uploading', 'error'] as const) {
      useRecordingStore.getState().markTakeSync('scene-a', takeId, { syncState: state });
      expect(useRecordingStore.getState().hasUnsyncedTakes()).toBe(true);
    }
  });

  it('is false once every take across every scene is synced', () => {
    const a = useRecordingStore.getState().addTake('scene-a', result());
    const b = useRecordingStore.getState().addTake('scene-b', result());

    useRecordingStore.getState().markTakeSync('scene-a', a, { syncState: 'synced', s3Key: 'k1' });
    expect(useRecordingStore.getState().hasUnsyncedTakes()).toBe(true);

    useRecordingStore.getState().markTakeSync('scene-b', b, { syncState: 'synced', s3Key: 'k2' });
    expect(useRecordingStore.getState().hasUnsyncedTakes()).toBe(false);
  });
});
