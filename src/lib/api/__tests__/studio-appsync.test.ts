/**
 * Tests for studio.ts real mode (AppSync calls).
 * Mocks appsync-client and forces real mode via NEXT_PUBLIC_USE_STUBS=false.
 */

jest.mock('../appsync-client', () => ({
  listStudioSessionsByGuide: jest.fn(),
  getStudioSessionById: jest.fn(),
  createStudioSessionMutation: jest.fn(),
  listStudioScenesBySession: jest.fn(),
  createStudioSceneMutation: jest.fn(),
  updateStudioSceneMutation: jest.fn(),
  createGuideTourMutation: jest.fn(),
  updateGuideTourMutation: jest.fn(),
}));

import { listStudioSessions, getStudioSession, createStudioSession, createTourWithSession, listStudioScenes, createScene, updateSceneText, updateSceneAudio } from '../studio';
import * as appsyncModule from '../appsync-client';

const mockListSessionsByGuide = appsyncModule.listStudioSessionsByGuide as jest.Mock;
const mockGetSessionById = appsyncModule.getStudioSessionById as jest.Mock;
const mockCreateSessionMutation = appsyncModule.createStudioSessionMutation as jest.Mock;
const mockListScenesBySession = appsyncModule.listStudioScenesBySession as jest.Mock;
const mockCreateSceneMutation = appsyncModule.createStudioSceneMutation as jest.Mock;
const mockUpdateSceneMutation = appsyncModule.updateStudioSceneMutation as jest.Mock;
const mockCreateGuideTourMutation = appsyncModule.createGuideTourMutation as jest.Mock;
const mockUpdateGuideTourMutation = appsyncModule.updateGuideTourMutation as jest.Mock;

// Force real mode
beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'false';
});

afterAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listStudioSessions (real mode)', () => {
  it('calls listStudioSessionsByGuide with correct guideId', async () => {
    mockListSessionsByGuide.mockResolvedValue({ ok: true, data: [{ id: 's1', guideId: 'g1', status: 'draft', language: 'fr', consentRGPD: true, createdAt: '', updatedAt: '' }] });
    const result = await listStudioSessions('g1');
    expect(mockListSessionsByGuide).toHaveBeenCalledWith('g1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
  });
});

describe('getStudioSession (real mode)', () => {
  it('calls getStudioSessionById with correct id', async () => {
    mockGetSessionById.mockResolvedValue({ ok: true, data: { id: 's1', guideId: 'g1', status: 'editing', language: 'fr', consentRGPD: true, createdAt: '', updatedAt: '' } });
    const result = await getStudioSession('s1');
    expect(mockGetSessionById).toHaveBeenCalledWith('s1');
    expect(result?.status).toBe('editing');
  });
});

describe('createStudioSession (real mode)', () => {
  it('calls createStudioSessionMutation with correct params', async () => {
    mockListSessionsByGuide.mockResolvedValue({ ok: true, data: [] });
    mockCreateSessionMutation.mockResolvedValue({ ok: true, data: { id: 'new-s', guideId: 'g1', status: 'draft', createdAt: '', updatedAt: '' } });
    const result = await createStudioSession('source-1', 'g1');
    expect(result.ok).toBe(true);
    expect(mockCreateSessionMutation).toHaveBeenCalledWith(expect.objectContaining({ guideId: 'g1', sourceSessionId: 'source-1', status: 'draft' }));
  });
});

describe('createTourWithSession (real mode)', () => {
  it('calls createGuideTourMutation then createStudioSessionMutation then updateGuideTourMutation', async () => {
    mockCreateGuideTourMutation.mockResolvedValue({ ok: true, data: { id: 'tour-1' } });
    mockCreateSessionMutation.mockResolvedValue({ ok: true, data: { id: 'sess-1' } });
    mockUpdateGuideTourMutation.mockResolvedValue({ ok: true, data: {} });

    const result = await createTourWithSession('g1', 'Mon Tour', 'Grasse');
    expect(result.ok).toBe(true);
    expect(mockCreateGuideTourMutation).toHaveBeenCalledWith(expect.objectContaining({ guideId: 'g1', title: 'Mon Tour', city: 'Grasse' }));
    expect(mockCreateSessionMutation).toHaveBeenCalledWith(expect.objectContaining({ guideId: 'g1', tourId: 'tour-1' }));
    expect(mockUpdateGuideTourMutation).toHaveBeenCalledWith('tour-1', { sessionId: 'sess-1' });
  });
});

describe('listStudioScenes (real mode)', () => {
  it('calls listStudioScenesBySession and maps results', async () => {
    mockListScenesBySession.mockResolvedValue({ ok: true, data: [
      { id: 'sc1', sessionId: 's1', sceneIndex: 0, status: 'empty', photosRefs: [], archived: false, createdAt: '', updatedAt: '' },
      { id: 'sc2', sessionId: 's1', sceneIndex: 1, status: 'edited', photosRefs: [], archived: false, createdAt: '', updatedAt: '' },
    ] });
    const result = await listStudioScenes('s1');
    expect(mockListScenesBySession).toHaveBeenCalledWith('s1');
    expect(result).toHaveLength(2);
    expect(result[0].sceneIndex).toBe(0);
  });
});

describe('createScene (real mode)', () => {
  it('calls createStudioSceneMutation with computed sceneIndex', async () => {
    mockListScenesBySession.mockResolvedValue({ ok: true, data: [{ id: 'sc1' }, { id: 'sc2' }] });
    mockCreateSceneMutation.mockResolvedValue({ ok: true, data: { id: 'sc3', sessionId: 's1', sceneIndex: 2, status: 'empty', photosRefs: [], archived: false, createdAt: '', updatedAt: '' } });
    const result = await createScene('s1', 'Nouvelle scène');
    expect(result.ok).toBe(true);
    expect(mockCreateSceneMutation).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 's1', sceneIndex: 2, title: 'Nouvelle scène', status: 'empty' }));
  });
});

describe('updateSceneText (real mode)', () => {
  it('calls updateStudioSceneMutation with transcriptText only (no status override)', async () => {
    mockUpdateSceneMutation.mockResolvedValue({ ok: true, data: {} });
    const result = await updateSceneText('sc1', 'Hello world');
    expect(result.ok).toBe(true);
    expect(mockUpdateSceneMutation).toHaveBeenCalledWith('sc1', { transcriptText: 'Hello world' });
  });
});

describe('updateSceneAudio (real mode)', () => {
  it('calls updateStudioSceneMutation with studioAudioKey + status recorded', async () => {
    mockUpdateSceneMutation.mockResolvedValue({ ok: true, data: {} });
    const result = await updateSceneAudio('sc1', 'guide-studio/sub/s1/audio/scene_0.webm');
    expect(result.ok).toBe(true);
    expect(mockUpdateSceneMutation).toHaveBeenCalledWith('sc1', { studioAudioKey: 'guide-studio/sub/s1/audio/scene_0.webm', status: 'recorded' });
  });
});
