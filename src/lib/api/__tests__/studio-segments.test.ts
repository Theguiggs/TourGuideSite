import {
  createSceneSegment,
  updateSceneSegment,
  deleteSceneSegment,
  listSegmentsByScene,
  batchCreateSegments,
  __resetStubStore,
} from '../studio';

jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => true,
  shouldUseRealApi: () => false,
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('SceneSegment CRUD (stub mode)', () => {
  beforeEach(() => {
    __resetStubStore();
  });

  describe('createSceneSegment', () => {
    it('creates a segment with default values', async () => {
      const result = await createSceneSegment({
        sceneId: 'scene-1',
        segmentIndex: 0,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.segment.sceneId).toBe('scene-1');
      expect(result.segment.segmentIndex).toBe(0);
      expect(result.segment.language).toBe('fr');
      expect(result.segment.status).toBe('empty');
      expect(result.segment.ttsGenerated).toBe(false);
      expect(result.segment.id).toMatch(/^seg-/);
    });

    it('creates a segment with custom values', async () => {
      const result = await createSceneSegment({
        sceneId: 'scene-1',
        segmentIndex: 1,
        transcriptText: 'Bonjour',
        language: 'fr',
        startTimeMs: 0,
        endTimeMs: 5000,
        status: 'transcribed',
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.segment.transcriptText).toBe('Bonjour');
      expect(result.segment.startTimeMs).toBe(0);
      expect(result.segment.endTimeMs).toBe(5000);
      expect(result.segment.status).toBe('transcribed');
    });
  });

  describe('updateSceneSegment', () => {
    it('updates segment fields', async () => {
      const created = await createSceneSegment({ sceneId: 'scene-1', segmentIndex: 0 });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const result = await updateSceneSegment(created.segment.id, {
        transcriptText: 'Updated text',
        status: 'transcribed',
      });

      expect(result.ok).toBe(true);

      // Verify update persisted in stub store
      const segments = await listSegmentsByScene('scene-1');
      expect(segments[0].transcriptText).toBe('Updated text');
      expect(segments[0].status).toBe('transcribed');
    });

    it('updates translation provider and cost', async () => {
      const created = await createSceneSegment({ sceneId: 'scene-1', segmentIndex: 0 });
      if (!created.ok) return;

      await updateSceneSegment(created.segment.id, {
        translationProvider: 'deepl',
        costProvider: 5,
        costCharged: 15,
      });

      const segments = await listSegmentsByScene('scene-1');
      expect(segments[0].translationProvider).toBe('deepl');
      expect(segments[0].costProvider).toBe(5);
      expect(segments[0].costCharged).toBe(15);
    });
  });

  describe('deleteSceneSegment', () => {
    it('removes a segment', async () => {
      const created = await createSceneSegment({ sceneId: 'scene-1', segmentIndex: 0 });
      if (!created.ok) return;

      const result = await deleteSceneSegment(created.segment.id);
      expect(result.ok).toBe(true);

      const segments = await listSegmentsByScene('scene-1');
      expect(segments).toHaveLength(0);
    });

    it('handles deleting non-existent segment gracefully', async () => {
      const result = await deleteSceneSegment('non-existent-id');
      expect(result.ok).toBe(true);
    });
  });

  describe('listSegmentsByScene', () => {
    it('returns empty array for scene with no segments', async () => {
      const segments = await listSegmentsByScene('empty-scene');
      expect(segments).toEqual([]);
    });

    it('returns segments sorted by segmentIndex', async () => {
      await createSceneSegment({ sceneId: 'scene-1', segmentIndex: 2 });
      await createSceneSegment({ sceneId: 'scene-1', segmentIndex: 0 });
      await createSceneSegment({ sceneId: 'scene-1', segmentIndex: 1 });

      const segments = await listSegmentsByScene('scene-1');
      expect(segments).toHaveLength(3);
      expect(segments[0].segmentIndex).toBe(0);
      expect(segments[1].segmentIndex).toBe(1);
      expect(segments[2].segmentIndex).toBe(2);
    });

    it('filters by sceneId', async () => {
      await createSceneSegment({ sceneId: 'scene-1', segmentIndex: 0 });
      await createSceneSegment({ sceneId: 'scene-2', segmentIndex: 0 });

      const segments1 = await listSegmentsByScene('scene-1');
      const segments2 = await listSegmentsByScene('scene-2');
      expect(segments1).toHaveLength(1);
      expect(segments2).toHaveLength(1);
      expect(segments1[0].sceneId).toBe('scene-1');
      expect(segments2[0].sceneId).toBe('scene-2');
    });
  });

  describe('batchCreateSegments', () => {
    it('creates multiple segments', async () => {
      const result = await batchCreateSegments([
        { sceneId: 'scene-1', segmentIndex: 0, startTimeMs: 0, endTimeMs: 30000 },
        { sceneId: 'scene-1', segmentIndex: 1, startTimeMs: 30000, endTimeMs: 60000 },
        { sceneId: 'scene-1', segmentIndex: 2, startTimeMs: 60000, endTimeMs: 90000 },
      ]);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.segments).toHaveLength(3);
    });

    it('returns created segments with proper indices', async () => {
      const result = await batchCreateSegments([
        { sceneId: 'scene-1', segmentIndex: 0 },
        { sceneId: 'scene-1', segmentIndex: 1 },
      ]);

      if (!result.ok) return;
      const segments = await listSegmentsByScene('scene-1');
      expect(segments).toHaveLength(2);
    });
  });
});
