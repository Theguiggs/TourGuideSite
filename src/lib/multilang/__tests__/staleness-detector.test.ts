import { isSegmentStale, getStaleSegments, getStaleCountByLanguage } from '../staleness-detector';
import type { SceneSegment, StudioScene } from '@/types/studio';

// --- Helpers ---

function makeScene(overrides: Partial<StudioScene> = {}): StudioScene {
  return {
    id: 'scene-1',
    sessionId: 'session-1',
    sceneIndex: 0,
    title: 'Scene 1',
    originalAudioKey: null,
    studioAudioKey: null,
    transcriptText: 'Bonjour',
    transcriptionJobId: null,
    transcriptionStatus: null,
    qualityScore: null,
    qualityDetailsJson: null,
    codecStatus: null,
    status: 'edited',
    takesCount: null,
    selectedTakeIndex: null,
    moderationFeedback: null,
    photosRefs: [],
    latitude: null,
    longitude: null,
    poiDescription: null,
    archived: false,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-15T12:00:00Z',
    ...overrides,
  };
}

function makeSegment(overrides: Partial<SceneSegment> = {}): SceneSegment {
  return {
    id: 'seg-1',
    sceneId: 'scene-1',
    segmentIndex: 0,
    audioKey: null,
    transcriptText: 'Hello',
    startTimeMs: null,
    endTimeMs: null,
    language: 'en',
    sourceSegmentId: 'src-1',
    ttsGenerated: false,
    translationProvider: null,
    costProvider: null,
    costCharged: null,
    status: 'translated',
    manuallyEdited: false,
    translatedTitle: null,
    sourceUpdatedAt: '2026-03-10T12:00:00Z',
    createdAt: '2026-03-10T12:00:00Z',
    updatedAt: '2026-03-10T12:00:00Z',
    ...overrides,
  };
}

// --- Tests ---

describe('staleness-detector', () => {
  describe('isSegmentStale', () => {
    it('returns true when source scene was updated after segment translation', () => {
      const scene = makeScene({ updatedAt: '2026-03-15T12:00:00Z' });
      const segment = makeSegment({ sourceUpdatedAt: '2026-03-10T12:00:00Z' });

      expect(isSegmentStale(segment, scene)).toBe(true);
    });

    it('returns false when segment translation is more recent than source scene', () => {
      const scene = makeScene({ updatedAt: '2026-03-10T12:00:00Z' });
      const segment = makeSegment({ sourceUpdatedAt: '2026-03-15T12:00:00Z' });

      expect(isSegmentStale(segment, scene)).toBe(false);
    });

    it('returns false when sourceUpdatedAt is null (never translated)', () => {
      const scene = makeScene({ updatedAt: '2026-03-15T12:00:00Z' });
      const segment = makeSegment({ sourceUpdatedAt: null });

      expect(isSegmentStale(segment, scene)).toBe(false);
    });

    it('returns false when timestamps are exactly equal', () => {
      const ts = '2026-03-15T12:00:00Z';
      const scene = makeScene({ updatedAt: ts });
      const segment = makeSegment({ sourceUpdatedAt: ts });

      expect(isSegmentStale(segment, scene)).toBe(false);
    });
  });

  describe('getStaleSegments', () => {
    it('filters and returns only stale segments', () => {
      const scenes = [
        makeScene({ id: 'scene-1', updatedAt: '2026-03-20T10:00:00Z' }),
        makeScene({ id: 'scene-2', updatedAt: '2026-03-05T10:00:00Z' }),
      ];
      const segments = [
        makeSegment({ id: 'seg-1', sceneId: 'scene-1', language: 'en', sourceUpdatedAt: '2026-03-10T10:00:00Z' }),
        makeSegment({ id: 'seg-2', sceneId: 'scene-2', language: 'en', sourceUpdatedAt: '2026-03-10T10:00:00Z' }),
      ];

      const result = getStaleSegments(segments, scenes);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        segmentId: 'seg-1',
        sceneId: 'scene-1',
        language: 'en',
      });
    });

    it('returns empty array when no segments are stale', () => {
      const scenes = [makeScene({ id: 'scene-1', updatedAt: '2026-03-01T10:00:00Z' })];
      const segments = [makeSegment({ id: 'seg-1', sceneId: 'scene-1', sourceUpdatedAt: '2026-03-15T10:00:00Z' })];

      expect(getStaleSegments(segments, scenes)).toEqual([]);
    });

    it('skips segments whose source scene is not found', () => {
      const scenes = [makeScene({ id: 'scene-1', updatedAt: '2026-03-20T10:00:00Z' })];
      const segments = [
        makeSegment({ id: 'seg-orphan', sceneId: 'scene-unknown', sourceUpdatedAt: '2026-03-01T10:00:00Z' }),
      ];

      expect(getStaleSegments(segments, scenes)).toEqual([]);
    });
  });

  describe('getStaleCountByLanguage', () => {
    it('returns stale counts grouped by language', () => {
      const scenes = [
        makeScene({ id: 'scene-1', updatedAt: '2026-03-20T10:00:00Z' }),
        makeScene({ id: 'scene-2', updatedAt: '2026-03-20T10:00:00Z' }),
      ];
      const segments = [
        makeSegment({ id: 'seg-en-1', sceneId: 'scene-1', language: 'en', sourceUpdatedAt: '2026-03-10T10:00:00Z' }),
        makeSegment({ id: 'seg-en-2', sceneId: 'scene-2', language: 'en', sourceUpdatedAt: '2026-03-10T10:00:00Z' }),
        makeSegment({ id: 'seg-es-1', sceneId: 'scene-1', language: 'es', sourceUpdatedAt: '2026-03-10T10:00:00Z' }),
        makeSegment({ id: 'seg-de-1', sceneId: 'scene-1', language: 'de', sourceUpdatedAt: '2026-03-25T10:00:00Z' }), // not stale
      ];

      const result = getStaleCountByLanguage(segments, scenes);

      expect(result).toEqual({ en: 2, es: 1 });
    });

    it('returns empty object when nothing is stale', () => {
      const scenes = [makeScene({ id: 'scene-1', updatedAt: '2026-03-01T10:00:00Z' })];
      const segments = [makeSegment({ id: 'seg-1', sceneId: 'scene-1', sourceUpdatedAt: '2026-03-15T10:00:00Z' })];

      expect(getStaleCountByLanguage(segments, scenes)).toEqual({});
    });
  });
});
