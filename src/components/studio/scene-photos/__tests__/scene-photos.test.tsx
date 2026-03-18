import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScenePhotos } from '../scene-photos';
import type { StudioScene } from '@/types/studio';

const baseScene: StudioScene = {
  id: 's1', sessionId: 'sess-1', sceneIndex: 0, title: 'Test', originalAudioKey: null, studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'has_original', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '', updatedAt: '',
};

describe('ScenePhotos', () => {
  it('shows add button when no photos', () => {
    render(<ScenePhotos scene={baseScene} onPhotosChange={jest.fn()} />);
    expect(screen.getByTestId('add-photo-btn-s1')).toBeInTheDocument();
    expect(screen.getByText('0/3 photos')).toBeInTheDocument();
  });

  it('shows existing photos', () => {
    const scene = { ...baseScene, photosRefs: ['/img1.jpg', '/img2.jpg'] };
    render(<ScenePhotos scene={scene} onPhotosChange={jest.fn()} />);
    expect(screen.getByText('2/3 photos')).toBeInTheDocument();
  });

  it('hides add button when max photos reached', () => {
    const scene = { ...baseScene, photosRefs: ['/a.jpg', '/b.jpg', '/c.jpg'] };
    render(<ScenePhotos scene={scene} onPhotosChange={jest.fn()} />);
    expect(screen.queryByTestId('add-photo-btn-s1')).not.toBeInTheDocument();
    expect(screen.getByText('3/3 photos')).toBeInTheDocument();
  });

  it('shows remove buttons in editable mode', () => {
    const scene = { ...baseScene, photosRefs: ['/a.jpg'] };
    render(<ScenePhotos scene={scene} onPhotosChange={jest.fn()} />);
    expect(screen.getByTestId('remove-photo-s1-0')).toBeInTheDocument();
  });

  it('hides controls in read-only mode', () => {
    const scene = { ...baseScene, photosRefs: ['/a.jpg'] };
    render(<ScenePhotos scene={scene} onPhotosChange={jest.fn()} editable={false} />);
    expect(screen.queryByTestId('add-photo-btn-s1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('remove-photo-s1-0')).not.toBeInTheDocument();
  });

  it('shows "Aucune photo" in read-only when empty', () => {
    render(<ScenePhotos scene={baseScene} onPhotosChange={jest.fn()} editable={false} />);
    expect(screen.getByText('Aucune photo')).toBeInTheDocument();
  });
});
