import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ManuallyEditedModal, truncatePreview } from '../manually-edited-modal';
import { StalenessAlert, buildStaleSceneInfos } from '../staleness-alert';
import type { SceneSegment, StudioScene } from '@/types/studio';

// --- Mocks ---

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// --- Fixtures ---

function makeSegment(overrides: Partial<SceneSegment> = {}): SceneSegment {
  return {
    id: 'seg-1',
    sceneId: 'scene-1',
    segmentIndex: 0,
    audioKey: 'audio.mp3',
    transcriptText: 'Hello world translated',
    startTimeMs: null,
    endTimeMs: null,
    language: 'en',
    sourceSegmentId: 'source-seg-1',
    ttsGenerated: true,
    translationProvider: 'marianmt',
    costProvider: null,
    costCharged: null,
    status: 'translated',
    manuallyEdited: false,
    translatedTitle: null,
    sourceUpdatedAt: '2026-03-01T00:00:00.000Z',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeScene(overrides: Partial<StudioScene> = {}): StudioScene {
  return {
    id: 'scene-1',
    sessionId: 'session-1',
    sceneIndex: 0,
    title: 'Place Vendome',
    originalAudioKey: null,
    studioAudioKey: null,
    transcriptText: 'Bonjour le monde',
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
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-15T00:00:00.000Z',
    ...overrides,
  };
}

// --- ManuallyEditedModal tests ---

describe('ManuallyEditedModal', () => {
  it('displays the confirmation message with scene name', () => {
    render(
      <ManuallyEditedModal
        isOpen
        sceneName="Scene 3 - Place Vendome"
        editedTextPreview="Hello world translated text"
        language="en"
        onKeep={jest.fn()}
        onUpdate={jest.fn()}
      />,
    );

    expect(screen.getByTestId('manually-edited-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-scene-name')).toHaveTextContent('Scene 3 - Place Vendome');
    expect(screen.getByTestId('modal-warning-message')).toHaveTextContent(
      'Vous avez corrige cette traduction a la main. Mettre a jour ecrasera vos corrections. Continuer ?',
    );
    expect(screen.getByTestId('modal-text-preview')).toHaveTextContent('Hello world translated text');
  });

  it('calls onKeep when "Conserver ma version" is clicked', () => {
    const onKeep = jest.fn();

    render(
      <ManuallyEditedModal
        isOpen
        sceneName="Scene 1"
        editedTextPreview="My corrected text"
        language="en"
        onKeep={onKeep}
        onUpdate={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('modal-keep-button'));

    expect(onKeep).toHaveBeenCalledTimes(1);
  });

  it('calls onUpdate when "Mettre a jour" is clicked', () => {
    const onUpdate = jest.fn();

    render(
      <ManuallyEditedModal
        isOpen
        sceneName="Scene 1"
        editedTextPreview="My corrected text"
        language="en"
        onKeep={jest.fn()}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByTestId('modal-update-button'));

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ManuallyEditedModal
        isOpen={false}
        sceneName="Scene 1"
        editedTextPreview="text"
        language="en"
        onKeep={jest.fn()}
        onUpdate={jest.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});

// --- truncatePreview tests ---

describe('truncatePreview', () => {
  it('returns full text when under 100 chars', () => {
    const text = 'Short text';
    expect(truncatePreview(text)).toBe(text);
  });

  it('truncates text over 100 chars with ellipsis', () => {
    const text = 'A'.repeat(150);
    const result = truncatePreview(text);
    expect(result.length).toBe(101); // 100 chars + ellipsis char
    expect(result.endsWith('\u2026')).toBe(true);
  });
});

// --- StalenessAlert with manuallyEdited filtering ---

describe('StalenessAlert with ManuallyEdited filtering', () => {
  it('retranslates auto scenes directly without showing modal', () => {
    const onRetranslate = jest.fn();
    const segments = [
      makeSegment({ id: 'seg-1', sceneId: 'scene-1', manuallyEdited: false }),
      makeSegment({ id: 'seg-2', sceneId: 'scene-2', manuallyEdited: false }),
    ];
    const scenes = [
      makeScene({ id: 'scene-1' }),
      makeScene({ id: 'scene-2' }),
    ];

    render(
      <StalenessAlert
        staleCount={2}
        staleSegmentIds={['seg-1', 'seg-2']}
        segments={segments}
        scenes={scenes}
        onRetranslate={onRetranslate}
      />,
    );

    fireEvent.click(screen.getByTestId('staleness-retranslate-button'));

    // No modal shown, directly calls onRetranslate
    expect(screen.queryByTestId('manually-edited-modal')).not.toBeInTheDocument();
    expect(onRetranslate).toHaveBeenCalledWith(['seg-1', 'seg-2']);
  });

  it('shows modal for manually edited scenes', () => {
    const onRetranslate = jest.fn();
    const segments = [
      makeSegment({ id: 'seg-1', sceneId: 'scene-1', manuallyEdited: true, transcriptText: 'My corrected translation' }),
    ];
    const scenes = [
      makeScene({ id: 'scene-1', title: 'Place Vendome' }),
    ];

    render(
      <StalenessAlert
        staleCount={1}
        staleSegmentIds={['seg-1']}
        segments={segments}
        scenes={scenes}
        onRetranslate={onRetranslate}
      />,
    );

    fireEvent.click(screen.getByTestId('staleness-retranslate-button'));

    // Modal is shown
    expect(screen.getByTestId('manually-edited-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-scene-name')).toHaveTextContent('Place Vendome');
    expect(onRetranslate).not.toHaveBeenCalled();
  });

  it('handles mixed batch: auto scenes + manual scene with keep', () => {
    const onRetranslate = jest.fn();
    const segments = [
      makeSegment({ id: 'seg-1', sceneId: 'scene-1', manuallyEdited: false }),
      makeSegment({ id: 'seg-2', sceneId: 'scene-2', manuallyEdited: true, transcriptText: 'Manual edit' }),
    ];
    const scenes = [
      makeScene({ id: 'scene-1' }),
      makeScene({ id: 'scene-2', title: 'Scene Manuelle' }),
    ];

    render(
      <StalenessAlert
        staleCount={2}
        staleSegmentIds={['seg-1', 'seg-2']}
        segments={segments}
        scenes={scenes}
        onRetranslate={onRetranslate}
      />,
    );

    fireEvent.click(screen.getByTestId('staleness-retranslate-button'));

    // Modal shown for manual scene
    expect(screen.getByTestId('manually-edited-modal')).toBeInTheDocument();

    // User clicks "Conserver ma version"
    fireEvent.click(screen.getByTestId('modal-keep-button'));

    // Only auto scene retranslated
    expect(onRetranslate).toHaveBeenCalledWith(['seg-1']);
  });

  it('handles mixed batch: auto scenes + manual scene with update', () => {
    const onRetranslate = jest.fn();
    const segments = [
      makeSegment({ id: 'seg-1', sceneId: 'scene-1', manuallyEdited: false }),
      makeSegment({ id: 'seg-2', sceneId: 'scene-2', manuallyEdited: true, transcriptText: 'Manual edit' }),
    ];
    const scenes = [
      makeScene({ id: 'scene-1' }),
      makeScene({ id: 'scene-2', title: 'Scene Manuelle' }),
    ];

    render(
      <StalenessAlert
        staleCount={2}
        staleSegmentIds={['seg-1', 'seg-2']}
        segments={segments}
        scenes={scenes}
        onRetranslate={onRetranslate}
      />,
    );

    fireEvent.click(screen.getByTestId('staleness-retranslate-button'));

    // Modal shown for manual scene
    expect(screen.getByTestId('manually-edited-modal')).toBeInTheDocument();

    // User clicks "Mettre a jour"
    fireEvent.click(screen.getByTestId('modal-update-button'));

    // Both scenes retranslated
    expect(onRetranslate).toHaveBeenCalledWith(['seg-1', 'seg-2']);
  });
});

// --- buildStaleSceneInfos ---

describe('buildStaleSceneInfos', () => {
  it('builds infos from segment ids matching segments and scenes', () => {
    const segments = [
      makeSegment({ id: 'seg-1', sceneId: 'scene-1', manuallyEdited: true }),
      makeSegment({ id: 'seg-2', sceneId: 'scene-2', manuallyEdited: false }),
    ];
    const scenes = [
      makeScene({ id: 'scene-1' }),
      makeScene({ id: 'scene-2' }),
    ];

    const result = buildStaleSceneInfos(['seg-1', 'seg-2'], segments, scenes);

    expect(result).toHaveLength(2);
    expect(result[0].segmentId).toBe('seg-1');
    expect(result[0].segment.manuallyEdited).toBe(true);
    expect(result[1].segmentId).toBe('seg-2');
    expect(result[1].segment.manuallyEdited).toBe(false);
  });
});

// --- manuallyEdited reset in batch-translation-service ---

describe('batch-translation-service manuallyEdited reset', () => {
  it('includes manuallyEdited: false in segment updates after re-translation', async () => {
    // This test validates the contract: updateSceneSegment is called with manuallyEdited: false
    // We import the module and check the code path

    // Mock all dependencies
    jest.resetModules();

    const mockUpdateSceneSegment = jest.fn().mockResolvedValue({ ok: true });

    jest.doMock('@/lib/api/studio', () => ({
      updateSceneSegment: mockUpdateSceneSegment,
      listSegmentsByScene: jest.fn().mockResolvedValue([]),
      getStudioSession: jest.fn().mockResolvedValue(null),
      updateStudioSession: jest.fn().mockResolvedValue({ ok: true }),
    }));

    jest.doMock('@/lib/api/translation', () => ({
      requestTranslation: jest.fn().mockResolvedValue({
        jobId: 'job-1',
        status: 'completed',
        translatedText: 'Translated text',
        provider: 'marianmt',
        costProvider: null,
        costCharged: null,
      }),
      getTranslationStatus: jest.fn(),
    }));

    jest.doMock('@/lib/api/tts', () => ({
      requestTTS: jest.fn().mockResolvedValue({
        jobId: 'tts-1',
        status: 'completed',
        audioKey: 'audio.mp3',
        language: 'en',
        durationMs: 5000,
      }),
      getTTSStatus: jest.fn(),
    }));

    jest.doMock('@/lib/multilang/provider-router', () => ({
      getProviderForTier: jest.fn().mockReturnValue('marianmt'),
      isLanguagePremium: jest.fn().mockReturnValue(false),
    }));

    jest.doMock('@/lib/logger', () => ({
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    }));

    const { retryScene } = await import('@/lib/multilang/batch-translation-service');

    const scene = makeScene({ id: 'scene-1', transcriptText: 'Bonjour' });

    await retryScene(scene, 'en', 'standard');

    expect(mockUpdateSceneSegment).toHaveBeenCalledTimes(1);
    const updateCall = mockUpdateSceneSegment.mock.calls[0][1];
    expect(updateCall.manuallyEdited).toBe(false);
    expect(updateCall.sourceUpdatedAt).toBeDefined();
  });
});
