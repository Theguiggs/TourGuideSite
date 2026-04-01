import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LanguagePreviewPlayer } from '../language-preview-player';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import type { StudioScene, SceneSegment } from '@/types/studio';

// --- Mocks ---

jest.mock('@/lib/studio/audio-player-service', () => ({
  audioPlayerService: {
    play: jest.fn().mockResolvedValue(true),
    stop: jest.fn(),
    pause: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    getState: jest.fn(() => ({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      currentUrl: null,
    })),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// --- Test data ---

const makeScene = (id: string, title: string | null = null): StudioScene => ({
  id,
  sessionId: 'session-1',
  sceneIndex: 0,
  title,
  originalAudioKey: null,
  studioAudioKey: null,
  transcriptText: 'Some text',
  transcriptionJobId: null,
  transcriptionStatus: null,
  qualityScore: null,
  qualityDetailsJson: null,
  codecStatus: null,
  status: 'finalized',
  takesCount: null,
  selectedTakeIndex: null,
  moderationFeedback: null,
  photosRefs: [],
  latitude: null,
  longitude: null,
  poiDescription: null,
  archived: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const makeSegment = (
  sceneId: string,
  language: string,
  audioKey: string | null = 'audio-key',
): SceneSegment => ({
  id: `seg-${sceneId}-${language}`,
  sceneId,
  segmentIndex: 0,
  audioKey,
  transcriptText: 'Translated text',
  startTimeMs: null,
  endTimeMs: null,
  language,
  sourceSegmentId: null,
  ttsGenerated: false,
  translationProvider: null,
  costProvider: null,
  costCharged: null,
  status: 'translated',
  manuallyEdited: false,
  translatedTitle: null,
  sourceUpdatedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

describe('LanguagePreviewPlayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('plays teaser (10s) of scene 1 in target language', async () => {
    const scenes = [makeScene('s1', 'Notre-Dame'), makeScene('s2', 'Louvre')];
    const segments = [
      makeSegment('s1', 'en', 'audio-en-s1'),
      makeSegment('s2', 'en', 'audio-en-s2'),
    ];

    render(
      <LanguagePreviewPlayer scenes={scenes} segments={segments} language="en" />,
    );

    const teaserBtn = screen.getByTestId('teaser-btn');
    expect(teaserBtn).toHaveTextContent('Ecouter un extrait');

    await act(async () => {
      fireEvent.click(teaserBtn);
    });

    expect(audioPlayerService.play).toHaveBeenCalledWith('audio-en-s1');
    expect(teaserBtn).toHaveTextContent('Arreter');

    // After 10 seconds, should stop
    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(audioPlayerService.stop).toHaveBeenCalled();
  });

  it('plays full preview — all scenes sequentially', async () => {
    const scenes = [makeScene('s1', 'Notre-Dame'), makeScene('s2', 'Louvre')];
    const segments = [
      makeSegment('s1', 'en', 'audio-en-s1'),
      makeSegment('s2', 'en', 'audio-en-s2'),
    ];

    render(
      <LanguagePreviewPlayer scenes={scenes} segments={segments} language="en" />,
    );

    const fullBtn = screen.getByTestId('full-preview-btn');
    expect(fullBtn).toHaveTextContent('Preview complete');

    await act(async () => {
      fireEvent.click(fullBtn);
    });

    expect(audioPlayerService.play).toHaveBeenCalledWith('audio-en-s1');
    expect(fullBtn).toHaveTextContent('Arreter');

    // Verify current scene info is displayed
    expect(screen.getByTestId('current-scene-info')).toHaveTextContent('Scene 1/2');
  });

  it('shows alert when scenes are missing audio in selected language', async () => {
    const scenes = [makeScene('s1', 'Notre-Dame'), makeScene('s2', 'Louvre')];
    const segments = [
      makeSegment('s1', 'en', 'audio-en-s1'),
      // s2 has no audio in English
    ];

    render(
      <LanguagePreviewPlayer scenes={scenes} segments={segments} language="en" />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('teaser-btn'));
    });

    const alert = screen.getByTestId('preview-alert');
    expect(alert).toHaveTextContent('1 scene(s) sans audio en EN');
  });

  it('shows alert when no audio available at all', async () => {
    const scenes = [makeScene('s1'), makeScene('s2')];
    const segments: SceneSegment[] = [];

    render(
      <LanguagePreviewPlayer scenes={scenes} segments={segments} language="de" />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('full-preview-btn'));
    });

    const alert = screen.getByTestId('preview-alert');
    expect(alert).toHaveTextContent('Aucun audio disponible en DE');
    expect(audioPlayerService.play).not.toHaveBeenCalled();
  });
});
