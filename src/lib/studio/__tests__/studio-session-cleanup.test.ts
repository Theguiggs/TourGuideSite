/**
 * Sur un poste partagé, la déconnexion doit emporter le travail local du guide.
 *
 * Sans cette purge, le compte suivant héritait des brouillons de scènes, de la
 * session « à reprendre » et des prises audio encore en mémoire — et pouvait
 * même réécrire un brouillon étranger sur ses propres scènes.
 */

import { clearStudioLocalState } from '../studio-session-cleanup';
import { useRecordingStore } from '@/lib/stores/recording-store';

beforeEach(() => {
  localStorage.clear();
  useRecordingStore.getState().resetStore();
});

describe('clearStudioLocalState', () => {
  it('removes every studio key, whatever the session', async () => {
    localStorage.setItem('studio_draft_session-1', '{"a":1}');
    localStorage.setItem('studio_draft_session-2', '{"b":2}');
    localStorage.setItem('studio_last_session', 'session-1');
    localStorage.setItem('studio_onboarding', '{"dismissed":[]}');
    localStorage.setItem('waypoints-session-1', '[]');

    await clearStudioLocalState();

    expect(localStorage.getItem('studio_draft_session-1')).toBeNull();
    expect(localStorage.getItem('studio_draft_session-2')).toBeNull();
    expect(localStorage.getItem('studio_last_session')).toBeNull();
    expect(localStorage.getItem('studio_onboarding')).toBeNull();
    expect(localStorage.getItem('waypoints-session-1')).toBeNull();
  });

  it('leaves keys that do not belong to the studio', async () => {
    localStorage.setItem('studio_draft_s1', 'x');
    localStorage.setItem('cookie-consent', 'accepted');
    localStorage.setItem('amplify-signin-with-hostedUI', 'false');

    await clearStudioLocalState();

    expect(localStorage.getItem('studio_draft_s1')).toBeNull();
    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
    expect(localStorage.getItem('amplify-signin-with-hostedUI')).toBe('false');
  });

  it('empties the in-memory takes so the next account cannot reach them', async () => {
    useRecordingStore.getState().addTake('scene-a', {
      blob: new Blob(['audio'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      durationMs: 1000,
    });
    expect(useRecordingStore.getState().hasUnsyncedTakes()).toBe(true);

    await clearStudioLocalState();

    expect(useRecordingStore.getState().takes).toEqual({});
    expect(useRecordingStore.getState().hasUnsyncedTakes()).toBe(false);
  });

  it('survives a localStorage that refuses to answer', async () => {
    const spy = jest.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('private mode');
    });

    await expect(clearStudioLocalState()).resolves.toBeUndefined();

    spy.mockRestore();
  });
});
