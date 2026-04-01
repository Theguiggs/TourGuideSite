/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StudioScene, SceneSegment } from '@/types/studio';

// --- Mocks (inline jest.fn per hoisting rules) ---

jest.mock('@/lib/api/translation', () => ({
  requestTranslation: jest.fn(),
  getTranslationStatus: jest.fn(),
}));

jest.mock('@/lib/api/tts', () => ({
  requestTTS: jest.fn(),
  getTTSStatus: jest.fn(),
}));

jest.mock('@/lib/multilang/provider-router', () => ({
  getProviderForTier: jest.fn(),
  isLanguagePremium: jest.fn(),
}));

jest.mock('@/lib/api/studio', () => ({
  updateSceneSegment: jest.fn(),
  listSegmentsByScene: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { requestTranslation } from '@/lib/api/translation';
import { requestTTS } from '@/lib/api/tts';
import { getProviderForTier } from '@/lib/multilang/provider-router';
import { updateSceneSegment, listSegmentsByScene } from '@/lib/api/studio';
import {
  retryScene,
  detectMissingScenes,
  getMissingScenes,
  getErrorMessage,
  BATCH_TRANSLATION_FAILED,
  BATCH_TTS_FAILED,
  PROVIDER_UNAVAILABLE,
} from '../batch-translation-service';
import { useLanguageBatchStore } from '@/lib/stores/language-batch-store';
import { sortScenesByStatus } from '@/components/studio/language-scene-list/language-scene-list';

const mockRequestTranslation = requestTranslation as jest.Mock;
const mockRequestTTS = requestTTS as jest.Mock;
const mockGetProvider = getProviderForTier as jest.Mock;
const mockUpdateSegment = updateSceneSegment as jest.Mock;
const mockListSegmentsByScene = listSegmentsByScene as jest.Mock;

// --- Helpers ---

function makeScene(id: string, text: string): StudioScene {
  return {
    id,
    sessionId: 'sess-1',
    sceneIndex: 0,
    title: `Scene ${id}`,
    originalAudioKey: null,
    studioAudioKey: null,
    transcriptText: text,
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
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function makeSegment(sceneId: string, lang: string, opts: { transcriptText?: string | null; audioKey?: string | null } = {}): SceneSegment {
  return {
    id: `seg-${sceneId}-${lang}`,
    sceneId,
    segmentIndex: 0,
    audioKey: opts.audioKey ?? null,
    transcriptText: opts.transcriptText ?? null,
    startTimeMs: null,
    endTimeMs: null,
    language: lang,
    sourceSegmentId: null,
    ttsGenerated: !!(opts.audioKey),
    translationProvider: null,
    costProvider: null,
    costCharged: null,
    status: opts.audioKey ? 'tts_generated' : 'translated',
    manuallyEdited: false,
    translatedTitle: null,
    sourceUpdatedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetProvider.mockReturnValue('marianmt');
  useLanguageBatchStore.getState().resetBatch();
});

// --- Test 1: Retry individuel reussi ---

describe('retryScene', () => {
  it('should retry a single scene and return success', async () => {
    const scene = makeScene('scene-1', 'Bonjour le monde');

    mockRequestTranslation.mockResolvedValue({
      jobId: 'trans-1',
      status: 'completed',
      translatedText: 'Hello world',
      provider: 'marianmt',
      costProvider: 0,
      costCharged: 0,
    });

    mockRequestTTS.mockResolvedValue({
      jobId: 'tts-1',
      status: 'completed',
      audioKey: 'audio/scene-1-en.wav',
      language: 'en',
      durationMs: 3000,
    });

    mockUpdateSegment.mockResolvedValue({ ok: true });

    const result = await retryScene(scene, 'en', 'standard');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.translatedText).toBe('Hello world');
      expect(result.audioKey).toBe('audio/scene-1-en.wav');
    }

    // Verify it called the same functions as batch
    expect(mockRequestTranslation).toHaveBeenCalledTimes(1);
    expect(mockRequestTranslation).toHaveBeenCalledWith(
      'scene-1-en', 'Bonjour le monde', 'fr', 'en', 'standard',
    );
    expect(mockRequestTTS).toHaveBeenCalledTimes(1);
    expect(mockUpdateSegment).toHaveBeenCalledTimes(1);
  });

  // --- Test 2: Retry echec ---

  it('should return error when retry translation fails', async () => {
    const scene = makeScene('scene-2', 'Bonjour');

    mockRequestTranslation.mockResolvedValue({
      jobId: 'trans-2',
      status: 'failed',
      translatedText: null,
      provider: 'marianmt',
      costProvider: null,
      costCharged: null,
    });

    const result = await retryScene(scene, 'en', 'standard');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe(BATCH_TRANSLATION_FAILED);
    }

    // TTS should not have been called
    expect(mockRequestTTS).not.toHaveBeenCalled();
  });

  it('should return error when retry TTS fails', async () => {
    const scene = makeScene('scene-3', 'Bonjour');

    mockRequestTranslation.mockResolvedValue({
      jobId: 'trans-3',
      status: 'completed',
      translatedText: 'Hello',
      provider: 'marianmt',
      costProvider: 0,
      costCharged: 0,
    });

    mockRequestTTS.mockResolvedValue({
      jobId: 'tts-3',
      status: 'failed',
      audioKey: null,
      language: 'en',
      durationMs: null,
    });

    const result = await retryScene(scene, 'en', 'standard');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe(BATCH_TTS_FAILED);
    }
  });
});

// --- Test 3: Detection scenes manquantes apres fermeture ---

describe('detectMissingScenes', () => {
  it('should detect missing scenes by comparing segments with scene list', async () => {
    const scenes = [
      makeScene('s1', 'Scene 1'),
      makeScene('s2', 'Scene 2'),
      makeScene('s3', 'Scene 3'),
    ];

    // s1 has complete segment for 'en', s2 and s3 do not
    mockListSegmentsByScene.mockImplementation((sceneId: string) => {
      if (sceneId === 's1') {
        return Promise.resolve([
          makeSegment('s1', 'en', { transcriptText: 'Scene 1 EN', audioKey: 'audio/s1-en.wav' }),
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await detectMissingScenes('sess-1', scenes, 'en');

    expect(result.completedScenes).toEqual(['s1']);
    expect(result.missingScenes).toEqual(['s2', 's3']);
  });
});

// --- Test 4: Aucun segment → toutes manquantes ---

describe('getMissingScenes', () => {
  it('should return all scenes as missing when no segments exist', () => {
    const scenes = [
      makeScene('s1', 'Scene 1'),
      makeScene('s2', 'Scene 2'),
    ];

    const missing = getMissingScenes([], scenes, 'en');

    expect(missing).toEqual(['s1', 's2']);
  });

  // --- Test 5: Segments sans TTS → scene incomplete ---

  it('should treat scenes with translation but no audio as missing', () => {
    const scenes = [
      makeScene('s1', 'Scene 1'),
      makeScene('s2', 'Scene 2'),
    ];

    const segments: SceneSegment[] = [
      makeSegment('s1', 'en', { transcriptText: 'Scene 1 EN', audioKey: 'audio/s1-en.wav' }),
      makeSegment('s2', 'en', { transcriptText: 'Scene 2 EN', audioKey: null }), // TTS failed
    ];

    const missing = getMissingScenes(segments, scenes, 'en');

    expect(missing).toEqual(['s2']);
  });

  it('should filter segments by language', () => {
    const scenes = [
      makeScene('s1', 'Scene 1'),
    ];

    // Segment exists for 'de' but not 'en'
    const segments: SceneSegment[] = [
      makeSegment('s1', 'de', { transcriptText: 'Szene 1 DE', audioKey: 'audio/s1-de.wav' }),
    ];

    const missing = getMissingScenes(segments, scenes, 'en');
    expect(missing).toEqual(['s1']);

    const missingDe = getMissingScenes(segments, scenes, 'de');
    expect(missingDe).toEqual([]);
  });
});

// --- Test 6: Tri failed-first ---

describe('sortScenesByStatus', () => {
  it('should sort scenes: failed first, then pending, then completed', () => {
    const scenes = [
      makeScene('s1', 'Scene 1'), // will be completed
      makeScene('s2', 'Scene 2'), // will be pending
      makeScene('s3', 'Scene 3'), // will be failed
    ];

    const failedSceneIds = ['s3'];
    const completedSceneIds = ['s1'];
    const failedDetails = [
      { sceneId: 's3', errorCode: BATCH_TRANSLATION_FAILED, message: 'Translation failed' },
    ];

    const sorted = sortScenesByStatus(scenes, failedSceneIds, completedSceneIds, failedDetails, [], 'en', null);

    expect(sorted[0].status).toBe('failed');
    expect(sorted[0].scene.id).toBe('s3');
    expect(sorted[0].failedEntry).not.toBeNull();

    expect(sorted[1].status).toBe('pending');
    expect(sorted[1].scene.id).toBe('s2');

    expect(sorted[2].status).toBe('completed');
    expect(sorted[2].scene.id).toBe('s1');
  });
});

// --- Store integration: removeFromFailed ---

describe('language-batch-store retry integration', () => {
  it('should remove scene from failedScenes and increment completed on removeFromFailed', () => {
    const store = useLanguageBatchStore.getState();
    store.initBatch('en', 3);
    store.markFailedWithDetails('en', 'scene-1', BATCH_TRANSLATION_FAILED, 'Translation failed');
    store.markFailedWithDetails('en', 'scene-2', BATCH_TTS_FAILED, 'TTS failed');

    // Verify initial state
    let progress = useLanguageBatchStore.getState().progress['en'];
    expect(progress.failedScenes).toContain('scene-1');
    expect(progress.failedScenes).toContain('scene-2');
    expect(progress.status).toBe('failed');

    // Retry scene-1 succeeds
    store.removeFromFailed('en', 'scene-1');

    progress = useLanguageBatchStore.getState().progress['en'];
    expect(progress.failedScenes).not.toContain('scene-1');
    expect(progress.failedScenes).toContain('scene-2');
    expect(progress.completed).toBe(1);

    // Details should also be updated
    const details = useLanguageBatchStore.getState().failedSceneDetails['en'];
    expect(details.find((d) => d.sceneId === 'scene-1')).toBeUndefined();
    expect(details.find((d) => d.sceneId === 'scene-2')).toBeDefined();
  });

  it('should mark batch completed when last failed scene is retried successfully', () => {
    const store = useLanguageBatchStore.getState();
    store.initBatch('en', 2);

    // Simulate 1 completed + 1 failed
    store.updateProgress('en', 'scene-1'); // completed=1
    store.markFailedWithDetails('en', 'scene-2', BATCH_TTS_FAILED, 'TTS failed');

    // Retry scene-2 succeeds
    store.removeFromFailed('en', 'scene-2');

    const progress = useLanguageBatchStore.getState().progress['en'];
    expect(progress.completed).toBe(2);
    expect(progress.failedScenes).toEqual([]);
    expect(progress.status).toBe('completed');
  });
});

// --- Error message helper ---

describe('getErrorMessage', () => {
  it('should return readable messages for known error codes', () => {
    expect(getErrorMessage(BATCH_TRANSLATION_FAILED)).toContain('traduction');
    expect(getErrorMessage(BATCH_TTS_FAILED)).toContain('audio');
    expect(getErrorMessage(PROVIDER_UNAVAILABLE)).toContain('indisponible');
    expect(getErrorMessage(9999)).toContain('inconnue');
  });
});
