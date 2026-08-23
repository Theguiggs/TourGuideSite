/**
 * C7 regression: approveTour must derive and persist GuideTour.languageAudioTypes
 * for the source language, even when a tour is approved directly (never went
 * through a language-purchase approval — the only other writer of this field).
 * Forces real mode (NEXT_PUBLIC_USE_STUBS=false) and mocks appsync-client + studio.
 */

jest.mock('../appsync-client', () => ({
  getModerationItemById: jest.fn(),
  listModerationItems: jest.fn(),
  getGuideTourById: jest.fn(),
  updateModerationItemMutation: jest.fn(),
  updateGuideTourMutation: jest.fn(),
  updateStudioSessionMutation: jest.fn(),
}));

jest.mock('../studio', () => ({
  getStudioSession: jest.fn(),
  listStudioScenes: jest.fn(),
}));

jest.mock('../tour-comments', () => ({
  addTourComment: jest.fn().mockResolvedValue(undefined),
}));

import { approveTour } from '../moderation';
import * as appsyncModule from '../appsync-client';
import * as studioModule from '../studio';

const mockGetModerationItemById = appsyncModule.getModerationItemById as jest.Mock;
const mockGetGuideTourById = appsyncModule.getGuideTourById as jest.Mock;
const mockUpdateModerationItem = appsyncModule.updateModerationItemMutation as jest.Mock;
const mockUpdateGuideTour = appsyncModule.updateGuideTourMutation as jest.Mock;
const mockUpdateStudioSession = appsyncModule.updateStudioSessionMutation as jest.Mock;
const mockGetStudioSession = studioModule.getStudioSession as jest.Mock;
const mockListStudioScenes = studioModule.listStudioScenes as jest.Mock;

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'false';
});

afterAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetModerationItemById.mockResolvedValue({
    id: 'mod-1',
    tourId: 'tour-1',
    sessionId: 'session-1',
  });
  mockUpdateModerationItem.mockResolvedValue({ ok: true });
  mockUpdateGuideTour.mockResolvedValue({ ok: true });
  mockUpdateStudioSession.mockResolvedValue({ ok: true });
  mockGetStudioSession.mockResolvedValue({ id: 'session-1', language: 'fr', version: 1 });
  mockGetGuideTourById.mockResolvedValue({ id: 'tour-1', languageAudioTypes: null, availableLanguages: [] });
});

describe('approveTour — C7 languageAudioTypes disclosure', () => {
  it('writes languageAudioTypes[sourceLang]="tts" when every scene base audio is TTS-generated', async () => {
    mockListStudioScenes.mockResolvedValue([
      { id: 'scene-1', archived: false, baseAudioSource: 'tts', studioAudioKey: null, originalAudioKey: null },
      { id: 'scene-2', archived: false, baseAudioSource: 'tts', studioAudioKey: null, originalAudioKey: null },
    ]);

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({
        languageAudioTypes: { fr: 'tts' },
        availableLanguages: ['fr'],
      }),
    );
  });

  it('merges into existing languageAudioTypes instead of overwriting approved translations', async () => {
    mockGetGuideTourById.mockResolvedValue({
      id: 'tour-1',
      languageAudioTypes: { en: 'recording' },
      availableLanguages: ['en'],
    });
    mockListStudioScenes.mockResolvedValue([
      { id: 'scene-1', archived: false, baseAudioSource: 'recording', studioAudioKey: null, originalAudioKey: null },
    ]);

    await approveTour('mod-1', {}, 'ok');

    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({
        languageAudioTypes: { en: 'recording', fr: 'recording' },
        availableLanguages: expect.arrayContaining(['fr', 'en']),
      }),
    );
  });

  it('falls back to filename heuristic when baseAudioSource is unset (legacy scenes)', async () => {
    mockListStudioScenes.mockResolvedValue([
      { id: 'scene-1', archived: false, baseAudioSource: null, studioAudioKey: 'audio/tts-scene-1.wav', originalAudioKey: null },
    ]);

    await approveTour('mod-1', {}, 'ok');

    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({ languageAudioTypes: { fr: 'tts' } }),
    );
  });

  it('does not fail approval when the derivation itself errors', async () => {
    mockListStudioScenes.mockRejectedValue(new Error('boom'));

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
  });
});
