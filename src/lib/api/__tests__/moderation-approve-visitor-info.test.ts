/**
 * BTU-8 regression: approveTour must derive GuideTour.startAddress/endAddress/
 * isLoop from the guide's traced route (StudioSession.routePath.computedPath)
 * at approval time. Forces real mode and mocks appsync-client + studio + fetch.
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

const originalFetch = global.fetch;

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'false';
});

afterAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
  global.fetch = originalFetch;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetModerationItemById.mockResolvedValue({ id: 'mod-1', tourId: 'tour-1', sessionId: 'session-1' });
  mockUpdateModerationItem.mockResolvedValue({ ok: true });
  mockUpdateGuideTour.mockResolvedValue({ ok: true });
  mockUpdateStudioSession.mockResolvedValue({ ok: true });
  mockGetGuideTourById.mockResolvedValue({ id: 'tour-1', languageAudioTypes: null, availableLanguages: [] });
  mockListStudioScenes.mockResolvedValue([]);
  global.fetch = jest.fn();
});

describe('approveTour — BTU-8 visitor info', () => {
  it('derives startAddress + endAddress and isLoop=false for a point-to-point route', async () => {
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1',
      language: 'fr',
      version: 1,
      routePath: {
        computedPath: [
          { lat: 43.7, lng: 7.25 },
          { lat: 43.71, lng: 7.28 },
        ],
      },
    });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ display_name: '1 Rue de Depart, Nice' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ display_name: '9 Rue Arrivee, Nice' }) });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({
        isLoop: false,
        startAddress: '1 Rue de Depart, Nice',
        endAddress: '9 Rue Arrivee, Nice',
      }),
    );
  });

  it('derives isLoop=true and skips the endAddress geocode when start and end are close', async () => {
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1',
      language: 'fr',
      version: 1,
      routePath: {
        computedPath: [
          { lat: 43.7, lng: 7.25 },
          { lat: 43.7001, lng: 7.2501 }, // ~15m away — same start/end point
        ],
      },
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ display_name: 'Place du Depart, Nice' }),
    });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1); // only the start address geocoded
    expect(mockUpdateGuideTour).toHaveBeenCalledWith(
      'tour-1',
      expect.objectContaining({ isLoop: true, startAddress: 'Place du Depart, Nice' }),
    );
    expect(mockUpdateGuideTour).not.toHaveBeenCalledWith('tour-1', expect.objectContaining({ endAddress: expect.anything() }));
  });

  it('skips derivation entirely when the route has fewer than 2 points', async () => {
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1',
      language: 'fr',
      version: 1,
      routePath: { computedPath: [{ lat: 43.7, lng: 7.25 }] },
    });

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockUpdateGuideTour).not.toHaveBeenCalledWith('tour-1', expect.objectContaining({ isLoop: expect.anything() }));
  });

  it('does not fail approval when reverse geocoding throws', async () => {
    mockGetStudioSession.mockResolvedValue({
      id: 'session-1',
      language: 'fr',
      version: 1,
      routePath: {
        computedPath: [
          { lat: 43.7, lng: 7.25 },
          { lat: 43.71, lng: 7.28 },
        ],
      },
    });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));

    const result = await approveTour('mod-1', {}, 'ok');

    expect(result.ok).toBe(true);
  });
});
