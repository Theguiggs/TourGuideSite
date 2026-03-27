import { getSceneSegments } from '../studio';
import type { StudioScene, SceneSegment } from '../studio';

describe('getSceneSegments', () => {
  const baseScene: StudioScene = {
    id: 'scene-1',
    sessionId: 'session-1',
    sceneIndex: 0,
    title: 'Test Scene',
    originalAudioKey: 'audio/original.aac',
    studioAudioKey: 'audio/studio.webm',
    transcriptText: 'Texte transcrit de la scène.',
    transcriptionJobId: null,
    transcriptionStatus: 'completed',
    qualityScore: null,
    qualityDetailsJson: null,
    codecStatus: null,
    status: 'transcribed',
    takesCount: null,
    selectedTakeIndex: null,
    moderationFeedback: null,
    photosRefs: [],
    latitude: null,
    longitude: null,
    poiDescription: null,
    archived: false,
    createdAt: '2026-03-10T10:00:00.000Z',
    updatedAt: '2026-03-10T10:00:00.000Z',
  };

  it('returns explicit segments when provided', () => {
    const segments: SceneSegment[] = [
      {
        id: 'seg-2', sceneId: 'scene-1', segmentIndex: 1, audioKey: null,
        transcriptText: 'Segment 2', startTimeMs: 60000, endTimeMs: 120000,
        language: 'fr', sourceSegmentId: null, ttsGenerated: false,
        translationProvider: null, costProvider: null, costCharged: null,
        status: 'transcribed', createdAt: '', updatedAt: '',
      },
      {
        id: 'seg-1', sceneId: 'scene-1', segmentIndex: 0, audioKey: null,
        transcriptText: 'Segment 1', startTimeMs: 0, endTimeMs: 60000,
        language: 'fr', sourceSegmentId: null, ttsGenerated: false,
        translationProvider: null, costProvider: null, costCharged: null,
        status: 'transcribed', createdAt: '', updatedAt: '',
      },
    ];

    const result = getSceneSegments(baseScene, segments);
    expect(result).toHaveLength(2);
    expect(result[0].segmentIndex).toBe(0);
    expect(result[1].segmentIndex).toBe(1);
    expect(result[0].transcriptText).toBe('Segment 1');
  });

  it('creates implicit segment for legacy scene without segments', () => {
    const result = getSceneSegments(baseScene, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('implicit-scene-1');
    expect(result[0].segmentIndex).toBe(0);
    expect(result[0].transcriptText).toBe('Texte transcrit de la scène.');
    expect(result[0].audioKey).toBe('audio/studio.webm');
    expect(result[0].status).toBe('transcribed');
    expect(result[0].language).toBe('fr');
  });

  it('uses originalAudioKey as fallback for implicit segment', () => {
    const sceneNoStudio = { ...baseScene, studioAudioKey: null };
    const result = getSceneSegments(sceneNoStudio, []);
    expect(result[0].audioKey).toBe('audio/original.aac');
  });

  it('creates empty implicit segment for scene without text', () => {
    const emptyScene = { ...baseScene, transcriptText: null, studioAudioKey: null, originalAudioKey: null };
    const result = getSceneSegments(emptyScene, []);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('empty');
    expect(result[0].transcriptText).toBeNull();
    expect(result[0].audioKey).toBeNull();
  });
});
