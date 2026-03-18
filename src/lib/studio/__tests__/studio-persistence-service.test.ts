import { studioPersistenceService } from '../studio-persistence-service';

describe('StudioPersistenceService', () => {
  const mockStore: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockStore[key] ?? null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { mockStore[key] = value; });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete mockStore[key]; });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saves and loads a draft', () => {
    studioPersistenceService.saveDraft('s1', 'scene-1', 'Hello world');
    const draft = studioPersistenceService.loadDraft('s1');
    expect(draft).not.toBeNull();
    expect(draft!.scenes['scene-1'].transcriptText).toBe('Hello world');
    expect(draft!.scenes['scene-1'].dirty).toBe(true);
    expect(draft!.syncedWithBackend).toBe(false);
  });

  it('returns null for nonexistent draft', () => {
    expect(studioPersistenceService.loadDraft('nonexistent')).toBeNull();
  });

  it('appends scene to existing draft', () => {
    studioPersistenceService.saveDraft('s1', 'scene-1', 'First');
    studioPersistenceService.saveDraft('s1', 'scene-2', 'Second');
    const draft = studioPersistenceService.loadDraft('s1');
    expect(Object.keys(draft!.scenes)).toHaveLength(2);
  });

  it('deletes a draft', () => {
    studioPersistenceService.saveDraft('s1', 'scene-1', 'Hello');
    studioPersistenceService.deleteDraft('s1');
    expect(studioPersistenceService.loadDraft('s1')).toBeNull();
  });

  it('saves and retrieves last session id', () => {
    studioPersistenceService.saveLastSessionId('session-abc');
    expect(studioPersistenceService.getLastSessionId()).toBe('session-abc');
  });

  it('clears last session', () => {
    studioPersistenceService.saveLastSessionId('session-abc');
    studioPersistenceService.clearLastSession();
    expect(studioPersistenceService.getLastSessionId()).toBeNull();
  });

  it('handles corrupt stored draft gracefully', () => {
    mockStore['studio_draft_s1'] = 'not-valid-json';
    expect(studioPersistenceService.loadDraft('s1')).toBeNull();
  });
});
