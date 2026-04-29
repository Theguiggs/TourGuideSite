import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneOverviewCard } from '../SceneOverviewCard';
import type { StudioScene } from '@/types/studio';

const baseScene: StudioScene = {
  id: 'sc-1',
  sessionId: 'sess-1',
  sceneIndex: 0,
  title: 'Place du Peyra',
  originalAudioKey: 'orig.aac',
  studioAudioKey: null,
  transcriptText: 'Nous voici devant la Place du Peyra...',
  transcriptionJobId: null,
  transcriptionStatus: null,
  qualityScore: 'good',
  qualityDetailsJson: null,
  codecStatus: null,
  status: 'finalized',
  takesCount: null,
  selectedTakeIndex: null,
  moderationFeedback: null,
  photosRefs: [],
  latitude: null,
  longitude: null,
  poiDescription: null,
  archived: false,
  createdAt: '',
  updatedAt: '',
};

describe('SceneOverviewCard', () => {
  const noop = () => {};

  it('affiche le numéro et le titre', () => {
    render(
      <SceneOverviewCard
        index={2}
        scene={baseScene}
        isPlaying={false}
        onPlayToggle={noop}
        audioAvailable
      />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Place du Peyra')).toBeInTheDocument();
  });

  it("affiche la pill status (Finalisé olive)", () => {
    render(
      <SceneOverviewCard
        index={1}
        scene={baseScene}
        isPlaying={false}
        onPlayToggle={noop}
        audioAvailable
      />,
    );
    expect(screen.getByTestId('scene-status-pill')).toHaveTextContent('Finalisé');
  });

  it("affiche l'extrait de transcription", () => {
    render(
      <SceneOverviewCard
        index={1}
        scene={baseScene}
        isPlaying={false}
        onPlayToggle={noop}
        audioAvailable
      />,
    );
    expect(screen.getByText(/Nous voici devant la Place du Peyra/)).toBeInTheDocument();
  });

  it("affiche un placeholder quand pas de transcription", () => {
    render(
      <SceneOverviewCard
        index={1}
        scene={{ ...baseScene, transcriptText: null }}
        isPlaying={false}
        onPlayToggle={noop}
        audioAvailable
      />,
    );
    expect(screen.getByText(/Aucune transcription/)).toBeInTheDocument();
  });

  it("appelle onPlayToggle au clic", () => {
    const onPlayToggle = jest.fn();
    render(
      <SceneOverviewCard
        index={1}
        scene={baseScene}
        isPlaying={false}
        onPlayToggle={onPlayToggle}
        audioAvailable
      />,
    );
    fireEvent.click(screen.getByTestId('scene-play-toggle'));
    expect(onPlayToggle).toHaveBeenCalledWith(baseScene);
  });

  it("désactive le bouton play si audioAvailable=false", () => {
    render(
      <SceneOverviewCard
        index={1}
        scene={baseScene}
        isPlaying={false}
        onPlayToggle={noop}
        audioAvailable={false}
      />,
    );
    expect(screen.getByTestId('scene-play-toggle')).toBeDisabled();
  });

  it("bascule l'icône en pause quand isPlaying=true", () => {
    render(
      <SceneOverviewCard
        index={1}
        scene={baseScene}
        isPlaying
        onPlayToggle={noop}
        audioAvailable
      />,
    );
    expect(screen.getByTestId('scene-play-toggle')).toHaveAttribute('aria-pressed', 'true');
  });

  it("fallback titre 'Scène N' si scene.title est null", () => {
    render(
      <SceneOverviewCard
        index={3}
        scene={{ ...baseScene, title: null }}
        isPlaying={false}
        onPlayToggle={noop}
        audioAvailable
      />,
    );
    expect(screen.getByText('Scène 3')).toBeInTheDocument();
  });
});
