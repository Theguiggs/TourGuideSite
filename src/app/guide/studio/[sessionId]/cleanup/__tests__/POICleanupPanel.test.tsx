import { render, screen, fireEvent } from '@testing-library/react';
import { POICleanupPanel } from '../components/POICleanupPanel';
import type { StudioScene } from '@/types/studio';

jest.mock('@/components/studio/s3-image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S3Image: ({ alt }: any) => <div data-testid="s3-image">{alt}</div>,
}));

const baseScene: StudioScene = {
  id: 'scene-1',
  sessionId: 'session-1',
  sceneIndex: 0,
  title: 'Place aux Aires',
  originalAudioKey: '/mock/audio.aac',
  studioAudioKey: null,
  transcriptText: null,
  transcriptionJobId: null,
  transcriptionStatus: null,
  qualityScore: null,
  qualityDetailsJson: null,
  codecStatus: null,
  status: 'has_original',
  takesCount: null,
  selectedTakeIndex: null,
  moderationFeedback: null,
  photosRefs: ['/p1.jpg', '/p2.jpg'],
  latitude: 43.6,
  longitude: 6.9,
  poiDescription: 'Forum',
  heroPhotoRef: '/p1.jpg',
  trimStart: null,
  trimEnd: null,
  archived: false,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
};

describe('POICleanupPanel', () => {
  it('renders name, description, photos and notes fields', () => {
    render(<POICleanupPanel scene={baseScene} audioUrl="/mock/audio.aac" onChange={jest.fn()} />);
    expect(screen.getByTestId('poi-name-input')).toHaveValue('Place aux Aires');
    expect(screen.getByTestId('poi-description-input')).toHaveValue('Forum');
    expect(screen.getByTestId('poi-photos-grid')).toBeInTheDocument();
  });

  it('edits POI name', () => {
    const onChange = jest.fn();
    render(<POICleanupPanel scene={baseScene} audioUrl={null} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('poi-name-input'), { target: { value: 'New Name' } });
    expect(onChange).toHaveBeenCalledWith('scene-1', { title: 'New Name' });
  });

  it('edits description', () => {
    const onChange = jest.fn();
    render(<POICleanupPanel scene={baseScene} audioUrl={null} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('poi-description-input'), { target: { value: 'Updated desc' } });
    expect(onChange).toHaveBeenCalledWith('scene-1', { poiDescription: 'Updated desc' });
  });

  it('edits notes', () => {
    const onChange = jest.fn();
    render(<POICleanupPanel scene={baseScene} audioUrl={null} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('poi-notes-input'), { target: { value: 'note' } });
    expect(onChange).toHaveBeenCalledWith('scene-1', { moderationFeedback: 'note' });
  });

  it('changes hero photo selection', () => {
    const onChange = jest.fn();
    render(<POICleanupPanel scene={baseScene} audioUrl={null} onChange={onChange} />);
    const radios = screen.getAllByTestId('poi-photo-hero-radio') as HTMLInputElement[];
    expect(radios.length).toBe(2);
    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith('scene-1', { heroPhotoRef: '/p2.jpg' });
  });

  it('deletes a photo and clears hero when it was the hero', () => {
    const onChange = jest.fn();
    render(<POICleanupPanel scene={baseScene} audioUrl={null} onChange={onChange} />);
    const deleteBtns = screen.getAllByTestId('poi-photo-delete');
    fireEvent.click(deleteBtns[0]); // delete /p1.jpg which is hero
    expect(onChange).toHaveBeenCalledWith('scene-1', {
      photosRefs: ['/p2.jpg'],
      heroPhotoRef: '/p2.jpg',
    });
  });

  it('shows empty state when no photos', () => {
    render(
      <POICleanupPanel
        scene={{ ...baseScene, photosRefs: [], heroPhotoRef: null }}
        audioUrl={null}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('poi-photos-empty')).toBeInTheDocument();
  });
});
