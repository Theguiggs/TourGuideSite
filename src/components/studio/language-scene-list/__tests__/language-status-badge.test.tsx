import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageStatusBadge, type SceneLanguageStatus } from '../language-status-badge';
import { LanguageSceneList, computeSceneLanguageStatus, sortScenesByStatus } from '../language-scene-list';
import type { StudioScene, SceneSegment } from '@/types/studio';
import type { BatchProgress, FailedSceneEntry } from '@/lib/stores/language-batch-store';

// --- Mock the batch store ---

const mockState = {
  failedSceneIds: [] as string[],
  failedDetails: [] as FailedSceneEntry[],
  retryingScenes: [] as string[],
  batchProgress: null as BatchProgress | null,
};

jest.mock('@/lib/stores/language-batch-store', () => ({
  useLanguageBatchStore: (selector: (s: unknown) => unknown) => {
    // The component calls the store with cached selectors; we return mock data
    // based on what the selector function name/behavior is
    const result = selector({
      progress: { en: mockState.batchProgress },
      failedSceneDetails: { en: mockState.failedDetails },
      retryingScenes: { en: mockState.retryingScenes },
    });
    return result;
  },
  selectFailedScenes: (lang: string) => (s: Record<string, unknown>) => {
    const progress = (s as { progress: Record<string, BatchProgress | undefined> }).progress[lang];
    return progress?.failedScenes ?? [];
  },
  selectFailedSceneDetails: (lang: string) => (s: Record<string, unknown>) => {
    const details = (s as { failedSceneDetails: Record<string, FailedSceneEntry[]> }).failedSceneDetails[lang];
    return details ?? [];
  },
  selectRetryingScenes: (lang: string) => (s: Record<string, unknown>) => {
    const retrying = (s as { retryingScenes: Record<string, string[]> }).retryingScenes[lang];
    return retrying ?? [];
  },
  selectBatchProgress: (lang: string) => (s: Record<string, unknown>) => {
    const progress = (s as { progress: Record<string, BatchProgress | undefined> }).progress[lang];
    return progress ?? null;
  },
}));

jest.mock('@/lib/multilang/batch-translation-service', () => ({
  getErrorMessage: (code: number) => `Error ${code}`,
}));

// --- Helpers ---

function makeScene(overrides: Partial<StudioScene> = {}): StudioScene {
  return {
    id: 'scene-1',
    sessionId: 'session-1',
    sceneIndex: 0,
    title: 'Scene 1',
    originalAudioKey: null,
    studioAudioKey: null,
    transcriptText: 'Texte',
    transcriptionJobId: null,
    transcriptionStatus: null,
    qualityScore: null,
    qualityDetailsJson: null,
    codecStatus: null,
    status: 'edited',
    takesCount: null,
    selectedTakeIndex: null,
    moderationFeedback: null,
    photosRefs: [],
    latitude: null,
    longitude: null,
    poiDescription: null,
    archived: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

function makeSegment(overrides: Partial<SceneSegment> = {}): SceneSegment {
  return {
    id: 'seg-1',
    sceneId: 'scene-1',
    segmentIndex: 0,
    audioKey: 'guide-studio/test/audio.mp3',
    transcriptText: 'Translated text',
    startTimeMs: null,
    endTimeMs: null,
    language: 'en',
    sourceSegmentId: null,
    ttsGenerated: true,
    translationProvider: 'deepl',
    costProvider: null,
    costCharged: null,
    status: 'translated',
    manuallyEdited: false,
    translatedTitle: null,
    sourceUpdatedAt: '2026-01-20T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z',
    ...overrides,
  };
}

// --- Tests: LanguageStatusBadge ---

describe('LanguageStatusBadge', () => {
  const statuses: SceneLanguageStatus[] = ['ok', 'stale', 'processing', 'pending', 'failed'];

  it.each(statuses)('renders badge for status "%s" with correct testid and label', (status) => {
    render(<LanguageStatusBadge status={status} />);
    const badge = screen.getByTestId(`language-status-badge-${status}`);
    expect(badge).toBeInTheDocument();
  });

  it('renders ok badge with "Pret" label and green styling', () => {
    render(<LanguageStatusBadge status="ok" />);
    const badge = screen.getByTestId('language-status-badge-ok');
    expect(badge).toHaveTextContent('Pret');
    expect(badge.className).toContain('bg-olive-soft');
    expect(badge.className).toContain('text-success');
  });

  it('renders stale badge with "Modifie" label and orange styling', () => {
    render(<LanguageStatusBadge status="stale" />);
    const badge = screen.getByTestId('language-status-badge-stale');
    expect(badge).toHaveTextContent('Modifie');
    expect(badge.className).toContain('bg-ocre-soft');
  });

  it('renders processing badge with animated dot', () => {
    render(<LanguageStatusBadge status="processing" />);
    const badge = screen.getByTestId('language-status-badge-processing');
    expect(badge).toHaveTextContent('En cours');
    expect(badge.className).toContain('bg-mer-soft');
    const dot = badge.querySelector('span[aria-hidden="true"]');
    expect(dot?.className).toContain('animate-pulse');
  });

  it('renders pending badge with gray styling', () => {
    render(<LanguageStatusBadge status="pending" />);
    const badge = screen.getByTestId('language-status-badge-pending');
    expect(badge).toHaveTextContent('En attente');
    expect(badge.className).toContain('bg-paper-soft');
  });

  it('renders failed badge with red styling', () => {
    render(<LanguageStatusBadge status="failed" />);
    const badge = screen.getByTestId('language-status-badge-failed');
    expect(badge).toHaveTextContent('Echoue');
    expect(badge.className).toContain('bg-grenadine-soft');
    expect(badge.className).toContain('text-danger');
  });
});

// --- Tests: computeSceneLanguageStatus ---

describe('computeSceneLanguageStatus', () => {
  it('returns processing when batch is running and scene is current', () => {
    const scene = makeScene();
    const progress: BatchProgress = {
      total: 3, completed: 1, currentScene: 'scene-1', status: 'running', failedScenes: [],
    };
    expect(computeSceneLanguageStatus(scene, null, progress)).toBe('processing');
  });

  it('returns failed when scene is in batch failed list', () => {
    const scene = makeScene();
    const progress: BatchProgress = {
      total: 3, completed: 1, currentScene: null, status: 'failed', failedScenes: ['scene-1'],
    };
    expect(computeSceneLanguageStatus(scene, null, progress)).toBe('failed');
  });

  it('returns pending when no segment exists', () => {
    const scene = makeScene();
    expect(computeSceneLanguageStatus(scene, null, null)).toBe('pending');
  });

  it('returns pending when segment has no translated text', () => {
    const scene = makeScene();
    const segment = makeSegment({ transcriptText: null });
    expect(computeSceneLanguageStatus(scene, segment, null)).toBe('pending');
  });

  it('returns stale when source was updated after segment', () => {
    const scene = makeScene({ updatedAt: '2026-02-01T00:00:00Z' });
    const segment = makeSegment({ sourceUpdatedAt: '2026-01-15T00:00:00Z' });
    expect(computeSceneLanguageStatus(scene, segment, null)).toBe('stale');
  });

  it('returns ok when segment has text and audio', () => {
    const scene = makeScene({ updatedAt: '2026-01-10T00:00:00Z' });
    const segment = makeSegment({ sourceUpdatedAt: '2026-01-20T00:00:00Z', audioKey: 'guide-studio/test/audio.mp3', transcriptText: 'text' });
    expect(computeSceneLanguageStatus(scene, segment, null)).toBe('ok');
  });

  it('returns text_only when segment has text but no audio', () => {
    const scene = makeScene({ updatedAt: '2026-01-10T00:00:00Z' });
    const segment = makeSegment({ sourceUpdatedAt: '2026-01-20T00:00:00Z', audioKey: null, transcriptText: 'text' });
    expect(computeSceneLanguageStatus(scene, segment, null)).toBe('text_only');
  });
});

// --- Tests: LanguageSceneList ---

describe('LanguageSceneList', () => {
  beforeEach(() => {
    mockState.failedSceneIds = [];
    mockState.failedDetails = [];
    mockState.retryingScenes = [];
    mockState.batchProgress = null;
  });

  const defaultProps = {
    lang: 'en',
    completedSceneIds: [] as string[],
    segments: [] as SceneSegment[],
    onRetryScene: jest.fn(),
    onResumeBatch: jest.fn(),
    hasMissingScenes: false,
    onSceneClick: jest.fn(),
    onRetranslateStale: jest.fn(),
    onGenerateMissingAudio: jest.fn(),
    onListenPreview: jest.fn(),
    onFullPreview: jest.fn(),
    onSubmitLanguage: jest.fn(),
  };

  it('sorts failed scenes first', () => {
    const scenes = [
      makeScene({ id: 'ok-scene', title: 'OK Scene' }),
      makeScene({ id: 'failed-scene', title: 'Failed Scene' }),
    ];
    const segments = [
      makeSegment({ sceneId: 'ok-scene', language: 'en', audioKey: 'guide-studio/test/a.mp3', transcriptText: 'text', sourceUpdatedAt: '2026-02-01T00:00:00Z' }),
    ];

    mockState.batchProgress = {
      total: 2, completed: 1, currentScene: null, status: 'failed',
      failedScenes: ['failed-scene'],
    };
    mockState.failedDetails = [{ sceneId: 'failed-scene', errorCode: 2401, message: 'Translation failed' }];

    render(
      <LanguageSceneList
        {...defaultProps}
        scenes={scenes}
        segments={segments}
        completedSceneIds={['ok-scene']}
      />,
    );

    const rows = screen.getAllByTestId(/^scene-row-/);
    expect(rows[0]).toHaveAttribute('data-testid', 'scene-row-failed-scene');
    expect(rows[1]).toHaveAttribute('data-testid', 'scene-row-ok-scene');
  });

  it('displays a badge on each scene', () => {
    const scenes = [
      makeScene({ id: 's1', title: 'Scene A' }),
      makeScene({ id: 's2', title: 'Scene B' }),
    ];
    const segments = [
      makeSegment({ sceneId: 's1', language: 'en', audioKey: 'guide-studio/test/a.mp3', transcriptText: 'text', sourceUpdatedAt: '2026-02-01T00:00:00Z' }),
    ];

    render(
      <LanguageSceneList
        {...defaultProps}
        scenes={scenes}
        segments={segments}
        completedSceneIds={['s1']}
      />,
    );

    expect(screen.getByTestId('language-status-badge-ok')).toBeInTheDocument();
    expect(screen.getByTestId('language-status-badge-pending')).toBeInTheDocument();
  });

  it('shows batch retranslate button with stale count', () => {
    const scenes = [
      makeScene({ id: 's1', updatedAt: '2026-03-01T00:00:00Z' }),
      makeScene({ id: 's2', updatedAt: '2026-03-01T00:00:00Z' }),
    ];
    const segments = [
      makeSegment({ id: 'seg-s1', sceneId: 's1', language: 'en', sourceUpdatedAt: '2026-01-01T00:00:00Z', transcriptText: 'old' }),
      makeSegment({ id: 'seg-s2', sceneId: 's2', language: 'en', sourceUpdatedAt: '2026-01-01T00:00:00Z', transcriptText: 'old' }),
    ];

    render(<LanguageSceneList {...defaultProps} scenes={scenes} segments={segments} />);

    const btn = screen.getByTestId('batch-retranslate-stale-button');
    expect(btn).toHaveTextContent('Re-traduire les scenes modifiees (2)');
  });

  it('shows generate missing audio button with count', () => {
    const scenes = [makeScene({ id: 's1', updatedAt: '2026-01-01T00:00:00Z' })];
    const segments = [
      makeSegment({ sceneId: 's1', language: 'en', audioKey: null, transcriptText: 'text', sourceUpdatedAt: '2026-02-01T00:00:00Z' }),
    ];

    render(<LanguageSceneList {...defaultProps} scenes={scenes} segments={segments} />);

    const btn = screen.getByTestId('batch-generate-audio-button');
    expect(btn).toHaveTextContent('Generer les audio manquants (1)');
  });

  it('hides batch retranslate button when no stale scenes', () => {
    const scenes = [makeScene({ id: 's1', updatedAt: '2026-01-01T00:00:00Z' })];
    const segments = [
      makeSegment({ sceneId: 's1', language: 'en', audioKey: 'guide-studio/test/a.mp3', transcriptText: 'text', sourceUpdatedAt: '2026-02-01T00:00:00Z' }),
    ];

    render(<LanguageSceneList {...defaultProps} scenes={scenes} segments={segments} />);

    expect(screen.queryByTestId('batch-retranslate-stale-button')).not.toBeInTheDocument();
  });

  it('calls onSceneClick with correct sceneId when clicking a scene row', () => {
    const onSceneClick = jest.fn();
    const scenes = [makeScene({ id: 'click-scene', title: 'Clickable' })];

    render(
      <LanguageSceneList
        {...defaultProps}
        scenes={scenes}
        onSceneClick={onSceneClick}
      />,
    );

    fireEvent.click(screen.getByTestId('scene-row-click-scene'));
    expect(onSceneClick).toHaveBeenCalledWith('click-scene');
  });

  it('disables submit button when scenes have failed status', () => {
    const scenes = [makeScene({ id: 'f1', title: 'Failed' })];

    mockState.batchProgress = {
      total: 1, completed: 0, currentScene: null, status: 'failed',
      failedScenes: ['f1'],
    };
    mockState.failedDetails = [{ sceneId: 'f1', errorCode: 2401, message: 'err' }];

    render(
      <LanguageSceneList
        {...defaultProps}
        scenes={scenes}
      />,
    );

    const submitBtn = screen.getByTestId('submit-language-button');
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit button when all scenes are ok', () => {
    const scenes = [makeScene({ id: 's1', updatedAt: '2026-01-01T00:00:00Z' })];
    const segments = [
      makeSegment({ sceneId: 's1', language: 'en', audioKey: 'guide-studio/test/a.mp3', transcriptText: 'text', sourceUpdatedAt: '2026-02-01T00:00:00Z' }),
    ];

    render(
      <LanguageSceneList
        {...defaultProps}
        scenes={scenes}
        segments={segments}
        completedSceneIds={['s1']}
      />,
    );

    const submitBtn = screen.getByTestId('submit-language-button');
    expect(submitBtn).not.toBeDisabled();
  });
});
