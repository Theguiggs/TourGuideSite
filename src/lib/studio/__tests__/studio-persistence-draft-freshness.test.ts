/**
 * Le brouillon local ne doit primer sur le backend que s'il est PLUS RÉCENT,
 * et il doit disparaître une fois le backend à jour.
 *
 * Sans ces deux règles, un brouillon posé lors d'une visite précédente restait
 * `dirty` à vie, masquait toute correction faite ailleurs, puis l'écrasait au
 * démontage de l'éditeur.
 */

import { studioPersistenceService } from '../studio-persistence-service';

const SESSION = 'session-1';

beforeEach(() => {
  localStorage.clear();
});

describe('isSceneDraftFresher', () => {
  it('prefers the backend when the draft predates the last server write', () => {
    studioPersistenceService.saveDraft(SESSION, 'scene-a', 'texte du brouillon');
    const draft = studioPersistenceService.loadDraft(SESSION);

    const backendWrittenLater = new Date(Date.now() + 60_000).toISOString();
    expect(studioPersistenceService.isSceneDraftFresher(draft, 'scene-a', backendWrittenLater)).toBe(false);
  });

  it('prefers the draft when it is newer than the last server write', () => {
    studioPersistenceService.saveDraft(SESSION, 'scene-a', 'texte du brouillon');
    const draft = studioPersistenceService.loadDraft(SESSION);

    const backendWrittenEarlier = new Date(Date.now() - 60_000).toISOString();
    expect(studioPersistenceService.isSceneDraftFresher(draft, 'scene-a', backendWrittenEarlier)).toBe(true);
  });

  it('keeps the draft when the backend date is missing or unparseable — it is then the only copy', () => {
    studioPersistenceService.saveDraft(SESSION, 'scene-a', 'texte');
    const draft = studioPersistenceService.loadDraft(SESSION);

    expect(studioPersistenceService.isSceneDraftFresher(draft, 'scene-a', null)).toBe(true);
    expect(studioPersistenceService.isSceneDraftFresher(draft, 'scene-a', 'pas une date')).toBe(true);
  });

  it('never claims freshness for a scene the draft does not cover', () => {
    studioPersistenceService.saveDraft(SESSION, 'scene-a', 'texte');
    const draft = studioPersistenceService.loadDraft(SESSION);

    expect(studioPersistenceService.isSceneDraftFresher(draft, 'scene-b', null)).toBe(false);
    expect(studioPersistenceService.isSceneDraftFresher(null, 'scene-a', null)).toBe(false);
  });
});

describe('clearSceneDraft', () => {
  it('removes one scene and leaves the others intact', () => {
    studioPersistenceService.saveDraft(SESSION, 'scene-a', 'A');
    studioPersistenceService.saveDraft(SESSION, 'scene-b', 'B');

    studioPersistenceService.clearSceneDraft(SESSION, 'scene-a');

    const draft = studioPersistenceService.loadDraft(SESSION);
    expect(draft?.scenes['scene-a']).toBeUndefined();
    expect(draft?.scenes['scene-b']?.transcriptText).toBe('B');
  });

  it('drops the whole draft key once the last scene is cleared', () => {
    studioPersistenceService.saveDraft(SESSION, 'scene-a', 'A');

    studioPersistenceService.clearSceneDraft(SESSION, 'scene-a');

    expect(localStorage.getItem('studio_draft_session-1')).toBeNull();
    expect(studioPersistenceService.loadDraft(SESSION)).toBeNull();
  });

  it('is a no-op for a scene that was never drafted', () => {
    studioPersistenceService.saveDraft(SESSION, 'scene-a', 'A');

    studioPersistenceService.clearSceneDraft(SESSION, 'scene-inconnue');

    expect(studioPersistenceService.loadDraft(SESSION)?.scenes['scene-a']?.transcriptText).toBe('A');
  });
});
