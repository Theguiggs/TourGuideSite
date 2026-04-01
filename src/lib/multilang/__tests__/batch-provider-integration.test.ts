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
  listSegmentsByScene: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { requestTranslation } from '@/lib/api/translation';
import { requestTTS } from '@/lib/api/tts';
import { getProviderForTier, isLanguagePremium } from '@/lib/multilang/provider-router';
import { updateSceneSegment } from '@/lib/api/studio';
import {
  executeBatch,
  PROVIDER_UNAVAILABLE,
} from '../batch-translation-service';
import type { LanguageConfig, OnProgressCallback } from '../batch-translation-service';

const mockRequestTranslation = requestTranslation as jest.Mock;
const mockRequestTTS = requestTTS as jest.Mock;
const mockGetProvider = getProviderForTier as jest.Mock;
const mockIsLanguagePremium = isLanguagePremium as jest.Mock;
const mockUpdateSegment = updateSceneSegment as jest.Mock;

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

function setupSuccessMocks(provider: 'marianmt' | 'deepl' = 'marianmt') {
  mockGetProvider.mockReturnValue(provider);
  mockIsLanguagePremium.mockReturnValue(false);
  mockRequestTranslation.mockResolvedValue({
    jobId: 'tj-1',
    status: 'completed',
    translatedText: 'translated text',
    provider,
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
}

// --- Tests ---

describe('BatchTranslationService - Provider Integration (ML-3.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('3.4.I1 - executeBatch passes qualityTier to requestTranslation', async () => {
    setupSuccessMocks();
    const scenes = [makeScene('s1', 'Bonjour')];
    const langs: LanguageConfig[] = [{ code: 'en', label: 'English' }];

    await executeBatch('sess-1', scenes, langs, 'standard');

    // Should pass qualityTier, not provider
    expect(mockRequestTranslation).toHaveBeenCalledWith(
      's1-en', 'Bonjour', 'fr', 'en', 'standard',
    );
  });

  it('3.4.I2 - executeBatch with pro tier passes pro to requestTranslation', async () => {
    setupSuccessMocks('deepl');
    const scenes = [makeScene('s1', 'Bonjour')];
    const langs: LanguageConfig[] = [{ code: 'en', label: 'English' }];

    await executeBatch('sess-1', scenes, langs, 'pro');

    expect(mockRequestTranslation).toHaveBeenCalledWith(
      's1-en', 'Bonjour', 'fr', 'en', 'pro',
    );
    expect(mockGetProvider).toHaveBeenCalledWith('pro');
  });

  it('3.4.I3 - scene marked failed with 2609 when provider unavailable', async () => {
    mockGetProvider.mockReturnValue('marianmt');
    mockIsLanguagePremium.mockReturnValue(false);
    mockRequestTranslation.mockResolvedValue({
      jobId: '',
      status: 'failed',
      translatedText: null,
      provider: 'marianmt',
      costProvider: null,
      costCharged: null,
      errorCode: 2609,
    });
    mockUpdateSegment.mockResolvedValue({ ok: true });

    const scenes = [makeScene('s1', 'Bonjour')];
    const langs: LanguageConfig[] = [{ code: 'en', label: 'English' }];
    const progressCalls: Array<[string, string, string]> = [];
    const onProgress: OnProgressCallback = (lang, sceneId, step) => {
      progressCalls.push([lang, sceneId, step]);
    };

    const result = await executeBatch('sess-1', scenes, langs, 'standard', onProgress);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.failedScenes).toHaveLength(1);
    expect(result.value.failedScenes[0].errorCode).toBe(PROVIDER_UNAVAILABLE);
    expect(result.value.failedScenes[0].message).toContain('Provider unavailable');
    expect(progressCalls).toEqual([['en', 's1', 'failed']]);
    // TTS should not be called when translation fails
    expect(mockRequestTTS).not.toHaveBeenCalled();
  });

  it('3.4.I4 - segment save uses provider from translation result', async () => {
    // Simulate scenario where batch resolves marianmt but translation result has deepl
    // (due to premium override inside requestTranslation)
    mockGetProvider.mockReturnValue('marianmt');
    mockIsLanguagePremium.mockReturnValue(false);
    mockRequestTranslation.mockResolvedValue({
      jobId: 'tj-1',
      status: 'completed',
      translatedText: 'translated',
      provider: 'deepl', // override happened inside requestTranslation
      costProvider: 5,
      costCharged: 15,
    });
    mockRequestTTS.mockResolvedValue({
      jobId: 'tts-1',
      status: 'completed',
      audioKey: 'audio/key.wav',
      language: 'ja',
      durationMs: 5000,
    });
    mockUpdateSegment.mockResolvedValue({ ok: true });

    const scenes = [makeScene('s1', 'Bonjour')];
    const langs: LanguageConfig[] = [{ code: 'ja', label: 'Japanese' }];

    await executeBatch('sess-1', scenes, langs, 'standard');

    // Segment save should use the provider from translation result (deepl), not batch-level (marianmt)
    expect(mockUpdateSegment).toHaveBeenCalledWith('s1-ja', expect.objectContaining({
      translationProvider: 'deepl',
    }));
  });

  it('3.4.I5 - multiple scenes: provider unavailable only affects that scene', async () => {
    mockGetProvider.mockReturnValue('marianmt');
    mockIsLanguagePremium.mockReturnValue(false);

    // s1 fails with 2609, s2 succeeds
    mockRequestTranslation
      .mockResolvedValueOnce({
        jobId: '',
        status: 'failed',
        translatedText: null,
        provider: 'marianmt',
        costProvider: null,
        costCharged: null,
        errorCode: 2609,
      })
      .mockResolvedValue({
        jobId: 'tj-2',
        status: 'completed',
        translatedText: 'ok',
        provider: 'marianmt',
        costProvider: 0,
        costCharged: 0,
      });
    mockRequestTTS.mockResolvedValue({
      jobId: 'tts-1',
      status: 'completed',
      audioKey: 'audio/ok.wav',
      language: 'en',
      durationMs: 3000,
    });
    mockUpdateSegment.mockResolvedValue({ ok: true });

    const scenes = [makeScene('s1', 'A'), makeScene('s2', 'B')];
    const langs: LanguageConfig[] = [{ code: 'en', label: 'English' }];

    const result = await executeBatch('sess-1', scenes, langs, 'standard');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.completedScenes).toBe(1);
    expect(result.value.failedScenes).toHaveLength(1);
    expect(result.value.failedScenes[0].sceneId).toBe('s1');
    expect(result.value.failedScenes[0].errorCode).toBe(PROVIDER_UNAVAILABLE);
    // TTS only called for s2
    expect(mockRequestTTS).toHaveBeenCalledTimes(1);
  });

  it('3.4.I6 - regular translation failure still uses 2604', async () => {
    mockGetProvider.mockReturnValue('marianmt');
    mockIsLanguagePremium.mockReturnValue(false);
    mockRequestTranslation.mockResolvedValue({
      jobId: '',
      status: 'failed',
      translatedText: null,
      provider: 'marianmt',
      costProvider: null,
      costCharged: null,
      // No errorCode - regular failure
    });

    const scenes = [makeScene('s1', 'Bonjour')];
    const langs: LanguageConfig[] = [{ code: 'en', label: 'English' }];

    const result = await executeBatch('sess-1', scenes, langs, 'standard');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.failedScenes[0].errorCode).toBe(2604); // BATCH_TRANSLATION_FAILED
  });
});
