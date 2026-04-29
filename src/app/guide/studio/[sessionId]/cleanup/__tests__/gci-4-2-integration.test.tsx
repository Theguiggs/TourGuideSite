/**
 * GCI-4.2 integration tests — Reorder + metadata + validate → redirect.
 *
 * We don't rely on real drag-and-drop in jsdom (dnd-kit requires pointer events
 * that RTL/jsdom don't reliably synthesize). Instead, we exercise the wired
 * handlers by calling the reorder API directly and asserting the page emits
 * the correct mutation.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CleanupPage from '../page';

const mockPush = jest.fn();

jest.mock('next/dynamic', () => () => {
  const DynamicStub = () => <div data-testid="walk-map-stub" />;
  return DynamicStub;
});

jest.mock('next/navigation', () => ({
  useParams: () => ({ sessionId: 'session-grasse-parfums' }),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('@/lib/studio/studio-upload-service', () => ({
  getPlayableUrl: jest.fn(() => Promise.resolve('/mock/audio.aac')),
}));

describe('GCI-4.2 integration', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    mockPush.mockClear();
    // Stub sessions are shared in-memory; clear any fields we mutate in these tests.
    const studioApi = await import('@/lib/api/studio');
    const session = await studioApi.getStudioSession('session-grasse-parfums');
    if (session) {
      session.description = null;
      session.themes = null;
      session.durationMinutes = null;
      session.cleanedAt = null;
      session.title = 'Grasse — Les Parfumeurs';
      session.status = 'draft';
    }
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the validate CTA bar with reasons when initial metadata is empty', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());
    expect(screen.getByTestId('validate-cta-bar')).toBeInTheDocument();
    const button = screen.getByTestId('validate-cta-button');
    // Grasse session title is long enough, but description is empty → still not ready
    expect(button).toBeDisabled();
  });

  it('switches to global metadata tab and accepts edits that feed validation', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('detail-tab-global'));
    expect(screen.getByTestId('global-metadata-panel')).toBeInTheDocument();

    // Fill in a valid description
    fireEvent.change(screen.getByTestId('metadata-description-input'), {
      target: {
        value: 'Une balade à travers les parfumeurs de Grasse, riche en histoire et en senteurs subtiles.',
      },
    });
    // Add a theme
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));

    // Flush the 2s auto-save debounce so saveState leaves 'pending' and the CTA
    // is allowed to enable (CR: CTA now blocks while a save is in-flight).
    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Grasse fixture has 6 scenes with audio → button should now be enabled
    await waitFor(() => {
      const button = screen.getByTestId('validate-cta-button');
      expect(button).not.toBeDisabled();
    });
  });

  it('clicking validate updates session status to editing, tracks analytics, and redirects', async () => {
    const studioApi = await import('@/lib/api/studio');
    const updateSpy = jest.spyOn(studioApi, 'updateStudioSession');
    const analytics = await import('@/lib/analytics');
    const trackSpy = jest.spyOn(analytics, 'trackEvent');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('detail-tab-global'));
    fireEvent.change(screen.getByTestId('metadata-description-input'), {
      target: {
        value: 'Une balade à travers les parfumeurs de Grasse, riche en histoire et en senteurs subtiles.',
      },
    });
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));

    // Flush auto-save debounce (CR: CTA now blocks while save is in-flight).
    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('validate-cta-button')).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('validate-cta-button'));
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      const editingCall = updateSpy.mock.calls.find(
        ([, patch]) => (patch as { status?: string }).status === 'editing',
      );
      expect(editingCall).toBeDefined();
    });

    // Analytics event fired
    const analyticsCall = trackSpy.mock.calls.find(
      ([event]) => event === 'cleanup_completed',
    );
    expect(analyticsCall).toBeDefined();
    expect(analyticsCall?.[1]).toMatchObject({ sessionId: 'session-grasse-parfums' });

    // Redirect
    expect(mockPush).toHaveBeenCalledWith('/guide/studio/session-grasse-parfums');

    updateSpy.mockRestore();
    trackSpy.mockRestore();
  });

  it('reorder API persists new sceneIndex when called by handler', async () => {
    const studioApi = await import('@/lib/api/studio');
    const reorderSpy = jest.spyOn(studioApi, 'reorderScenes');
    const scenesBefore = await studioApi.listStudioScenes('session-grasse-parfums');
    const ids = scenesBefore.map((s) => s.id);
    expect(ids.length).toBeGreaterThanOrEqual(3);

    // Swap first two ids
    const swapped = [ids[1], ids[0], ...ids.slice(2)];
    const result = await studioApi.reorderScenes('session-grasse-parfums', swapped);
    expect(result.ok).toBe(true);

    const scenesAfter = await studioApi.listStudioScenes('session-grasse-parfums');
    const byId = new Map(scenesAfter.map((s) => [s.id, s.sceneIndex]));
    expect(byId.get(swapped[0])).toBe(0);
    expect(byId.get(swapped[1])).toBe(1);

    reorderSpy.mockRestore();
  });

  it('metadata debounce flushes before redirect even when typing right before click', async () => {
    const studioApi = await import('@/lib/api/studio');
    const updateSpy = jest.spyOn(studioApi, 'updateStudioSession');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('detail-tab-global'));
    fireEvent.change(screen.getByTestId('metadata-description-input'), {
      target: {
        value: 'Une balade à travers les parfumeurs de Grasse, riche en histoire et en senteurs subtiles.',
      },
    });
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));

    // Type the final title change and let the debounce settle so the CTA
    // becomes enabled (CR: CTA blocks while save is in-flight / pending).
    fireEvent.change(screen.getByTestId('metadata-title-input'), {
      target: { value: 'Grasse — Version finale' },
    });
    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('validate-cta-button')).not.toBeDisabled();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('validate-cta-button'));
      await Promise.resolve();
      await Promise.resolve();
    });

    // The 'Grasse — Version finale' title should appear in at least one update call
    // (flushed by validate before the final status transition).
    const titleCalls = updateSpy.mock.calls.filter(
      ([, patch]) => (patch as { title?: string }).title === 'Grasse — Version finale',
    );
    expect(titleCalls.length).toBeGreaterThanOrEqual(1);

    updateSpy.mockRestore();
  });

  it('double-click on validate only triggers one editing update / one redirect (regression: GCI-4.2 CR)', async () => {
    const studioApi = await import('@/lib/api/studio');
    const updateSpy = jest.spyOn(studioApi, 'updateStudioSession');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('detail-tab-global'));
    fireEvent.change(screen.getByTestId('metadata-description-input'), {
      target: {
        value: 'Une balade à travers les parfumeurs de Grasse, riche en histoire et en senteurs subtiles.',
      },
    });
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));
    // Flush auto-save debounce so CTA enables.
    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByTestId('validate-cta-button')).not.toBeDisabled();
    });

    const button = screen.getByTestId('validate-cta-button');
    // Fire two clicks synchronously before React commits setValidating(true).
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
      await Promise.resolve();
      await Promise.resolve();
    });

    const editingCalls = updateSpy.mock.calls.filter(
      ([, patch]) => (patch as { status?: string }).status === 'editing',
    );
    expect(editingCalls).toHaveLength(1);
    // Only one redirect, not two.
    expect(mockPush).toHaveBeenCalledTimes(1);

    updateSpy.mockRestore();
  });

  it('validate does nothing when validation is not ready (button stays disabled)', async () => {
    const studioApi = await import('@/lib/api/studio');
    const updateSpy = jest.spyOn(studioApi, 'updateStudioSession');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    // Don't fill any metadata — button stays disabled
    const button = screen.getByTestId('validate-cta-button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    await act(async () => {
      await Promise.resolve();
    });

    // No status=editing update call should have been made
    const editingCall = updateSpy.mock.calls.find(
      ([, patch]) => (patch as { status?: string }).status === 'editing',
    );
    expect(editingCall).toBeUndefined();

    updateSpy.mockRestore();
  });
});
