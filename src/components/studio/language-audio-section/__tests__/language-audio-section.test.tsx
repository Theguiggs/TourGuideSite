import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageAudioSection } from '../language-audio-section';
import { TTSControls } from '@/components/studio/tts-controls';
import { AudioRecorder } from '@/components/studio/audio-recorder';
import { AudioPlayerBar } from '@/components/studio/audio-player';
import type { SceneSegment } from '@/types/studio';

// --- Mocks ---

jest.mock('@/components/studio/tts-controls/tts-controls', () => ({
  TTSControls: jest.fn(() => <div data-testid="mock-tts-controls" />),
}));

jest.mock('@/components/studio/audio-recorder/audio-recorder', () => ({
  AudioRecorder: jest.fn(() => <div data-testid="mock-audio-recorder" />),
}));

jest.mock('@/components/studio/audio-player/audio-player-bar', () => ({
  AudioPlayerBar: jest.fn(() => <div data-testid="mock-audio-player" />),
}));

jest.mock('@/lib/studio/audio-player-service', () => ({
  audioPlayerService: {
    play: jest.fn(),
    pause: jest.fn(),
    getState: jest.fn(() => ({ isPlaying: false, currentTime: 0, duration: 0, currentUrl: null })),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('@/lib/api/studio', () => ({
  updateSceneSegment: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: jest.fn(() => true),
}));

jest.mock('@/lib/studio/studio-upload-service', () => ({
  getPlayableUrl: jest.fn(),
}));

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
    id: 'seg-en-1',
    sceneId: 'scene-1',
    segmentIndex: 0,
    audioKey: null,
    transcriptText: 'Hello world',
    startTimeMs: null,
    endTimeMs: null,
    language: 'en',
    sourceSegmentId: 'seg-fr-1',
    ttsGenerated: false,
    translationProvider: 'marianmt',
    costProvider: null,
    costCharged: null,
    status: 'translated',
    manuallyEdited: false,
    translatedTitle: null,
    sourceUpdatedAt: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

const defaultProps = {
  segment: makeSegment(),
  sessionId: 'session-abc',
  targetLanguage: 'en',
  translatedText: 'Hello world',
  gpuAvailable: true,
};

// --- Tests ---

describe('LanguageAudioSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders TTSControls with target language and translated text when "Regenerer TTS" is clicked', () => {
    render(<LanguageAudioSection {...defaultProps} />);

    // TTSControls should not be visible initially
    expect(screen.queryByTestId('mock-tts-controls')).not.toBeInTheDocument();

    // Click the TTS button
    fireEvent.click(screen.getByTestId('toggle-tts-btn'));

    // TTSControls should now be visible
    expect(screen.getByTestId('mock-tts-controls')).toBeInTheDocument();

    // Verify TTSControls received correct props
    const ttsControlsMock = TTSControls as unknown as jest.Mock;
    const lastCall = ttsControlsMock.mock.calls[ttsControlsMock.mock.calls.length - 1][0];
    expect(lastCall.language).toBe('en');
    expect(lastCall.text).toBe('Hello world');
    expect(lastCall.segment).toEqual(defaultProps.segment);
    expect(lastCall.gpuAvailable).toBe(true);
    expect(lastCall.onSaveAsSceneAudio).toBeInstanceOf(Function);
  });

  it('renders AudioRecorder when "Enregistrement rapide" is clicked and calls onRecordingComplete', () => {
    render(<LanguageAudioSection {...defaultProps} />);

    // AudioRecorder should not be visible initially
    expect(screen.queryByTestId('mock-audio-recorder')).not.toBeInTheDocument();

    // Click the recorder button
    fireEvent.click(screen.getByTestId('toggle-recorder-btn'));

    // AudioRecorder should now be visible
    expect(screen.getByTestId('mock-audio-recorder')).toBeInTheDocument();

    // Verify AudioRecorder received correct props
    const audioRecorderMock = AudioRecorder as unknown as jest.Mock;
    const lastCall = audioRecorderMock.mock.calls[audioRecorderMock.mock.calls.length - 1][0];
    expect(lastCall.sceneId).toBe('seg-en-1');
    expect(lastCall.onRecordingComplete).toBeInstanceOf(Function);
  });

  it('renders AudioPlayerBar when segment has an audioKey', () => {
    const segmentWithAudio = makeSegment({ audioKey: 'data:audio/wav;base64,abc123' });

    render(
      <LanguageAudioSection
        {...defaultProps}
        segment={segmentWithAudio}
      />,
    );

    // AudioPlayerBar should be visible
    expect(screen.getByTestId('mock-audio-player')).toBeInTheDocument();

    // Verify compact prop
    const playerMock = AudioPlayerBar as unknown as jest.Mock;
    const lastCall = playerMock.mock.calls[playerMock.mock.calls.length - 1][0];
    expect(lastCall.compact).toBe(true);

    // No "no audio" message
    expect(screen.queryByTestId('no-audio-message')).not.toBeInTheDocument();
  });

  it('shows "no audio" message when segment has no audioKey', () => {
    render(<LanguageAudioSection {...defaultProps} />);

    expect(screen.getByTestId('no-audio-message')).toBeInTheDocument();
    expect(screen.getByText('Aucun audio pour cette scene')).toBeInTheDocument();
  });

  it('shows "TTS automatique" badge when audioSource is tts', () => {
    const segment = makeSegment({ audioKey: 'data:audio/wav;base64,abc', audioSource: 'tts' });

    render(
      <LanguageAudioSection
        {...defaultProps}
        segment={segment}
      />,
    );

    const badge = screen.getByTestId('audio-source-badge');
    expect(badge).toHaveTextContent('TTS automatique');
    expect(badge.className).toContain('grenadine');
  });

  it('shows "Enregistrement personnel" badge when audioSource is recording', () => {
    const segment = makeSegment({ audioKey: 'data:audio/wav;base64,abc', audioSource: 'recording' });

    render(
      <LanguageAudioSection
        {...defaultProps}
        segment={segment}
      />,
    );

    const badge = screen.getByTestId('audio-source-badge');
    expect(badge).toHaveTextContent('Enregistrement personnel');
    expect(badge.className).toContain('mer');
  });

  it('shows no badge when audioSource is undefined', () => {
    render(<LanguageAudioSection {...defaultProps} />);

    expect(screen.queryByTestId('audio-source-badge')).not.toBeInTheDocument();
  });

  it('renders "Enregistrer avec le prompteur" link with correct href', () => {
    render(<LanguageAudioSection {...defaultProps} />);

    const prompterBtn = screen.getByTestId('record-with-prompter-btn');
    expect(prompterBtn).toBeInTheDocument();
    expect(prompterBtn).toHaveTextContent('Enregistrer avec le prompteur');
    expect(prompterBtn).toHaveAttribute(
      'href',
      '/guide/studio/session-abc/record?sceneId=scene-1&lang=en',
    );
  });

  it('renders "Enregistrement rapide" as secondary recorder button', () => {
    render(<LanguageAudioSection {...defaultProps} />);

    const recorderBtn = screen.getByTestId('toggle-recorder-btn');
    expect(recorderBtn).toHaveTextContent('Enregistrement rapide');
  });
});
