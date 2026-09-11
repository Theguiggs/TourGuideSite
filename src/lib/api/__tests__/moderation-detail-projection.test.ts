jest.mock('../appsync-client', () => ({
  getModerationItemById: jest.fn(),
  getGuideTourById: jest.fn(),
  getGuideProfileById: jest.fn(),
  listStudioScenesBySession: jest.fn(),
}));
jest.mock('../studio', () => ({
  getStudioSession: jest.fn(),
}));

import { getModerationDetail } from '../moderation';
import * as appsyncModule from '../appsync-client';
import * as studioModule from '../studio';

const getModerationItemById = appsyncModule.getModerationItemById as jest.Mock;
const getGuideTourById = appsyncModule.getGuideTourById as jest.Mock;
const getGuideProfileById = appsyncModule.getGuideProfileById as jest.Mock;
const listStudioScenesBySession = appsyncModule.listStudioScenesBySession as jest.Mock;
const getStudioSession = studioModule.getStudioSession as jest.Mock;
const originalUseStubs = process.env.NEXT_PUBLIC_USE_STUBS;

describe('getModerationDetail — projection admin réelle', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_USE_STUBS = 'false';
  });

  afterAll(() => {
    if (originalUseStubs === undefined) {
      delete process.env.NEXT_PUBLIC_USE_STUBS;
    } else {
      process.env.NEXT_PUBLIC_USE_STUBS = originalUseStubs;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getModerationItemById.mockResolvedValue({
      id: 'moderation-1',
      tourId: 'tour-1',
      guideId: 'guide-1',
      guideName: 'Guide',
      tourTitle: 'Les remparts',
      city: 'Mennetou-sur-Cher',
      submissionDate: Date.parse('2026-09-09T08:00:00.000Z'),
      status: 'pending',
      sessionId: null,
    });
    getGuideTourById.mockResolvedValue({
      id: 'tour-1',
      sessionId: 'session-from-tour',
      title: 'Les remparts',
      city: 'Mennetou-sur-Cher',
      description: 'Une visite historique.',
      duration: 20,
      distance: 1.2,
      themes: ['patrimoine'],
      languePrincipale: 'fr',
      difficulty: 'facile',
      coverPhotoKey: 'covers/tour-1.jpg',
      contentProvenance: 'mixed',
      purchaseType: 'free',
      priceCents: 0,
    });
    getGuideProfileById.mockResolvedValue(null);
    getStudioSession.mockResolvedValue(null);
    listStudioScenesBySession.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'scene-active',
          sceneIndex: 0,
          title: 'Porte basse',
          archived: false,
          transcriptText: 'Texte.',
          studioAudioKey: 'audio/1.mp3',
          durationSeconds: 75,
          latitude: 0,
          longitude: 0,
        },
        {
          id: 'scene-archived',
          sceneIndex: 1,
          title: 'Ancienne scène',
          archived: 'true',
          transcriptText: 'Ancien texte.',
          studioAudioKey: 'audio/old.mp3',
          latitude: 47,
          longitude: 1,
        },
      ],
    });
  });

  it('conserve le sessionId résolu, exclut les archives et expose les métadonnées réelles', async () => {
    const result = await getModerationDetail('moderation-1');

    expect(result).toEqual(expect.objectContaining({
      sessionId: 'session-from-tour',
      coverPhotoKey: 'covers/tour-1.jpg',
      contentProvenance: 'mixed',
      purchaseType: 'free',
      priceCents: 0,
    }));
    expect(result?.scenes).toHaveLength(1);
    expect(result?.scenes[0]).toEqual(expect.objectContaining({
      id: 'scene-active',
      durationSeconds: 75,
      latitude: 0,
      longitude: 0,
    }));
  });

  it('normalise une provenance backend inconnue en valeur absente', async () => {
    getGuideTourById.mockResolvedValue({
      id: 'tour-1',
      sessionId: 'session-from-tour',
      title: 'Les remparts',
      city: 'Mennetou-sur-Cher',
      description: 'Une visite historique.',
      contentProvenance: 'robot',
      purchaseType: 'free',
    });

    const result = await getModerationDetail('moderation-1');

    expect(result?.contentProvenance).toBeNull();
  });

  it('reprend le thème Studio des visites créées avant la persistance GuideTour', async () => {
    getGuideTourById.mockResolvedValue({
      id: 'tour-1',
      sessionId: 'session-from-tour',
      title: 'Les remparts',
      city: 'Mennetou-sur-Cher',
      themes: null,
    });
    getStudioSession.mockResolvedValue({
      id: 'session-from-tour',
      themes: ['architecture'],
      language: 'fr',
    });

    const result = await getModerationDetail('moderation-1');

    expect(result?.themes).toEqual(['architecture']);
  });
});
