import { isSegmentStale, getStaleSegments, getStaleCountByLanguage } from '../staleness-detector';
import type { SceneSegment, StudioScene } from '@/types/studio';
import { hashSourceText } from '@/types/studio';

/** Hash matching the default makeScene source text — a segment with this hash is up-to-date. */
const FRESH_HASH = hashSourceText('Bonjour', 'Scene 1');
const STALE_HASH = 'deadbeef'; // any value that differs from FRESH_HASH

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
    it('returns true when the source TEXT hash differs (text changed)', () => {
      const scene = makeScene();
      const segment = makeSegment({ sourceTextHash: STALE_HASH });

      expect(isSegmentStale(segment, scene)).toBe(true);
    });

    it('returns false when the stored hash matches the current source text', () => {
      const scene = makeScene();
      const segment = makeSegment({ sourceTextHash: FRESH_HASH });

      expect(isSegmentStale(segment, scene)).toBe(false);
    });

    it('returns false when sourceTextHash is null (never translated / not loaded)', () => {
      const scene = makeScene();
      const segment = makeSegment({ sourceTextHash: null });

      expect(isSegmentStale(segment, scene)).toBe(false);
    });

    it('returns false on a non-text edit (updatedAt bumped, text unchanged)', () => {
      const scene = makeScene({ updatedAt: '2099-01-01T00:00:00Z', latitude: 43.6 });
      const segment = makeSegment({ sourceTextHash: FRESH_HASH });

      expect(isSegmentStale(segment, scene)).toBe(false);
    });
  });

  describe('getStaleSegments', () => {
    it('filters and returns only stale segments', () => {
      const scenes = [
        makeScene({ id: 'scene-1' }),
        makeScene({ id: 'scene-2' }),
      ];
      const segments = [
        makeSegment({ id: 'seg-1', sceneId: 'scene-1', language: 'en', sourceTextHash: STALE_HASH }),
        makeSegment({ id: 'seg-2', sceneId: 'scene-2', language: 'en', sourceTextHash: FRESH_HASH }),
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
      const scenes = [makeScene({ id: 'scene-1' })];
      const segments = [makeSegment({ id: 'seg-1', sceneId: 'scene-1', sourceTextHash: FRESH_HASH })];

      expect(getStaleSegments(segments, scenes)).toEqual([]);
    });

    it('skips segments whose source scene is not found', () => {
      const scenes = [makeScene({ id: 'scene-1' })];
      const segments = [
        makeSegment({ id: 'seg-orphan', sceneId: 'scene-unknown', sourceTextHash: STALE_HASH }),
      ];

      expect(getStaleSegments(segments, scenes)).toEqual([]);
    });
  });

  describe('getStaleCountByLanguage', () => {
    it('returns stale counts grouped by language', () => {
      const scenes = [
        makeScene({ id: 'scene-1' }),
        makeScene({ id: 'scene-2' }),
      ];
      const segments = [
        makeSegment({ id: 'seg-en-1', sceneId: 'scene-1', language: 'en', sourceTextHash: STALE_HASH }),
        makeSegment({ id: 'seg-en-2', sceneId: 'scene-2', language: 'en', sourceTextHash: STALE_HASH }),
        makeSegment({ id: 'seg-es-1', sceneId: 'scene-1', language: 'es', sourceTextHash: STALE_HASH }),
        makeSegment({ id: 'seg-de-1', sceneId: 'scene-1', language: 'de', sourceTextHash: FRESH_HASH }), // not stale
      ];

      const result = getStaleCountByLanguage(segments, scenes);

      expect(result).toEqual({ en: 2, es: 1 });
    });

    it('returns empty object when nothing is stale', () => {
      const scenes = [makeScene({ id: 'scene-1' })];
      const segments = [makeSegment({ id: 'seg-1', sceneId: 'scene-1', sourceTextHash: FRESH_HASH })];

      expect(getStaleCountByLanguage(segments, scenes)).toEqual({});
    });
  });
});
