import type { StudioSession } from '@/types/studio';

// `mock`-prefixed names are allowed inside a jest.mock factory (hoisting rule).
const mockGetGuideTourById = jest.fn();
const mockUpdateStudioSessionMutation = jest.fn(() => Promise.resolve({ ok: true }));

// Force "real" mode so the reconciliation path runs (stub mode short-circuits).
jest.mock('@/config/api-mode', () => ({ shouldUseStubs: () => false }));
jest.mock('@/lib/api/appsync-client', () => ({
  getGuideTourById: mockGetGuideTourById,
  updateStudioSessionMutation: mockUpdateStudioSessionMutation,
}));

import { withPublishedStatus } from '../published-status';

/** Minimal session — only the fields the helper touches. */
function session(id: string, status: string, tourId: string | null): StudioSession {
  return { id, status, tourId } as unknown as StudioSession;
}

describe('withPublishedStatus', () => {
  beforeEach(() => {
    mockGetGuideTourById.mockReset();
    mockUpdateStudioSessionMutation.mockReset();
    mockUpdateStudioSessionMutation.mockReturnValue(Promise.resolve({ ok: true }));
  });

  it('promeut l’affichage à published quand le GuideTour est publié', async () => {
    mockGetGuideTourById.mockResolvedValue({ status: 'published' });
    const [out] = await withPublishedStatus([session('s1', 'submitted', 't1')]);
    expect(out.status).toBe('published');
  });

  it('auto-répare (écrit) une session submitted dont le tour est publié', async () => {
    mockGetGuideTourById.mockResolvedValue({ status: 'published' });
    await withPublishedStatus([session('s1', 'submitted', 't1')]);
    expect(mockUpdateStudioSessionMutation).toHaveBeenCalledTimes(1);
    expect(mockUpdateStudioSessionMutation).toHaveBeenCalledWith('s1', { status: 'published' });
  });

  it('ne promeut NI n’écrit un brouillon V2 partageant le tourId d’une V1 publiée', async () => {
    mockGetGuideTourById.mockResolvedValue({ status: 'published' });
    const [out] = await withPublishedStatus([session('v2', 'draft', 't1')]);
    // Bug fix 2026-05-31 : un brouillon (version de travail) ne doit jamais
    // apparaître ni être écrit 'published' juste parce que la V1 est en ligne.
    expect(out.status).toBe('draft');
    expect(mockUpdateStudioSessionMutation).not.toHaveBeenCalled();
  });

  it('ne promeut/écrit JAMAIS la version de travail (draftSessionId), même soumise', async () => {
    // V2 soumise == GuideTour.draftSessionId → en attente de modération, pas live.
    mockGetGuideTourById.mockResolvedValue({ status: 'published', draftSessionId: 'v2' });
    const [out] = await withPublishedStatus([session('v2', 'submitted', 't1')]);
    expect(out.status).toBe('submitted');
    expect(mockUpdateStudioSessionMutation).not.toHaveBeenCalled();
  });

  it('ne touche rien quand le tour est encore en revue', async () => {
    mockGetGuideTourById.mockResolvedValue({ status: 'review' });
    const [out] = await withPublishedStatus([session('s1', 'submitted', 't1')]);
    expect(out.status).toBe('submitted');
    expect(mockUpdateStudioSessionMutation).not.toHaveBeenCalled();
  });

  it('ignore les sessions sans tourId', async () => {
    const [out] = await withPublishedStatus([session('s1', 'submitted', null)]);
    expect(out.status).toBe('submitted');
    expect(mockGetGuideTourById).not.toHaveBeenCalled();
    expect(mockUpdateStudioSessionMutation).not.toHaveBeenCalled();
  });

  it('ne jette pas si l’écriture de heal échoue (fire-and-forget)', async () => {
    mockGetGuideTourById.mockResolvedValue({ status: 'published' });
    mockUpdateStudioSessionMutation.mockReturnValue(Promise.reject(new Error('denied')));
    await expect(
      withPublishedStatus([session('s1', 'submitted', 't1')]),
    ).resolves.toHaveLength(1);
  });
});
