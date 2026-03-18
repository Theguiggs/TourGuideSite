import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioModerationPanel } from '../studio-moderation-panel';
import type { StudioScene } from '@/types/studio';

// Mock useAuth
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ isAdmin: true, isAuthenticated: true, user: { id: 'admin-1', guideId: null }, isLoading: false }),
}));

const mockScenes: StudioScene[] = [
  { id: 's1', sessionId: 'sess-1', sceneIndex: 0, title: 'Place aux Aires', originalAudioKey: 'orig.aac', studioAudioKey: 'studio.aac', transcriptText: 'Bienvenue sur la place...', transcriptionJobId: null, transcriptionStatus: 'completed', qualityScore: 'good', qualityDetailsJson: null, codecStatus: null, status: 'finalized', takesCount: 2, selectedTakeIndex: 1, moderationFeedback: null, photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '', updatedAt: '' },
  { id: 's2', sessionId: 'sess-1', sceneIndex: 1, title: 'Fragonard', originalAudioKey: 'orig2.aac', studioAudioKey: null, transcriptText: null, transcriptionJobId: null, transcriptionStatus: null, qualityScore: 'needs_improvement', qualityDetailsJson: null, codecStatus: null, status: 'has_original', takesCount: null, selectedTakeIndex: null, moderationFeedback: 'Volume trop bas', photosRefs: [], latitude: null, longitude: null, poiDescription: null, archived: false, createdAt: '', updatedAt: '' },
];

describe('StudioModerationPanel', () => {
  it('renders all scenes', () => {
    render(<StudioModerationPanel sessionId="sess-1" scenes={mockScenes} isAdmin={false} />);
    expect(screen.getByText('Place aux Aires')).toBeInTheDocument();
    expect(screen.getByText('Fragonard')).toBeInTheDocument();
  });

  it('shows quality badge for each scene', () => {
    render(<StudioModerationPanel sessionId="sess-1" scenes={mockScenes} isAdmin={false} />);
    expect(screen.getByText('✓ Bonne')).toBeInTheDocument();
    expect(screen.getByText('⚠ À améliorer')).toBeInTheDocument();
  });

  it('shows audio comparison buttons', () => {
    render(<StudioModerationPanel sessionId="sess-1" scenes={mockScenes} isAdmin={false} />);
    expect(screen.getByTestId('play-original-s1')).toBeInTheDocument();
    expect(screen.getByTestId('play-studio-s1')).toBeInTheDocument();
  });

  it('shows existing moderation feedback', () => {
    render(<StudioModerationPanel sessionId="sess-1" scenes={mockScenes} isAdmin={false} />);
    expect(screen.getByText(/Volume trop bas/)).toBeInTheDocument();
  });

  it('shows admin controls when isAdmin is true', () => {
    render(<StudioModerationPanel sessionId="sess-1" scenes={mockScenes} isAdmin={true} />);
    expect(screen.getByTestId('approve-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reject-btn')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-input-s1')).toBeInTheDocument();
  });

  it('hides admin controls when isAdmin is false', () => {
    render(<StudioModerationPanel sessionId="sess-1" scenes={mockScenes} isAdmin={false} />);
    expect(screen.queryByTestId('approve-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reject-btn')).not.toBeInTheDocument();
  });

  it('shows transcribed text for scenes with text', () => {
    render(<StudioModerationPanel sessionId="sess-1" scenes={mockScenes} isAdmin={false} />);
    expect(screen.getByText(/Bienvenue sur la place/)).toBeInTheDocument();
  });
});
