/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StudioScene } from '@/types/studio';

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
  getStudioSession: jest.fn(),
  updateStudioSession: jest.fn(),
  listSegmentsByScene: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { requestTranslation, getTranslationStatus } from '@/lib/api/translation';
import { requestTTS, getTTSStatus } from '@/lib/api/tts';
import { getProviderForTier, isLanguagePremium } from '@/lib/multilang/provider-router';
import { updateSceneSegment, getStudioSession, updateStudioSession } from '@/lib/api/studio';
import {
  executeBatch,
  BATCH_TRANSLATION_FAILED,
  BATCH_TTS_FAILED,
} from '../batch-translation-service';
import type { LanguageConfig, OnProgressCallback } from '../batch-translation-service';

const mockRequestTranslation = requestTranslation as jest.Mock;
const mockGetTranslationStatus = getTranslationStatus as jest.Mock;
const mockRequestTTS = requestTTS as jest.Mock;
const mockGetTTSStatus = getTTSStatus as jest.Mock;
const mockGetProvider = getProviderForTier as jest.Mock;
const mockIsLanguagePremium = isLanguagePremium as jest.Mock;
const mockUpdateSegment = updateSceneSegment as jest.Mock;
const mockGetStudioSession = getStudioSession as jest.Mock;
const mockUpdateStudioSession = updateStudioSession as jest.Mock;

// --- Helpers ---

function makeScene(id: string, text: string): StudioScene {
  return {
    id,
    sessionId: 'sess-1',
    sceneIndex: 0,
    title: null,
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

const langs: LanguageConfig[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
];

function setupSuccessMocks() {
  mockGetProvider.mockReturnValue('marianmt');
  mockIsLanguagePremium.mockReturnValue(false);
  mockRequestTranslation.mockResolvedValue({
    jobId: 'tj-1',
    status: 'completed',
    translatedText: 'translated text',
    provider: 'marianmt',
    costProvider: 0,
    costCharged: 0,
  });
  mockRequestTTS.mockResolvedValue({
    jobId: 'tts-1',
    status: 'completed',
    audioKey: 'audio/key.wav',
    language: 'en',
    durationMs: 5000,
  });
  mockUpdateSegment.mockResolvedValue({ ok: true });
  mockGetStudioSession.mockResolvedValue({
    id: 'sess-1',
    translatedTitles: null,
    translatedDescriptions: null,
  });
  mockUpdateStudioSession.mockResolvedValue({ ok: true });
}

// --- Tests ---

describe('BatchTranslationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('6.1 - full flow: 2 langs x 3 scenes = 6 translations + 6 TTS', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'Hello'), makeScene('s2', 'World'), makeScene('s3', 'Foo')];

    const result = await executeBatch('sess-1', scenes, langs, 'standard');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.completedScenes).toBe(6);
    expect(result.value.totalScenes).toBe(6);
    expect(result.value.failedScenes).toHaveLength(0);
    expect(mockRequestTranslation).toHaveBeenCalledTimes(6);
    expect(mockRequestTTS).toHaveBeenCalledTimes(6);
  });

  it('6.2 - sequential execution: lang1 scenes before lang2 scenes', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'A'), makeScene('s2', 'B'), makeScene('s3', 'C')];

    const callOrder: string[] = [];
    mockRequestTranslation.mockImplementation(async (segmentId: string) => {
      callOrder.push(`translate-${segmentId}`);
      return {
        jobId: 'tj',
        status: 'completed',
        translatedText: 'x',
        provider: 'marianmt',
        costProvider: 0,
        costCharged: 0,
      };
    });
    mockRequestTTS.mockImplementation(async (segmentId: string) => {
      callOrder.push(`tts-${segmentId}`);
      return {
        jobId: 'tts',
        status: 'completed',
        audioKey: 'k',
        language: 'en',
        durationMs: 1000,
      };
    });

    await executeBatch('sess-1', scenes, langs, 'standard');

    // en scenes first, then de scenes
    expect(callOrder).toEqual([
      'translate-s1-en', 'tts-s1-en',
      'translate-s2-en', 'tts-s2-en',
      'translate-s3-en', 'tts-s3-en',
      'translate-s1-de', 'tts-s1-de',
      'translate-s2-de', 'tts-s2-de',
      'translate-s3-de', 'tts-s3-de',
    ]);
  });

  it('6.3 - per-scene AppSync save after each scene completes', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'Hello'), makeScene('s2', 'World')];

    await executeBatch('sess-1', scenes, [{ code: 'en', label: 'English' }], 'standard');

    expect(mockUpdateSegment).toHaveBeenCalledTimes(2);
    // First call saves s1-en
    expect(mockUpdateSegment).toHaveBeenNthCalledWith(1, 's1-en', expect.objectContaining({
      transcriptText: 'translated text',
      audioKey: 'audio/key.wav',
      language: 'en',
      translationProvider: 'marianmt',
      status: 'tts_generated',
      ttsGenerated: true,
    }));
    // Second call saves s2-en
    expect(mockUpdateSegment).toHaveBeenNthCalledWith(2, 's2-en', expect.objectContaining({
      language: 'en',
    }));
  });

  it('6.4 - sourceUpdatedAt is set to the source scene updatedAt (not Date.now) for apples-to-apples staleness', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'Hello')];

    await executeBatch('sess-1', scenes, [{ code: 'en', label: 'English' }], 'standard');

    const savedUpdates = mockUpdateSegment.mock.calls[0][1];
    expect(savedUpdates.sourceUpdatedAt).toBe(scenes[0].updatedAt);
  });

  it('6.5 - provider resolution: standard -> marianmt, pro -> deepl', async () => {
    mockGetProvider.mockReturnValue('deepl');
    mockIsLanguagePremium.mockReturnValue(false);
    mockRequestTranslation.mockResolvedValue({
      jobId: 'tj',
      status: 'completed',
      translatedText: 'x',
      provider: 'deepl',
      costProvider: 5,
      costCharged: 15,
    });
    mockRequestTTS.mockResolvedValue({
      jobId: 'tts',
      status: 'completed',
      audioKey: 'k',
      language: 'en',
      durationMs: 1000,
    });
    mockUpdateSegment.mockResolvedValue({ ok: true });

    const scenes = [makeScene('s1', 'Hello')];
    await executeBatch('sess-1', scenes, [{ code: 'en', label: 'English' }], 'pro');

    expect(mockGetProvider).toHaveBeenCalledWith('pro');
    // Now passes qualityTier instead of provider
    expect(mockRequestTranslation).toHaveBeenCalledWith(
      's1-en', 'Hello', 'fr', 'en', 'pro',
    );
    expect(mockUpdateSegment).toHaveBeenCalledWith('s1-en', expect.objectContaining({
      translationProvider: 'deepl',
    }));
  });

  it('6.6 - translation failure: scene marked failed with 2604, batch continues', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'A'), makeScene('s2', 'B')];

    // s1 fails translation, s2 succeeds
    mockRequestTranslation
      .mockResolvedValueOnce({
        jobId: 'tj',
        status: 'failed',
        translatedText: null,
        provider: 'marianmt',
        costProvider: null,
        costCharged: null,
      })
      .mockResolvedValue({
        jobId: 'tj2',
        status: 'completed',
        translatedText: 'ok',
        provider: 'marianmt',
        costProvider: 0,
        costCharged: 0,
      });

    const result = await executeBatch('sess-1', scenes, [{ code: 'en', label: 'English' }], 'standard');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.completedScenes).toBe(1);
    expect(result.value.failedScenes).toHaveLength(1);
    expect(result.value.failedScenes[0].errorCode).toBe(BATCH_TRANSLATION_FAILED);
    expect(result.value.failedScenes[0].sceneId).toBe('s1');
    // TTS should only be called for s2
    expect(mockRequestTTS).toHaveBeenCalledTimes(1);
  });

  it('6.7 - TTS failure: scene marked failed with 2605, batch continues', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'A'), makeScene('s2', 'B')];

    // TTS fails for s1, succeeds for s2
    mockRequestTTS
      .mockResolvedValueOnce({
        jobId: 'tts',
        status: 'failed',
        audioKey: null,
        language: 'en',
        durationMs: null,
      })
      .mockResolvedValue({
        jobId: 'tts2',
        status: 'completed',
        audioKey: 'k2',
        language: 'en',
        durationMs: 1000,
      });

    const result = await executeBatch('sess-1', scenes, [{ code: 'en', label: 'English' }], 'standard');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.completedScenes).toBe(1);
    expect(result.value.failedScenes).toHaveLength(1);
    expect(result.value.failedScenes[0].errorCode).toBe(BATCH_TTS_FAILED);
    expect(result.value.failedScenes[0].sceneId).toBe('s1');
    // Segment save only called for s2
    expect(mockUpdateSegment).toHaveBeenCalledTimes(1);
  });

  it('6.8 - partial failure: mixed results reflected in BatchResult', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'A'), makeScene('s2', 'B'), makeScene('s3', 'C')];

    // s2 translation fails
    mockRequestTranslation
      .mockResolvedValueOnce({
        jobId: 'tj1', status: 'completed', translatedText: 'ok1', provider: 'marianmt', costProvider: 0, costCharged: 0,
      })
      .mockResolvedValueOnce({
        jobId: 'tj2', status: 'failed', translatedText: null, provider: 'marianmt', costProvider: null, costCharged: null,
      })
      .mockResolvedValue({
        jobId: 'tj3', status: 'completed', translatedText: 'ok3', provider: 'marianmt', costProvider: 0, costCharged: 0,
      });

    const result = await executeBatch('sess-1', scenes, [{ code: 'en', label: 'English' }], 'standard');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.completedScenes).toBe(2);
    expect(result.value.totalScenes).toBe(3);
    expect(result.value.failedScenes).toHaveLength(1);
    expect(result.value.failedScenes[0].sceneId).toBe('s2');
  });

  it('6.9 - onProgress callback called with correct args at each step', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'Hello')];
    const progressCalls: Array<[string, string, string]> = [];
    const onProgress: OnProgressCallback = (lang, sceneId, step) => {
      progressCalls.push([lang, sceneId, step]);
    };

    await executeBatch('sess-1', scenes, [{ code: 'en', label: 'English' }], 'standard', onProgress);

    expect(progressCalls).toEqual([
      ['en', 's1', 'translated'],
      ['en', 's1', 'tts_completed'],
    ]);
  });

  it('6.10 - polling: translation returns processing then completed', async () => {
    mockGetProvider.mockReturnValue('marianmt');
    mockRequestTranslation.mockResolvedValue({
      jobId: 'tj-poll',
      status: 'processing',
      translatedText: null,
      provider: 'marianmt',
      costProvider: null,
      costCharged: null,
    });
    mockGetTranslationStatus
      .mockResolvedValueOnce({ jobId: 'tj-poll', status: 'processing', translatedText: null, provider: 'marianmt', costProvider: null, costCharged: null })
      .mockResolvedValueOnce({ jobId: 'tj-poll', status: 'completed', translatedText: 'polled text', provider: 'marianmt', costProvider: 0, costCharged: 0 });
    mockRequestTTS.mockResolvedValue({
      jobId: 'tts-1',
      status: 'completed',
      audioKey: 'audio/polled.wav',
      language: 'en',
      durationMs: 3000,
    });
    mockUpdateSegment.mockResolvedValue({ ok: true });

    const scenes = [makeScene('s1', 'Hello')];
    const result = await executeBatch('sess-1', scenes, [{ code: 'en', label: 'English' }], 'standard');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.completedScenes).toBe(1);
    expect(mockGetTranslationStatus).toHaveBeenCalledTimes(2);
    expect(mockUpdateSegment).toHaveBeenCalledWith('s1-en', expect.objectContaining({
      transcriptText: 'polled text',
    }));
  });

  it('6.11 - polling: TTS returns pending then completed', async () => {
    mockGetProvider.mockReturnValue('marianmt');
    mockRequestTranslation.mockResolvedValue({
      jobId: 'tj-1',
      status: 'completed',
      translatedText: 'translated',
      provider: 'marianmt',
      costProvider: 0,
      costCharged: 0,
    });
    mockRequestTTS.mockResolvedValue({
      jobId: 'tts-poll',
      status: 'pending',
      audioKey: null,
      language: 'en',
      durationMs: null,
    });
    mockGetTTSStatus
      .mockResolvedValueOnce({ jobId: 'tts-poll', status: 'processing', audioKey: null, language: 'en', durationMs: null })
      .mockResolvedValueOnce({ jobId: 'tts-poll', status: 'completed', audioKey: 'audio/polled-tts.wav', language: 'en', durationMs: 5000 });
    mockUpdateSegment.mockResolvedValue({ ok: true });

    const scenes = [makeScene('s1', 'Hello')];
    const result = await executeBatch('sess-1', scenes, [{ code: 'en', label: 'English' }], 'standard');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.completedScenes).toBe(1);
    expect(mockGetTTSStatus).toHaveBeenCalledTimes(2);
    expect(mockUpdateSegment).toHaveBeenCalledWith('s1-en', expect.objectContaining({
      audioKey: 'audio/polled-tts.wav',
    }));
  });

  it('6.12 - empty scenes array: returns ok with 0 completed, 0 failed', async () => {
    setupSuccessMocks();

    const result = await executeBatch('sess-1', [], langs, 'standard');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.completedScenes).toBe(0);
    expect(result.value.totalScenes).toBe(0);
    expect(result.value.failedScenes).toHaveLength(0);
    expect(mockRequestTranslation).not.toHaveBeenCalled();
    expect(mockRequestTTS).not.toHaveBeenCalled();
  });

  it('6.13 - session title/description translated before scenes for each language', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'Hello')];
    const callOrder: string[] = [];

    mockRequestTranslation.mockImplementation(async (segmentId: string) => {
      callOrder.push(segmentId);
      return {
        jobId: 'tj',
        status: 'completed',
        translatedText: 'translated',
        provider: 'marianmt',
        costProvider: 0,
        costCharged: 0,
      };
    });

    await executeBatch(
      'sess-1', scenes, [{ code: 'en', label: 'English' }], 'standard',
      undefined, 'Mon Tour', 'Une belle promenade',
    );

    // Session title + description translated before scene text
    expect(callOrder[0]).toBe('session-title-sess-1-en');
    expect(callOrder[1]).toBe('session-desc-sess-1-en');
    // Then scene text
    expect(callOrder[2]).toBe('s1-en');
  });

  it('6.14 - session info saved with merged translatedTitles/translatedDescriptions', async () => {
    setupSuccessMocks();
    mockGetStudioSession.mockResolvedValue({
      id: 'sess-1',
      translatedTitles: { de: 'Existing DE' },
      translatedDescriptions: { de: 'Existing DE desc' },
    });

    mockRequestTranslation.mockResolvedValue({
      jobId: 'tj',
      status: 'completed',
      translatedText: 'English Title',
      provider: 'marianmt',
      costProvider: 0,
      costCharged: 0,
    });
    mockRequestTTS.mockResolvedValue({
      jobId: 'tts',
      status: 'completed',
      audioKey: 'k',
      language: 'en',
      durationMs: 1000,
    });

    await executeBatch(
      'sess-1', [], [{ code: 'en', label: 'English' }], 'standard',
      undefined, 'Mon Tour', 'Description',
    );

    expect(mockUpdateStudioSession).toHaveBeenCalledWith('sess-1', {
      translatedTitles: { de: 'Existing DE', en: 'English Title' },
      translatedDescriptions: { de: 'Existing DE desc', en: 'English Title' },
    });
  });

  it('6.15 - scene titles translated and saved as translatedTitle on segment', async () => {
    setupSuccessMocks();
    const scene: StudioScene = {
      ...makeScene('s1', 'Scene text'),
      title: 'Place aux Aires',
    };

    // Return different translations based on segmentId
    mockRequestTranslation.mockImplementation(async (segmentId: string) => {
      const text = segmentId.includes('-title-') ? 'Aires Square' : 'translated scene text';
      return {
        jobId: 'tj',
        status: 'completed',
        translatedText: text,
        provider: 'marianmt',
        costProvider: 0,
        costCharged: 0,
      };
    });

    await executeBatch('sess-1', [scene], [{ code: 'en', label: 'English' }], 'standard');

    // Scene title translation called with title-specific segmentId
    expect(mockRequestTranslation).toHaveBeenCalledWith(
      's1-title-en', 'Place aux Aires', 'fr', 'en', 'standard',
    );

    // Segment save includes translatedTitle
    expect(mockUpdateSegment).toHaveBeenCalledWith('s1-en', expect.objectContaining({
      translatedTitle: 'Aires Square',
      transcriptText: 'translated scene text',
    }));
  });

  it('6.16 - scene without title: no title translation called, no translatedTitle in save', async () => {
    setupSuccessMocks();
    const scene = makeScene('s1', 'Hello'); // title is null

    await executeBatch('sess-1', [scene], [{ code: 'en', label: 'English' }], 'standard');

    // Only 1 translation call (scene text), no title translation
    expect(mockRequestTranslation).toHaveBeenCalledTimes(1);
    expect(mockRequestTranslation).toHaveBeenCalledWith(
      's1-en', 'Hello', 'fr', 'en', 'standard',
    );

    // Segment save should not include translatedTitle
    const savedUpdates = mockUpdateSegment.mock.calls[0][1];
    expect(savedUpdates.translatedTitle).toBeUndefined();
  });

  it('6.17 - session info progress callback fires before scene progress', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'Hello')];
    const progressCalls: Array<[string, string, string]> = [];
    const onProgress: OnProgressCallback = (lang, sceneId, step) => {
      progressCalls.push([lang, sceneId, step]);
    };

    await executeBatch(
      'sess-1', scenes, [{ code: 'en', label: 'English' }], 'standard',
      onProgress, 'Title', 'Desc',
    );

    expect(progressCalls[0]).toEqual(['en', 'sess-1', 'session_info_translated']);
    expect(progressCalls[1]).toEqual(['en', 's1', 'translated']);
    expect(progressCalls[2]).toEqual(['en', 's1', 'tts_completed']);
  });
});
