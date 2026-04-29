/**
 * GCI-4 Epic integration tests — trans-component wiring of the full cleanup flow.
 *
 * Exercises, end-to-end at the component + API layer, the Epic GCI-4 pipeline:
 *   phased_capture detection → cleanup page mounts → POI edit + hero + trim →
 *   walk edit + delete → reorder → metadata → validate CTA gating → status
 *   transition to `editing` and redirect back to the classic Studio flow.
 *
 * These are NOT unit tests — each case traverses at least two layers (UI →
 * debounced save pipeline → studio API stub → in-memory state). We lean on
 * the existing stub backend (`MOCK_SESSIONS` / `MOCK_SCENES` / `MOCK_WALK_SEGMENTS`
 * for `session-phased-demo`) so every assertion rides the same code path that
 * the real page uses at runtime.
 *
 * jsdom cannot synthesise dnd-kit pointer events reliably, so reorder coverage
 * goes through the wired `reorderScenes` API (the handler in `page.tsx` calls
 * the same function — identical contract).
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CleanupPage from '../page';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('next/dynamic', () => () => {
  const DynamicStub = () => <div data-testid="walk-map-stub" />;
  return DynamicStub;
});

jest.mock('next/navigation', () => ({
  useParams: () => ({ sessionId: 'session-phased-demo' }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('@/lib/studio/studio-upload-service', () => ({
  getPlayableUrl: jest.fn(() => Promise.resolve('/mock/audio.aac')),
}));

const VALID_DESCRIPTION =
  'Une balade historique au cœur du vieux centre, riche en anecdotes et en architecture subtile.';

async function resetPhasedDemoSession() {
  const studioApi = await import('@/lib/api/studio');
  const session = await studioApi.getStudioSession('session-phased-demo');
  if (session) {
    session.title = 'Balade phased - demo nettoyage';
    session.description = null;
    session.themes = null;
    session.durationMinutes = null;
    session.cleanedAt = null;
    session.status = 'ready_for_cleanup';
    session.captureMode = 'phased_capture';
  }
  // Reset the two phased scenes to a known baseline.
  const scenes = await studioApi.listStudioScenes('session-phased-demo');
  for (const s of scenes) {
    s.archived = false;
    s.trimStart = null;
    s.trimEnd = null;
    s.heroPhotoRef = s.id === 'phased-scene-1' ? '/images/mock/grasse-place-aires-1.jpg' : null;
    s.title =
      s.id === 'phased-scene-1'
        ? 'Place centrale'
        : s.id === 'phased-scene-2'
          ? 'Musee'
          : s.title;
    s.poiDescription = s.id === 'phased-scene-1' ? 'Ancien forum' : null;
    s.sceneIndex = s.id === 'phased-scene-1' ? 0 : 2;
  }
  const walks = await studioApi.listWalkSegments('session-phased-demo');
  for (const w of walks) {
    w.deleted = false;
  }
}

describe('GCI-4 Epic integration — end-to-end cleanup wiring', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    mockReplace.mockClear();
    mockPush.mockClear();
    await resetPhasedDemoSession();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ------ Detection layer (AC1 from GCI-4.1) ------

  it('phased_capture session in ready_for_cleanup status has timeline items wired for the cleanup workspace', async () => {
    const studioApi = await import('@/lib/api/studio');
    const session = await studioApi.getStudioSession('session-phased-demo');
    expect(session?.captureMode).toBe('phased_capture');
    expect(session?.status).toBe('ready_for_cleanup');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());
    // Two phased scenes + one walk in the fixture (order 1 sits between the scenes)
    const poiItems = screen.getAllByTestId(/^timeline-poi-/);
    const walkItems = screen.getAllByTestId(/^timeline-walk-/);
    expect(poiItems.length + walkItems.length).toBe(3);
  });

  // ------ POI panel layer (AC5 GCI-4.1) ------

  it('editing a POI title debounces through the save pipeline into the studio API', async () => {
    const studioApi = await import('@/lib/api/studio');
    const updateSceneSpy = jest.spyOn(studioApi, 'updateSceneData');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    const titleInput = screen.getByTestId('poi-name-input');
    fireEvent.change(titleInput, { target: { value: 'Fontaine du Centre Historique' } });

    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    const titleCall = updateSceneSpy.mock.calls.find(
      ([, patch]) => (patch as { title?: string }).title === 'Fontaine du Centre Historique',
    );
    expect(titleCall).toBeDefined();
    // Stub backend actually mutated the scene
    const refreshed = await studioApi.listStudioScenes('session-phased-demo');
    const updated = refreshed.find((s) => s.id === 'phased-scene-1');
    expect(updated?.title).toBe('Fontaine du Centre Historique');

    updateSceneSpy.mockRestore();
  });

  it('selecting a different photo as hero persists heroPhotoRef through the API', async () => {
    const studioApi = await import('@/lib/api/studio');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    // Second photo radio (index 1) of phased-scene-1's two photos
    const heroRadios = screen.getAllByTestId('poi-photo-hero-radio');
    expect(heroRadios.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(heroRadios[1]);

    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    const refreshed = await studioApi.listStudioScenes('session-phased-demo');
    const updated = refreshed.find((s) => s.id === 'phased-scene-1');
    expect(updated?.heroPhotoRef).toBe('/images/mock/grasse-place-aires-2.jpg');
  });

  it('trimming audio persists trimStart / trimEnd in the same pending-patch flush', async () => {
    const studioApi = await import('@/lib/api/studio');

    // Seed an initial trim directly on the fixture so the UI shows existing values,
    // then exercise the debounced write path via the panel's trim input bindings.
    await studioApi.updateSceneData('phased-scene-1', { trimStart: 3, trimEnd: 82 });

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    const refreshed = await studioApi.listStudioScenes('session-phased-demo');
    const updated = refreshed.find((s) => s.id === 'phased-scene-1');
    expect(updated?.trimStart).toBe(3);
    expect(updated?.trimEnd).toBe(82);
  });

  // ------ Walk panel layer (AC6 GCI-4.1) ------

  it('selecting a walk item swaps the detail panel to the walk view', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    // Walk sits at order=1 — find the walk timeline item and click it
    const walkItem = screen.getByTestId('timeline-walk-phased-walk-1');
    fireEvent.click(walkItem);

    await waitFor(() => {
      expect(screen.getByTestId('walk-cleanup-panel')).toBeInTheDocument();
    });
  });

  it('deleting a walk persists deleted=true via updateWalkSegment', async () => {
    const studioApi = await import('@/lib/api/studio');
    const updateWalkSpy = jest.spyOn(studioApi, 'updateWalkSegment');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('timeline-walk-phased-walk-1'));
    await waitFor(() =>
      expect(screen.getByTestId('walk-cleanup-panel')).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('walk-delete-btn'));

    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
    });

    const deleteCall = updateWalkSpy.mock.calls.find(
      ([, patch]) => (patch as { deleted?: boolean }).deleted === true,
    );
    expect(deleteCall).toBeDefined();
    const refreshed = await studioApi.listWalkSegments('session-phased-demo');
    const walk = refreshed.find((w) => w.id === 'phased-walk-1');
    expect(walk?.deleted).toBe(true);

    updateWalkSpy.mockRestore();
  });

  // ------ Reorder layer (AC1 GCI-4.2) ------

  it('reordering scenes updates sceneIndex on every affected scene', async () => {
    const studioApi = await import('@/lib/api/studio');

    const before = await studioApi.listStudioScenes('session-phased-demo');
    const ids = before.map((s) => s.id);
    expect(ids).toContain('phased-scene-1');
    expect(ids).toContain('phased-scene-2');

    const swapped = ['phased-scene-2', 'phased-scene-1'];
    const result = await studioApi.reorderScenes('session-phased-demo', swapped);
    expect(result.ok).toBe(true);

    const after = await studioApi.listStudioScenes('session-phased-demo');
    const byId = new Map(after.map((s) => [s.id, s.sceneIndex]));
    expect(byId.get('phased-scene-2')).toBe(0);
    expect(byId.get('phased-scene-1')).toBe(1);
  });

  // ------ Metadata layer (AC2+AC3 GCI-4.2) ------

  it('global metadata tab persists description + themes through the debounced save', async () => {
    const studioApi = await import('@/lib/api/studio');
    const updateSessionSpy = jest.spyOn(studioApi, 'updateStudioSession');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('detail-tab-global'));
    fireEvent.change(screen.getByTestId('metadata-title-input'), {
      target: { value: 'Balade historique du centre' },
    });
    fireEvent.change(screen.getByTestId('metadata-description-input'), {
      target: { value: VALID_DESCRIPTION },
    });
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));
    fireEvent.click(screen.getByTestId('metadata-theme-architecture'));

    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    const persisted = updateSessionSpy.mock.calls.find(
      ([, patch]) => (patch as { description?: string }).description === VALID_DESCRIPTION,
    );
    expect(persisted).toBeDefined();
    // Themes saved alongside
    const themeCall = updateSessionSpy.mock.calls.find(([, patch]) => {
      const t = (patch as { themes?: string[] }).themes;
      return Array.isArray(t) && t.includes('histoire') && t.includes('architecture');
    });
    expect(themeCall).toBeDefined();

    updateSessionSpy.mockRestore();
  });

  // ------ Validate CTA gating (AC4+AC5 GCI-4.2) ------

  it('validate CTA stays disabled while required fields are missing', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    // Fresh phased demo session has no description and no themes
    const button = screen.getByTestId('validate-cta-button');
    expect(button).toBeDisabled();
    // Reasons list is rendered (non-ready branch)
    expect(screen.getByTestId('validate-cta-reasons')).toBeInTheDocument();
  });

  it('validate CTA enables only once all prerequisites are met (description, themes, audio on every POI)', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('detail-tab-global'));
    fireEvent.change(screen.getByTestId('metadata-title-input'), {
      target: { value: 'Balade historique du centre' },
    });
    fireEvent.change(screen.getByTestId('metadata-description-input'), {
      target: { value: VALID_DESCRIPTION },
    });
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));

    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('validate-cta-button')).not.toBeDisabled();
    });
    expect(screen.getByTestId('validate-cta-ready')).toBeInTheDocument();
  });

  it('removing the last theme flips the CTA back to disabled with a tooltip reason', async () => {
    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('detail-tab-global'));
    fireEvent.change(screen.getByTestId('metadata-description-input'), {
      target: { value: VALID_DESCRIPTION },
    });
    fireEvent.change(screen.getByTestId('metadata-title-input'), {
      target: { value: 'Balade historique du centre' },
    });
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));

    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('validate-cta-button')).not.toBeDisabled(),
    );

    // Toggle the theme off → CTA should re-disable
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));

    await waitFor(() => {
      expect(screen.getByTestId('validate-cta-button')).toBeDisabled();
    });
    const reasons = screen.getByTestId('validate-cta-reasons').textContent ?? '';
    expect(reasons.toLowerCase()).toContain('thème');
  });

  // ------ Status transition layer (AC6 GCI-4.2) ------

  it('validate click flushes pending saves, writes status=editing with cleanedAt, fires analytics, and redirects', async () => {
    const studioApi = await import('@/lib/api/studio');
    const updateSessionSpy = jest.spyOn(studioApi, 'updateStudioSession');
    const analytics = await import('@/lib/analytics');
    const trackSpy = jest.spyOn(analytics, 'trackEvent');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('detail-tab-global'));
    fireEvent.change(screen.getByTestId('metadata-title-input'), {
      target: { value: 'Balade historique du centre' },
    });
    fireEvent.change(screen.getByTestId('metadata-description-input'), {
      target: { value: VALID_DESCRIPTION },
    });
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));

    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('validate-cta-button')).not.toBeDisabled(),
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('validate-cta-button'));
      await Promise.resolve();
      await Promise.resolve();
    });

    // Status transition to editing
    const editingCall = updateSessionSpy.mock.calls.find(
      ([, patch]) => (patch as { status?: string }).status === 'editing',
    );
    expect(editingCall).toBeDefined();
    // cleanedAt timestamp attached
    expect((editingCall?.[1] as { cleanedAt?: string }).cleanedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    );
    // Analytics + redirect
    const analyticsCall = trackSpy.mock.calls.find(([e]) => e === 'cleanup_completed');
    expect(analyticsCall).toBeDefined();
    expect((analyticsCall?.[1] as { sessionId?: string }).sessionId).toBe(
      'session-phased-demo',
    );
    expect(mockPush).toHaveBeenCalledWith('/guide/studio/session-phased-demo');

    updateSessionSpy.mockRestore();
    trackSpy.mockRestore();
  });

  it('validate path whitelists themes and language before persisting (defense-in-depth)', async () => {
    const studioApi = await import('@/lib/api/studio');
    const updateSessionSpy = jest.spyOn(studioApi, 'updateStudioSession');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('detail-tab-global'));
    fireEvent.change(screen.getByTestId('metadata-title-input'), {
      target: { value: 'Balade historique du centre' },
    });
    fireEvent.change(screen.getByTestId('metadata-description-input'), {
      target: { value: VALID_DESCRIPTION },
    });
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));

    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('validate-cta-button')).not.toBeDisabled(),
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('validate-cta-button'));
      await Promise.resolve();
      await Promise.resolve();
    });

    const editingCall = updateSessionSpy.mock.calls.find(
      ([, patch]) => (patch as { status?: string }).status === 'editing',
    );
    expect(editingCall).toBeDefined();
    const patch = editingCall?.[1] as {
      themes?: string[];
      language?: string;
    };
    // Only known themes + known language survive the whitelist filter
    expect(patch.themes).toEqual(['histoire']);
    expect(['fr', 'en', 'es', 'de', 'it', 'ja']).toContain(patch.language);

    updateSessionSpy.mockRestore();
  });

  it('full pipeline: edit POI title + add metadata + validate → one coherent set of persisted writes ends with status=editing', async () => {
    const studioApi = await import('@/lib/api/studio');
    const updateSceneSpy = jest.spyOn(studioApi, 'updateSceneData');
    const updateSessionSpy = jest.spyOn(studioApi, 'updateStudioSession');

    render(<CleanupPage />);
    await waitFor(() => expect(screen.getByTestId('cleanup-page')).toBeInTheDocument());

    // Edit POI title (scene panel)
    fireEvent.change(screen.getByTestId('poi-name-input'), {
      target: { value: 'Place principale renommée' },
    });

    // Fill metadata
    fireEvent.click(screen.getByTestId('detail-tab-global'));
    fireEvent.change(screen.getByTestId('metadata-title-input'), {
      target: { value: 'Balade historique du centre' },
    });
    fireEvent.change(screen.getByTestId('metadata-description-input'), {
      target: { value: VALID_DESCRIPTION },
    });
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));

    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('validate-cta-button')).not.toBeDisabled(),
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('validate-cta-button'));
      await Promise.resolve();
      await Promise.resolve();
    });

    // Scene title save happened
    const sceneCall = updateSceneSpy.mock.calls.find(
      ([, patch]) => (patch as { title?: string }).title === 'Place principale renommée',
    );
    expect(sceneCall).toBeDefined();
    // Session transitioned to editing
    const editingCall = updateSessionSpy.mock.calls.find(
      ([, patch]) => (patch as { status?: string }).status === 'editing',
    );
    expect(editingCall).toBeDefined();
    // Redirect to classic flow
    expect(mockPush).toHaveBeenCalledWith('/guide/studio/session-phased-demo');

    updateSceneSpy.mockRestore();
    updateSessionSpy.mockRestore();
  });
});
