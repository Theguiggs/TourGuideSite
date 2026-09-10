import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GeneralPage from '../page';

const mockGetStudioSession = jest.fn();
const mockListStudioScenes = jest.fn();
const mockUpdateStudioSession = jest.fn();
const mockUpdateSceneData = jest.fn();
const mockRemoveStoredAudio = jest.fn();

jest.mock('next/navigation', () => ({ useParams: () => ({ sessionId: 'session-1' }) }));
jest.mock('@/lib/api/studio', () => ({
  getStudioSession: (...args: unknown[]) => mockGetStudioSession(...args),
  listStudioScenes: (...args: unknown[]) => mockListStudioScenes(...args),
  updateSceneData: (...args: unknown[]) => mockUpdateSceneData(...args),
}));
jest.mock('@/lib/api/appsync-client', () => ({
  updateStudioSessionMutation: (...args: unknown[]) => mockUpdateStudioSession(...args),
  updateGuideTourMutation: jest.fn(async () => ({ ok: true })),
  getGuideTourById: jest.fn(async () => null),
}));
jest.mock('@/lib/studio/studio-upload-service', () => ({
  removeStoredAudio: (...args: unknown[]) => mockRemoveStoredAudio(...args),
}));
jest.mock('@/components/studio/s3-image', () => ({ S3Image: () => null }));
jest.mock('@/components/studio/wizard-general', () => ({
  ThemeChips: () => null,
  CityFamilyBadge: () => null,
  SessionTerrainCard: () => null,
}));
jest.mock('@/components/studio/wizard', () => ({
  StepNav: ({ prevDisabled, nextDisabled }: { prevDisabled?: boolean; nextDisabled?: boolean }) => (
    <div><button disabled={prevDisabled}>Previous</button><button disabled={nextDisabled}>Next</button></div>
  ),
  WizField: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  WizInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  WizTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
  WizSelect: (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} />,
}));

const baseSession = {
  id: 'session-1', guideId: 'guide-1', sourceSessionId: 'source-1', tourId: 'tour-1',
  title: 'Tour', status: 'draft', language: 'fr', transcriptionQuotaUsed: null,
  coverPhotoKey: null, availableLanguages: ['fr'], translatedTitles: null,
  translatedDescriptions: null, version: 1, consentRGPD: true, narrationMode: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

describe('GeneralPage narration mode persistence', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockListStudioScenes.mockResolvedValue([]);
    mockGetStudioSession.mockResolvedValue({ ...baseSession });
    mockUpdateStudioSession.mockResolvedValue({ ok: true, data: { ...baseSession, narrationMode: 'recording' } });
    mockUpdateSceneData.mockResolvedValue({ ok: true });
    mockRemoveStoredAudio.mockResolvedValue({ ok: true });
  });

  it('persists Ma voix immediately and keeps the confirmed mode visible', async () => {
    render(<GeneralPage />);
    const recording = await screen.findByTestId('narration-mode-recording');
    fireEvent.click(recording);

    await waitFor(() => expect(mockUpdateStudioSession).toHaveBeenCalledWith('session-1', { narrationMode: 'recording' }));
    await waitFor(() => expect(recording).toHaveAttribute('aria-pressed', 'true'));
  });

  it('surfaces the real AppSync error and preserves the previous mode', async () => {
    mockGetStudioSession.mockResolvedValue({ ...baseSession, narrationMode: 'recording' });
    mockUpdateStudioSession.mockResolvedValue({ ok: false, error: 'Champ narrationMode refusé' });
    render(<GeneralPage />);
    const recording = await screen.findByTestId('narration-mode-recording');
    fireEvent.click(screen.getByTestId('narration-mode-tts_on_demand'));

    expect(await screen.findByText(/Champ narrationMode refusé/)).toBeInTheDocument();
    expect(recording).toHaveAttribute('aria-pressed', 'true');
  });

  it('asks for confirmation before deleting scene recordings and switching to TTS', async () => {
    mockGetStudioSession.mockResolvedValue({ ...baseSession, narrationMode: 'recording' });
    mockListStudioScenes.mockResolvedValue([{
      id: 'scene-1', sceneIndex: 0, transcriptText: 'Texte', status: 'recorded',
      studioAudioKey: 'guide-studio/audio/scene-1.webm', originalAudioKey: null,
      baseAudioSource: 'recording', takesCount: 2, selectedTakeIndex: 1,
    }]);
    jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
    render(<GeneralPage />);

    fireEvent.click(await screen.findByTestId('narration-mode-tts_on_demand'));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/supprimera définitivement.*1 scène/i));
    expect(mockUpdateSceneData).not.toHaveBeenCalled();
    expect(mockUpdateStudioSession).not.toHaveBeenCalled();
  });

  it('clears every scene audio before switching to TTS and removes the stored files', async () => {
    mockGetStudioSession.mockResolvedValue({ ...baseSession, narrationMode: 'recording' });
    mockListStudioScenes.mockResolvedValue([{
      id: 'scene-1', sceneIndex: 0, transcriptText: 'Texte', status: 'recorded',
      studioAudioKey: 'guide-studio/audio/studio.webm', originalAudioKey: 'guide-studio/audio/original.aac',
      baseAudioSource: 'recording', takesCount: 2, selectedTakeIndex: 1,
    }]);
    mockUpdateStudioSession.mockResolvedValue({ ok: true, data: { ...baseSession, narrationMode: 'tts_on_demand' } });
    jest.spyOn(window, 'confirm').mockReturnValueOnce(true);
    render(<GeneralPage />);

    const tts = await screen.findByTestId('narration-mode-tts_on_demand');
    fireEvent.click(tts);

    await waitFor(() => expect(mockUpdateSceneData).toHaveBeenCalledWith('scene-1', expect.objectContaining({
      studioAudioKey: null,
      originalAudioKey: null,
      baseAudioSource: null,
      status: 'edited',
    })));
    await waitFor(() => expect(mockUpdateStudioSession).toHaveBeenCalledWith('session-1', { narrationMode: 'tts_on_demand' }));
    await waitFor(() => expect(mockRemoveStoredAudio).toHaveBeenCalledTimes(2));
    expect(tts).toHaveAttribute('aria-pressed', 'true');
  });

  it('restores cleared scene references when the mode switch fails', async () => {
    mockGetStudioSession.mockResolvedValue({ ...baseSession, narrationMode: 'recording' });
    mockListStudioScenes.mockResolvedValue([{
      id: 'scene-1', sceneIndex: 0, transcriptText: 'Texte', status: 'recorded',
      studioAudioKey: 'guide-studio/audio/scene-1.webm', originalAudioKey: null,
      baseAudioSource: 'recording', takesCount: 1, selectedTakeIndex: 0,
    }]);
    mockUpdateStudioSession.mockResolvedValue({ ok: false, error: 'Session refusée' });
    jest.spyOn(window, 'confirm').mockReturnValueOnce(true);
    render(<GeneralPage />);

    fireEvent.click(await screen.findByTestId('narration-mode-tts_on_demand'));

    await waitFor(() => expect(mockUpdateSceneData).toHaveBeenCalledTimes(2));
    expect(mockUpdateSceneData).toHaveBeenLastCalledWith('scene-1', expect.objectContaining({
      studioAudioKey: 'guide-studio/audio/scene-1.webm',
      status: 'recorded',
    }));
    expect(mockRemoveStoredAudio).not.toHaveBeenCalled();
    expect(await screen.findByText(/Session refusée/i)).toBeInTheDocument();
  });
});
