import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TTSControls } from '../tts-controls';
import { useTTSStore } from '@/lib/stores/tts-store';
import type { SceneSegment } from '@/types/studio';

jest.mock('@/lib/api/tts', () => ({
  requestTTS: jest.fn().mockResolvedValue({
    jobId: 'tts-123',
    status: 'processing',
    audioKey: null,
    language: 'en',
    durationMs: null,
  }),
  getTTSStatus: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => true,
  shouldUseRealApi: () => false,
}));

jest.mock('@/lib/studio/audio-player-service', () => ({
  audioPlayerService: { play: jest.fn(), stop: jest.fn() },
}));

jest.mock('@/lib/studio/studio-upload-service', () => ({
  getPlayableUrl: jest.fn().mockResolvedValue('https://s3.example.com/audio.wav'),
}));

const { requestTTS } = jest.requireMock('@/lib/api/tts');
const { audioPlayerService } = jest.requireMock('@/lib/studio/audio-player-service');

const makeSegment = (overrides?: Partial<SceneSegment>): SceneSegment => ({
  id: 'seg-1',
  sceneId: 'scene-1',
  segmentIndex: 0,
  audioKey: null,
  transcriptText: 'Hello world',
  startTimeMs: null,
  endTimeMs: null,
  language: 'en',
  sourceSegmentId: null,
  ttsGenerated: false,
  translationProvider: null,
  costProvider: null,
  costCharged: null,
  status: 'translated',
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('TTSControls', () => {
  beforeEach(() => {
    useTTSStore.getState().resetStore();
    jest.clearAllMocks();
  });

  it('shows GPU unavailable message when gpuAvailable is false', () => {
    render(
      <TTSControls segment={makeSegment()} text="Hello" language="en" gpuAvailable={false} />,
    );
    expect(screen.getByTestId('tts-gpu-unavailable')).toBeInTheDocument();
    expect(screen.getByText(/temporairement indisponible/)).toBeInTheDocument();
  });

  it('shows no text message when text is empty', () => {
    render(
      <TTSControls segment={makeSegment()} text="" language="en" gpuAvailable={true} />,
    );
    expect(screen.getByTestId('tts-no-text')).toBeInTheDocument();
  });

  it('renders generate button when text available and GPU up', () => {
    render(
      <TTSControls segment={makeSegment()} text="Hello world" language="en" gpuAvailable={true} />,
    );
    expect(screen.getByTestId('tts-generate-btn')).toBeInTheDocument();
    expect(screen.getByTestId('tts-generate-btn')).toHaveTextContent(/audio/);
  });

  it('calls requestTTS when generate button clicked', async () => {
    render(
      <TTSControls segment={makeSegment()} text="Hello world" language="en" gpuAvailable={true} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('tts-generate-btn'));
    });

    expect(requestTTS).toHaveBeenCalledWith('seg-1', 'Hello world', 'en');
  });

  it('shows processing state', () => {
    useTTSStore.getState().setSegmentStatus('seg-1', {
      status: 'processing',
      language: 'en',
    });

    render(
      <TTSControls segment={makeSegment()} text="Hello" language="en" gpuAvailable={true} />,
    );
    expect(screen.getByTestId('tts-processing')).toBeInTheDocument();
    expect(screen.getByText('Génération audio en cours...')).toBeInTheDocument();
    expect(screen.getByText('Langue : EN')).toBeInTheDocument();
  });

  it('shows completed state with play button', () => {
    useTTSStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      audioKey: 'guide-studio/tts/seg-1_en.wav',
      language: 'en',
      durationMs: 15000,
    });

    render(
      <TTSControls segment={makeSegment()} text="Hello" language="en" gpuAvailable={true} />,
    );
    expect(screen.getByTestId('tts-completed')).toBeInTheDocument();
    expect(screen.getByText('Audio TTS généré')).toBeInTheDocument();
    expect(screen.getByText(/15s/)).toBeInTheDocument();
    expect(screen.getByTestId('tts-play-btn')).toBeInTheDocument();
  });

  it('plays audio when play button clicked', async () => {
    useTTSStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      audioKey: 'guide-studio/tts/seg-1_en.wav',
      language: 'en',
    });

    render(
      <TTSControls segment={makeSegment()} text="Hello" language="en" gpuAvailable={true} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('tts-play-btn'));
    });

    // In stub mode, plays the audioKey directly
    expect(audioPlayerService.play).toHaveBeenCalledWith('guide-studio/tts/seg-1_en.wav');
  });

  it('shows failed state with retry button', () => {
    useTTSStore.getState().setSegmentStatus('seg-1', {
      status: 'failed',
      error: 'Échec de la génération audio.',
    });

    render(
      <TTSControls segment={makeSegment()} text="Hello" language="en" gpuAvailable={true} />,
    );
    expect(screen.getByTestId('tts-failed')).toBeInTheDocument();
    expect(screen.getByText('Échec de la génération audio.')).toBeInTheDocument();
    expect(screen.getByTestId('tts-retry-btn')).toBeInTheDocument();
  });

  it('retries TTS on retry button click', async () => {
    useTTSStore.getState().setSegmentStatus('seg-1', {
      status: 'failed',
      error: 'Error',
    });

    render(
      <TTSControls segment={makeSegment()} text="Hello world" language="en" gpuAvailable={true} />,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('tts-retry-btn'));
    });

    expect(requestTTS).toHaveBeenCalledWith('seg-1', 'Hello world', 'en');
  });

  it('shows regenerate button when completed', () => {
    useTTSStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      audioKey: 'tts/test.wav',
      language: 'en',
    });

    render(
      <TTSControls segment={makeSegment()} text="Hello" language="en" gpuAvailable={true} />,
    );
    expect(screen.getByTestId('tts-regenerate-btn')).toBeInTheDocument();
  });

  it('does not show generate button when processing', () => {
    useTTSStore.getState().setSegmentStatus('seg-1', {
      status: 'processing',
    });

    render(
      <TTSControls segment={makeSegment()} text="Hello" language="en" gpuAvailable={true} />,
    );
    expect(screen.queryByTestId('tts-generate-btn')).not.toBeInTheDocument();
  });
});
