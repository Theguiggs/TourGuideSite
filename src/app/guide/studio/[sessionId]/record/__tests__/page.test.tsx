import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RecordPage from '../page';
import { useRecordingStore } from '@/lib/stores/recording-store';

const mockGetStudioSession = jest.fn();
const mockListStudioScenes = jest.fn();
const mockUpdateSceneAudio = jest.fn();
const mockUploadAudio = jest.fn();
let mockLanguage: string | null = null;
let mockLegacyLanguage: string | null = null;

jest.mock('next/navigation', () => ({
  useParams: () => ({ sessionId: 'session-1' }),
  useSearchParams: () => ({
    get: (key: string) => key === 'sceneId'
      ? 'scene-1'
      : key === 'language'
        ? mockLanguage
        : key === 'lang'
          ? mockLegacyLanguage
          : null,
  }),
}));

jest.mock('next/dynamic', () => () => {
  const Prompter = () => <div data-testid="teleprompter" />;
  return Prompter;
});

jest.mock('@/lib/api/studio', () => ({
  getStudioSession: (...args: unknown[]) => mockGetStudioSession(...args),
  listStudioScenes: (...args: unknown[]) => mockListStudioScenes(...args),
  updateSceneAudio: (...args: unknown[]) => mockUpdateSceneAudio(...args),
}));

jest.mock('@/lib/studio/studio-upload-service', () => ({
  uploadAudio: (...args: unknown[]) => mockUploadAudio(...args),
  getPlayableUrl: jest.fn(async () => 'https://audio.test/take.webm'),
  onProgress: jest.fn(() => jest.fn()),
}));

jest.mock('@/lib/studio/audio-player-service', () => ({
  audioPlayerService: { play: jest.fn() },
}));

jest.mock('@/components/studio/scene-sidebar', () => ({
  SceneSidebar: () => <div data-testid="scene-sidebar" />,
}));

jest.mock('@/components/studio/takes-list', () => ({ TakesList: () => <div data-testid="takes-list" /> }));
jest.mock('@/components/studio/file-import', () => ({ FileImport: () => <div data-testid="file-import" /> }));

jest.mock('@/components/studio/audio-recorder', () => ({
  AudioRecorder: ({ sceneId, onRecordingComplete }: { sceneId: string; onRecordingComplete: (id: string, take: unknown) => void }) => (
    <button
      data-testid="complete-recording"
      onClick={() => {
        const take = useRecordingStore.getState().addTake(sceneId, {
          blob: new Blob(['voice'], { type: 'audio/webm' }),
          mimeType: 'audio/webm',
          durationMs: 1200,
        });
        useRecordingStore.getState().selectTake(sceneId, take.id);
        onRecordingComplete(sceneId, take);
      }}
    >
      Complete recording
    </button>
  ),
}));

const scene = {
  id: 'scene-1', sessionId: 'session-1', sceneIndex: 0, title: 'Place',
  originalAudioKey: null, studioAudioKey: null, transcriptText: 'Texte source',
  transcriptionJobId: null, transcriptionStatus: null, qualityScore: null,
  qualityDetailsJson: null, codecStatus: null, status: 'edited', takesCount: 0,
  selectedTakeIndex: null, moderationFeedback: null, photosRefs: [], latitude: null,
  longitude: null, poiDescription: null, archived: false,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

function session(narrationMode: 'recording' | 'tts_on_demand') {
  return {
    id: 'session-1', guideId: 'guide-1', sourceSessionId: 'source-1', tourId: 'tour-1',
    title: 'Tour', status: 'draft', language: 'fr', transcriptionQuotaUsed: null,
    coverPhotoKey: null, availableLanguages: ['fr'], translatedTitles: null,
    translatedDescriptions: null, version: 1, consentRGPD: true, narrationMode,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('RecordPage guide recording pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLanguage = null;
    mockLegacyLanguage = null;
    useRecordingStore.getState().resetStore();
    mockListStudioScenes.mockResolvedValue([{ ...scene }]);
    mockUploadAudio.mockResolvedValue({ ok: true, s3Key: 'guide-studio/id/session-1/audio/scene-1.webm' });
    mockUpdateSceneAudio.mockResolvedValue({ ok: true });
  });

  it('denies direct recorder access in TTS-on-demand mode', async () => {
    mockGetStudioSession.mockResolvedValue(session('tts_on_demand'));
    render(<RecordPage />);
    expect(await screen.findByText(/aucun enregistrement ni TTS n’est produit ici/i)).toBeInTheDocument();
    expect(screen.queryByTestId('complete-recording')).not.toBeInTheDocument();
  });

  it('never offers the prompter for a translated language', async () => {
    mockLanguage = 'en';
    mockGetStudioSession.mockResolvedValue(session('recording'));
    render(<RecordPage />);
    expect(await screen.findByTestId('translated-language-blocked')).toBeInTheDocument();
    expect(screen.queryByTestId('teleprompter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('complete-recording')).not.toBeInTheDocument();
  });

  it('blocks translated recording from legacy lang deep links', async () => {
    mockLegacyLanguage = 'en';
    mockGetStudioSession.mockResolvedValue(session('recording'));
    render(<RecordPage />);
    expect(await screen.findByTestId('translated-language-blocked')).toBeInTheDocument();
    expect(screen.queryByTestId('complete-recording')).not.toBeInTheDocument();
  });

  it('treats a regional locale as a translation when it is not the exact source locale', async () => {
    mockLanguage = 'fr-CA';
    mockGetStudioSession.mockResolvedValue({ ...session('recording'), language: 'fr-FR' });
    render(<RecordPage />);
    expect(await screen.findByTestId('translated-language-blocked')).toBeInTheDocument();
  });

  it.each(['submitted', 'published', 'paused', 'revision_requested', 'archived', 'ready_for_cleanup'])(
    'keeps the recorder unavailable for a %s version',
    async (status) => {
      mockGetStudioSession.mockResolvedValue({ ...session('recording'), status });
      render(<RecordPage />);
      expect(await screen.findByText(/version n’est pas modifiable/i)).toBeInTheDocument();
      expect(screen.queryByTestId('complete-recording')).not.toBeInTheDocument();
    },
  );

  it('uploads once, persists the S3 key as recording, and refreshes playback', async () => {
    mockGetStudioSession.mockResolvedValue(session('recording'));
    render(<RecordPage />);
    fireEvent.click(await screen.findByTestId('complete-recording'));

    await waitFor(() => expect(mockUploadAudio).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockUpdateSceneAudio).toHaveBeenCalledWith(
      'scene-1', 'guide-studio/id/session-1/audio/scene-1.webm', 'session-1', 0, 'recording',
    ));
    expect(await screen.findByText(/associée à la scène/i)).toBeInTheDocument();
    expect(screen.getByTestId('play-saved-audio')).toBeInTheDocument();
  });

  it('reuses the uploaded key and the same take when AppSync retry succeeds', async () => {
    mockGetStudioSession.mockResolvedValue(session('recording'));
    mockUpdateSceneAudio
      .mockResolvedValueOnce({ ok: false, error: 'AppSync indisponible' })
      .mockResolvedValueOnce({ ok: true });
    render(<RecordPage />);
    fireEvent.click(await screen.findByTestId('complete-recording'));

    expect(await screen.findByText('AppSync indisponible')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('save-selected-take'));
    await waitFor(() => expect(mockUpdateSceneAudio).toHaveBeenCalledTimes(2));
    expect(mockUploadAudio).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/associée à la scène/i)).toBeInTheDocument();
  });

  it('keeps an existing audio intact when replacement is declined', async () => {
    mockGetStudioSession.mockResolvedValue(session('recording'));
    mockListStudioScenes.mockResolvedValue([{ ...scene, studioAudioKey: 'existing.webm' }]);
    jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
    render(<RecordPage />);
    fireEvent.click(await screen.findByTestId('complete-recording'));

    expect(await screen.findByText(/Audio existant conservé/i)).toBeInTheDocument();
    expect(mockUploadAudio).not.toHaveBeenCalled();
    expect(mockUpdateSceneAudio).not.toHaveBeenCalled();
  });

  it('blocks in-app navigation while the recorded blob is being uploaded', async () => {
    mockGetStudioSession.mockResolvedValue(session('recording'));
    let finishUpload!: (value: { ok: true; s3Key: string }) => void;
    mockUploadAudio.mockImplementationOnce(() => new Promise((resolve) => {
      finishUpload = resolve;
    }));
    render(<RecordPage />);
    fireEvent.click(await screen.findByTestId('complete-recording'));

    await waitFor(() => expect(mockUploadAudio).toHaveBeenCalledTimes(1));
    const returnLink = screen.getByRole('link', { name: /Retour à la session/i });
    expect(fireEvent.click(returnLink)).toBe(false);
    expect(screen.getByText(/opération audio en cours avant de quitter/i)).toBeInTheDocument();

    finishUpload({ ok: true, s3Key: 'guide-studio/id/session-1/audio/scene-1.webm' });
    await waitFor(() => expect(mockUpdateSceneAudio).toHaveBeenCalledTimes(1));
  });

  it('keeps the same take available when an unexpected upload exception occurs', async () => {
    mockGetStudioSession.mockResolvedValue(session('recording'));
    mockUploadAudio.mockRejectedValueOnce(new Error('network crash'));
    render(<RecordPage />);
    fireEvent.click(await screen.findByTestId('complete-recording'));

    expect(await screen.findByText(/prise est conservée pour réessayer/i)).toBeInTheDocument();
    expect(screen.getByTestId('save-selected-take')).toBeInTheDocument();
  });
});
