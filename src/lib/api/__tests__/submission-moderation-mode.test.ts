jest.mock('../studio', () => ({
  getStudioSession: jest.fn(),
  listStudioScenes: jest.fn(),
  __updateStubSessionStatus: jest.fn(),
}));

jest.mock('../appsync-client', () => ({
  updateStudioSessionMutation: jest.fn(),
  setTourWorkflowStatusMutation: jest.fn(),
  updateGuideTourMutation: jest.fn(),
  getClient: jest.fn(),
  getGuideTourById: jest.fn(),
  getGuideProfileById: jest.fn(),
  listModerationItems: jest.fn(),
  createModerationItemMutation: jest.fn(),
  updateModerationItemMutation: jest.fn(),
}));

jest.mock('../tour-comments', () => ({addTourComment: jest.fn()}));
jest.mock('aws-amplify/storage', () => ({remove: jest.fn()}));

import {submitForReview} from '../studio-submission';
import {getModerationQueue} from '../moderation';
import * as studio from '../studio';
import * as appsync from '../appsync-client';

const getSession = studio.getStudioSession as jest.Mock;
const listScenes = studio.listStudioScenes as jest.Mock;
const createModeration = appsync.createModerationItemMutation as jest.Mock;
const listModeration = appsync.listModerationItems as jest.Mock;

beforeAll(() => { process.env.NEXT_PUBLIC_USE_STUBS = 'false'; });
afterAll(() => { process.env.NEXT_PUBLIC_USE_STUBS = 'true'; });

beforeEach(() => {
  jest.clearAllMocks();
  (appsync.updateStudioSessionMutation as jest.Mock).mockResolvedValue({ok: true});
  (appsync.setTourWorkflowStatusMutation as jest.Mock).mockResolvedValue({ok: true});
  (appsync.updateGuideTourMutation as jest.Mock).mockResolvedValue({ok: true});
  (appsync.getClient as jest.Mock).mockReturnValue({models: {StudioSession: {get: jest.fn().mockResolvedValue({data: {}})}}});
  (appsync.getGuideTourById as jest.Mock).mockResolvedValue({
    id: 'tour-1', guideId: 'guide-1', title: 'Visite', city: 'Nice',
    poiCount: 1, duration: 10, distance: 1,
  });
  (appsync.getGuideProfileById as jest.Mock).mockResolvedValue({displayName: 'Guide'});
  listModeration.mockResolvedValue([]);
  createModeration.mockResolvedValue({ok: true, data: {id: 'mod-1'}});
});

it.each([
  ['recording', {originalAudioKey: 'audio.m4a', baseAudioSource: 'recording'}],
  ['tts_on_demand', {originalAudioKey: null, baseAudioSource: null}],
] as const)('soumet %s et conserve le mode dans ModerationItem', async (narrationMode, audio) => {
  getSession.mockResolvedValue({
    id: 'session-1', tourId: 'tour-1', language: 'fr', narrationMode,
  });
  listScenes.mockResolvedValue([{
    id: 'scene-1', title: 'Scène', transcriptText: 'Texte final', archived: false,
    studioAudioKey: null, ...audio,
  }]);
  expect(await submitForReview('session-1', 'tour-1')).toEqual({ok: true});
  expect(createModeration).toHaveBeenCalledWith(expect.objectContaining({
    sessionId: 'session-1', narrationMode, sourceLanguage: 'fr',
  }));
});

it.each(['recording', 'tts_on_demand'] as const)('rend le mode %s dans la file admin', async narrationMode => {
  listModeration.mockImplementation(async ({status}: {status?: string}) => status === 'pending' ? [{
    id: 'mod-1', tourId: 'tour-1', sessionId: 'session-1', tourTitle: 'Visite',
    guideId: 'guide-1', guideName: 'Guide', city: 'Nice', submissionDate: Date.now(),
    status: 'pending', narrationMode, sourceLanguage: 'fr',
  }] : []);
  const queue = await getModerationQueue();
  expect(queue).toEqual([expect.objectContaining({narrationMode, sourceLanguage: 'fr'})]);
});
