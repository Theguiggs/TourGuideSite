/**
 * GCI-4.2 code-review regression — reorderScenes rollback on partial failure.
 *
 * Verifies that when a mid-sequence write fails in real (AppSync) mode, previously-
 * succeeded writes are reverted to their prior sceneIndex so we don't leave the
 * backend with duplicate / missing indices.
 */

// Force real mode (not stub)
beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'false';
  process.env.NEXT_PUBLIC_FORCE_REAL_API = 'true';
});
afterAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
  delete process.env.NEXT_PUBLIC_FORCE_REAL_API;
});

const mockUpdate = jest.fn();
const mockList = jest.fn();

jest.mock('../appsync-client', () => ({
  updateStudioSceneMutation: (...args: unknown[]) => mockUpdate(...args),
  listStudioScenesBySession: (...args: unknown[]) => mockList(...args),
}));

describe('reorderScenes — partial-failure rollback (GCI-4.2 CR)', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockList.mockReset();
  });

  it('reverts already-succeeded scenes to their prior sceneIndex when a later write fails', async () => {
    const { reorderScenes } = await import('../studio');

    // Prior state: [A=0, B=1, C=2]
    mockList.mockResolvedValue({
      ok: true,
      data: [
        { id: 'A', sceneIndex: 0 },
        { id: 'B', sceneIndex: 1 },
        { id: 'C', sceneIndex: 2 },
      ],
    });

    // Attempt to reorder to [C, A, B]
    //   update(C, 0) -> ok
    //   update(A, 1) -> FAIL
    //   rollback: update(C, 2)
    mockUpdate
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: 'boom' })
      .mockResolvedValueOnce({ ok: true });

    const result = await reorderScenes('sess-1', ['C', 'A', 'B']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/index 1/);
    }

    // First call: write C=0 (forward)
    expect(mockUpdate).toHaveBeenNthCalledWith(1, 'C', { sceneIndex: 0 });
    // Second call: write A=1 (failed)
    expect(mockUpdate).toHaveBeenNthCalledWith(2, 'A', { sceneIndex: 1 });
    // Third call: ROLLBACK C back to its prior index 2
    expect(mockUpdate).toHaveBeenNthCalledWith(3, 'C', { sceneIndex: 2 });
    expect(mockUpdate).toHaveBeenCalledTimes(3);
  });

  it('does not attempt rollback when the very first write fails', async () => {
    const { reorderScenes } = await import('../studio');
    mockList.mockResolvedValue({
      ok: true,
      data: [
        { id: 'A', sceneIndex: 0 },
        { id: 'B', sceneIndex: 1 },
      ],
    });
    mockUpdate.mockResolvedValueOnce({ ok: false, error: 'first-fail' });

    const result = await reorderScenes('sess-1', ['B', 'A']);
    expect(result.ok).toBe(false);
    // Only the forward attempt — no rollback writes.
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith('B', { sceneIndex: 0 });
  });
});
