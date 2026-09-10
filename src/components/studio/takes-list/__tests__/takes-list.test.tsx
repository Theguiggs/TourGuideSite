import { fireEvent, render, screen } from '@testing-library/react';
import { TakesList } from '../takes-list';
import { useRecordingStore } from '@/lib/stores/recording-store';
import { audioPlayerService } from '@/lib/studio/audio-player-service';

jest.mock('@/lib/studio/audio-player-service', () => ({
  audioPlayerService: {
    getState: jest.fn(() => ({ isPlaying: false, currentTime: 0, duration: 0, currentUrl: null })),
    subscribe: jest.fn(() => jest.fn()),
    play: jest.fn(async () => true),
    pause: jest.fn(),
    stop: jest.fn(),
  },
}));

describe('TakesList', () => {
  beforeAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn((blob: Blob) => `blob:take-${blob.size}-${Math.random()}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useRecordingStore.getState().resetStore();
  });

  it('shows every take with an explicit player and lets the guide choose one', () => {
    const first = useRecordingStore.getState().addTake('scene-1', {
      blob: new Blob(['first'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      durationMs: 61_000,
    });
    const second = useRecordingStore.getState().addTake('scene-1', {
      blob: new Blob(['second'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      durationMs: 3_000,
    });

    render(<TakesList sceneId="scene-1" savedTakeId={first.id} />);

    expect(screen.getByText('Vos prises audio (2)')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Écouter la prise/i })).toHaveLength(2);
    expect(screen.getByText('Durée : 1:01')).toBeInTheDocument();
    expect(screen.getByTestId(`saved-take-${first.id}`)).toHaveTextContent('Audio de la scène');

    fireEvent.click(screen.getByTestId(`play-take-${second.id}`));
    expect(audioPlayerService.play).toHaveBeenCalledWith(expect.stringMatching(/^blob:take-/));

    fireEvent.click(screen.getByTestId(`select-take-${second.id}`));
    expect(useRecordingStore.getState().selectedTakeId['scene-1']).toBe(second.id);
  });

  it('lets the guide remove an unused take without deleting the saved scene audio', () => {
    const saved = useRecordingStore.getState().addTake('scene-1', {
      blob: new Blob(['saved'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      durationMs: 2_000,
    });
    const draft = useRecordingStore.getState().addTake('scene-1', {
      blob: new Blob(['draft'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      durationMs: 2_500,
    });

    render(<TakesList sceneId="scene-1" savedTakeId={saved.id} />);

    expect(screen.queryByTestId(`delete-take-${saved.id}`)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`delete-take-${draft.id}`));
    expect(useRecordingStore.getState().getSceneTakes('scene-1')).toHaveLength(1);
  });
});
