import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import CleanupPage from '../page';

// Silence the dynamic leaflet import in jsdom
jest.mock('next/dynamic', () => () => {
  const DynamicStub = () => <div data-testid="walk-map-stub" />;
  return DynamicStub;
});

jest.mock('next/navigation', () => ({
  useParams: () => ({ sessionId: 'session-phased-demo' }),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

// getPlayableUrl is not needed in stubs since stub keys pass through; but mock to avoid aws-amplify imports
jest.mock('@/lib/studio/studio-upload-service', () => ({
  getPlayableUrl: jest.fn(() => Promise.resolve('/mock/audio.aac')),
}));

describe('CleanupPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads the phased-capture session, merges timeline and shows POI panel by default', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    const timeline = screen.getByTestId('cleanup-timeline');
    expect(timeline).toBeInTheDocument();
    // Two POIs (sceneIndex 0 and 2) + one walk (order 1)
    expect(screen.getByTestId('timeline-poi-phased-scene-1')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-poi-phased-scene-2')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-walk-phased-walk-1')).toBeInTheDocument();

    expect(screen.getByTestId('poi-cleanup-panel')).toBeInTheDocument();
  });

  it('switches to walk panel on walk selection', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('timeline-walk-phased-walk-1'));
    expect(screen.getByTestId('walk-cleanup-panel')).toBeInTheDocument();
  });

  it('marks save as pending immediately on change and saved after 2s debounce', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('poi-name-input'), { target: { value: 'Renommé' } });
    expect(screen.getByTestId('save-state').textContent).toMatch(/Modification/);

    await act(async () => {
      jest.advanceTimersByTime(2000);
      // Flush any pending promises from the save
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByTestId('save-state').textContent).toMatch(/Sauvegardé/));
  });

  it('toggles walk deleted state via the walk panel', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('timeline-walk-phased-walk-1'));
    fireEvent.click(screen.getByTestId('walk-delete-btn'));
    // Timeline entry should reflect the deleted class / badge
    await waitFor(() => expect(screen.getByTestId('walk-deleted-badge')).toBeInTheDocument());
  });

  // Regression (CR-2026-04-20): flush pending debounced patches on unmount so
  // typing immediately before navigation is not silently dropped. Pre-fix, the
  // unmount cleanup only cleared the timer and the patch in the ref Map was lost.
  it('flushes pending debounced patches when unmounted before the 2s timer fires', async () => {
    const studioApi = await import('@/lib/api/studio');
    const spy = jest.spyOn(studioApi, 'updateSceneData');
    const { unmount } = render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('poi-name-input'), { target: { value: 'Quick edit' } });
    // Unmount BEFORE the 2s debounce fires.
    unmount();
    // Unmount cleanup should have fired the save synchronously (fire-and-forget).
    const sceneCalls = spy.mock.calls.filter(([, patch]) =>
      (patch as { title?: string }).title === 'Quick edit',
    );
    expect(sceneCalls.length).toBeGreaterThanOrEqual(1);
    spy.mockRestore();
  });

  // Regression (CR-2026-04-20): unmount while a save is in-flight must not throw
  // when the save promise resolves late. mountedRef guards the setState call.
  it('safely handles in-flight save that resolves after unmount', async () => {
    const studioApi = await import('@/lib/api/studio');
    let resolveSave: (() => void) | null = null;
    const savePending = new Promise<{ ok: true }>((res) => {
      resolveSave = () => res({ ok: true });
    });
    const spy = jest
      .spyOn(studioApi, 'updateSceneData')
      .mockReturnValue(savePending as unknown as Promise<{ ok: true }>);

    const { unmount } = render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('poi-name-input'), { target: { value: 'Pending save' } });
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    // Now unmount while the save is still pending.
    unmount();
    // Late-resolve the save — must not throw and must not mutate dead state.
    await expect(
      act(async () => {
        resolveSave?.();
        await Promise.resolve();
        await Promise.resolve();
      }),
    ).resolves.not.toThrow();
    spy.mockRestore();
  });

  // Regression (CR-2026-04-20): timeline interleaves scenes and walks strictly by
  // chronological order; this sanity check locks in the expected rendering order
  // of the phased-demo fixture (phased-scene-1 @0, phased-walk-1 @1, phased-scene-2 @2).
  it('sorts timeline items chronologically across scenes and walks', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());
    const timeline = screen.getByTestId('cleanup-timeline');
    const items = Array.from(timeline.querySelectorAll('[data-testid^="timeline-"]'));
    // phased-scene-1 (sceneIndex 0), phased-walk-1 (order 1), phased-scene-2 (sceneIndex 2)
    const testids = items.map((el) => el.getAttribute('data-testid'));
    expect(testids).toEqual([
      'timeline-poi-phased-scene-1',
      'timeline-walk-phased-walk-1',
      'timeline-poi-phased-scene-2',
    ]);
  });
});
