import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneSidebar } from '../scene-sidebar';
import type { StudioScene } from '@/types/studio';

const mockScenes: StudioScene[] = [
  { id: 's1', sessionId: 'sess-1', sceneIndex: 0, title: 'Place aux Aires', originalAudioKey: null, studioAudioKey: null, transcriptText: 'Some text', transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'edited', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '', updatedAt: '' },
  { id: 's2', sessionId: 'sess-1', sceneIndex: 1, title: null, originalAudioKey: null, studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: null, qualityDetailsJson: null, codecStatus: null, status: 'empty', takesCount: null, selectedTakeIndex: null, moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '', updatedAt: '' },
];

describe('SceneSidebar', () => {
  it('renders all scenes', () => {
    render(<SceneSidebar scenes={mockScenes} activeSceneId={null} onSceneSelect={jest.fn()} />);
    expect(screen.getByText('Place aux Aires')).toBeInTheDocument();
    expect(screen.getByText('Sc\u00e8ne 2')).toBeInTheDocument();
  });

  it('highlights active scene', () => {
    render(<SceneSidebar scenes={mockScenes} activeSceneId="s1" onSceneSelect={jest.fn()} />);
    const btn = screen.getByTestId('sidebar-scene-s1');
    expect(btn).toHaveAttribute('aria-current', 'true');
  });

  it('calls onSceneSelect when scene clicked', () => {
    const handler = jest.fn();
    render(<SceneSidebar scenes={mockScenes} activeSceneId={null} onSceneSelect={handler} />);
    fireEvent.click(screen.getByTestId('sidebar-scene-s2'));
    expect(handler).toHaveBeenCalledWith('s2');
  });

  it('shows status badges', () => {
    render(<SceneSidebar scenes={mockScenes} activeSceneId={null} onSceneSelect={jest.fn()} />);
    expect(screen.getByText('\u00c9dit\u00e9')).toBeInTheDocument();
    expect(screen.getByText('Vide')).toBeInTheDocument();
  });

  it('has accessible navigation label', () => {
    render(<SceneSidebar scenes={mockScenes} activeSceneId={null} onSceneSelect={jest.fn()} />);
    expect(screen.getByRole('navigation', { name: /scenes/i })).toBeInTheDocument();
  });
});
