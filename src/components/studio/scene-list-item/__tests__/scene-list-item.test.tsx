import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneListItem } from '../scene-list-item';
import type { StudioScene } from '@/types/studio';

const mockScene: StudioScene = {
  id: 'scene-1',
  sessionId: 'session-1',
  sceneIndex: 0,
  title: 'Place aux Aires',
  originalAudioKey: 'guide-studio/g1/s1/original/scene_0.aac',
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
  moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false,
  createdAt: '2026-03-10T14:30:00.000Z',
  updatedAt: '2026-03-10T14:30:00.000Z',
};

describe('SceneListItem', () => {
  it('renders scene title', () => {
    render(<SceneListItem scene={mockScene} isPlaying={false} onPlayToggle={jest.fn()} />);
    expect(screen.getByText('Place aux Aires')).toBeInTheDocument();
  });

  it('renders scene index (1-based)', () => {
    render(<SceneListItem scene={mockScene} isPlaying={false} onPlayToggle={jest.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders fallback title when title is null', () => {
    render(<SceneListItem scene={{ ...mockScene, title: null }} isPlaying={false} onPlayToggle={jest.fn()} />);
    expect(screen.getByText('Sc\u00e8ne 1')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<SceneListItem scene={mockScene} isPlaying={false} onPlayToggle={jest.fn()} />);
    expect(screen.getByText('Audio terrain')).toBeInTheDocument();
  });

  it('renders play button when scene has audio', () => {
    render(<SceneListItem scene={mockScene} isPlaying={false} onPlayToggle={jest.fn()} />);
    expect(screen.getByTestId('play-btn-scene-1')).toBeInTheDocument();
  });

  it('does not render play button when scene has no audio', () => {
    render(<SceneListItem scene={{ ...mockScene, originalAudioKey: null }} isPlaying={false} onPlayToggle={jest.fn()} />);
    expect(screen.queryByTestId('play-btn-scene-1')).not.toBeInTheDocument();
  });

  it('calls onPlayToggle when play button clicked', () => {
    const handler = jest.fn();
    render(<SceneListItem scene={mockScene} isPlaying={false} onPlayToggle={handler} />);
    fireEvent.click(screen.getByTestId('play-btn-scene-1'));
    expect(handler).toHaveBeenCalledWith(mockScene);
  });

  it('shows pause icon when playing', () => {
    render(<SceneListItem scene={mockScene} isPlaying={true} onPlayToggle={jest.fn()} />);
    const btn = screen.getByTestId('play-btn-scene-1');
    expect(btn).toHaveTextContent('⏸');
  });

  it('has accessible aria-label for play button', () => {
    render(<SceneListItem scene={mockScene} isPlaying={false} onPlayToggle={jest.fn()} />);
    const btn = screen.getByTestId('play-btn-scene-1');
    expect(btn).toHaveAttribute('aria-label', '\u00c9couter sc\u00e8ne 1');
  });
});
