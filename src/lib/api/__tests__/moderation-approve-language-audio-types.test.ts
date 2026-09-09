/** Contrat de publication : le mode explicite pilote la mention, sans inférence. */

jest.mock('../appsync-client', () => ({
  getModerationItemById: jest.fn(),
  listModerationItems: jest.fn(),
  getGuideTourById: jest.fn(),
  getGuideTourResult: jest.fn(),
  listStudioScenesBySession: jest.fn(),
  updateModerationItemMutation: jest.fn(),
  updateGuideTourMutation: jest.fn(),
  updateStudioSessionMutation: jest.fn(),
  setTourWorkflowStatusMutation: jest.fn(),
}));

jest.mock('../studio', () => ({
  getStudioSession: jest.fn(),
  listStudioScenes: jest.fn(),
}));

jest.mock('../tour-comments', () => ({
  addTourComment: jest.fn().mockResolvedValue(undefined),
}));

import {adminSetTourStatus, approveTour} from '../moderation';
import * as appsyncModule from '../appsync-client';
import * as studioModule from '../studio';

const mockGetModerationItemById = appsyncModule.getModerationItemById as jest.Mock;
const mockGetGuideTourResult = appsyncModule.getGuideTourResult as jest.Mock;
const mockListScenesBySession = appsyncModule.listStudioScenesBySession as jest.Mock;
const mockUpdateModerationItem = appsyncModule.updateModerationItemMutation as jest.Mock;
const mockUpdateGuideTour = appsyncModule.updateGuideTourMutation as jest.Mock;
const mockUpdateStudioSession = appsyncModule.updateStudioSessionMutation as jest.Mock;
const mockSetTourWorkflowStatus = appsyncModule.setTourWorkflowStatusMutation as jest.Mock;
const mockGetStudioSession = studioModule.getStudioSession as jest.Mock;

const scenesRead = (scenes: unknown[]) => ({ok: true, data: scenes});
const tourRead = (tour: Record<string, unknown> | null) => ({ok: true, data: tour});

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
  mockUpdateModerationItem.mockResolvedValue({ok: true});
  mockUpdateGuideTour.mockResolvedValue({ok: true});
  mockUpdateStudioSession.mockResolvedValue({ok: true});
  mockSetTourWorkflowStatus.mockResolvedValue({ok: true});
  mockGetStudioSession.mockResolvedValue({
    id: 'session-1',
    language: 'fr',
    version: 1,
    narrationMode: 'tts_on_demand',
  });
  mockGetGuideTourResult.mockResolvedValue(
    tourRead({
      id: 'tour-1',
      sessionId: 'session-1',
      languageAudioTypes: null,
      availableLanguages: [],
    }),
  );
  mockListScenesBySession.mockResolvedValue(
    scenesRead([{id: 'scene-1', title: 'Scène', archived: false, transcriptText: 'Texte final'}]),
  );
});

describe('approveTour — mode explicite et matrice de complétude', () => {
  it('publie le TTS sans audio préfabriqué et écrit le snapshot dans la même mutation', async () => {
    expect(await approveTour('mod-1', {}, 'ok')).toEqual({ok: true});

    expect(mockSetTourWorkflowStatus).toHaveBeenCalledWith(
      'tour-1', 'published', 'session-1', expect.objectContaining({moderationId: 'mod-1'}),
    );
  });

  it('publie Ma voix uniquement quand chaque texte et audio humain est présent', async () => {
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1', language: 'FR-fr', version: 1, narrationMode: 'recording',
    });
    mockListScenesBySession.mockResolvedValue(
      scenesRead([
        {
          id: 'scene-1',
          title: 'Scène',
          archived: false,
          transcriptText: 'Texte final',
          originalAudioKey: 'audio/source/scene-1.m4a',
          baseAudioSource: 'recording',
        },
      ]),
    );

    expect(await approveTour('mod-1', {}, 'ok')).toEqual({ok: true});
    expect(mockSetTourWorkflowStatus).toHaveBeenCalledWith(
      'tour-1', 'published', 'session-1', expect.objectContaining({moderationId: 'mod-1'}),
    );
  });

  it('fusionne les mentions des autres langues déjà approuvées', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({
        id: 'tour-1',
        languageAudioTypes: JSON.stringify({en: 'recording', nl: 'tts'}),
        availableLanguages: ['en', 'nl'],
      }),
    );

    await approveTour('mod-1', {}, 'ok');

    expect(mockSetTourWorkflowStatus).toHaveBeenCalledWith(
      'tour-1', 'published', 'session-1', expect.objectContaining({moderationId: 'mod-1'}),
    );
  });

  it('refuse une version historique sans mode au lieu de l’inférer des clés', async () => {
    mockGetStudioSession.mockResolvedValue({id: 'session-1', language: 'fr', version: 1});
    mockListScenesBySession.mockResolvedValue(
      scenesRead([
        {
          id: 'scene-1',
          archived: false,
          transcriptText: 'Texte final',
          originalAudioKey: 'audio/tts-scene-1.wav',
        },
      ]),
    );

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('migration explicite');
    expect(mockUpdateGuideTour).not.toHaveBeenCalled();
  });

  it('refuse le TTS si un audio est attaché avant fabrication', async () => {
    mockListScenesBySession.mockResolvedValue(
      scenesRead([
        {
          id: 'scene-1',
          archived: false,
          transcriptText: 'Texte final',
          studioAudioKey: 'audio/scene-1.wav',
        },
      ]),
    );

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('malgré le mode TTS');
  });

  it('refuse Ma voix si une scène active n’a pas son audio', async () => {
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1', language: 'fr', version: 1, narrationMode: 'recording',
    });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('sans audio humain');
  });

  it('refuse un item historique sans session au lieu de lui attribuer TTS', async () => {
    mockGetModerationItemById.mockResolvedValue({id: 'mod-1', tourId: 'tour-1', sessionId: null});

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Mode de narration manquant');
    expect(mockListScenesBySession).not.toHaveBeenCalled();
  });

  it('laisse l’item en file si l’écriture de publication est refusée', async () => {
    mockSetTourWorkflowStatus.mockResolvedValue({ok: false, error: 'Unauthorized'});

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Unauthorized');
    expect(mockUpdateModerationItem).not.toHaveBeenCalled();
    expect(mockUpdateStudioSession).not.toHaveBeenCalled();
  });

  it('refuse une publication si les scènes ne sont pas lisibles', async () => {
    mockListScenesBySession.mockResolvedValue({ok: false, error: 'network down'});

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('2902');
    expect(mockUpdateGuideTour).not.toHaveBeenCalled();
  });
});

describe('adminSetTourStatus — garde de réactivation', () => {
  it('refuse published sans mention pour la langue source', async () => {
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({id: 'tour-1', sessionId: 'session-1', languageAudioTypes: null}),
    );

    const result = await adminSetTourStatus('tour-1', 'published');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('2900');
  });

  it('réactive quand la mention explicite est déjà présente', async () => {
    const stored = JSON.stringify({fr: 'tts', en: 'recording'});
    mockGetGuideTourResult.mockResolvedValue(
      tourRead({id: 'tour-1', sessionId: 'session-1', languageAudioTypes: stored}),
    );

    expect(await adminSetTourStatus('tour-1', 'published')).toEqual({ok: true});
    expect(mockSetTourWorkflowStatus).toHaveBeenCalledWith('tour-1', 'published', 'session-1');
  });

  it('ne contraint pas l’archivage', async () => {
    expect(await adminSetTourStatus('tour-1', 'archived')).toEqual({ok: true});
    expect(mockGetGuideTourResult).not.toHaveBeenCalled();
    expect(mockUpdateGuideTour).toHaveBeenCalledWith('tour-1', {status: 'archived'});
  });
});
