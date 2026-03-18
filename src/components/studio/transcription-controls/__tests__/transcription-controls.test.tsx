import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranscriptionControls } from '../transcription-controls';

describe('TranscriptionControls', () => {
  const defaultProps = {
    sceneId: 'scene-1',
    sceneTitle: 'Place aux Aires',
    transcriptionStatus: null as null,
    transcriptText: null as string | null,
    error: null as string | null,
    isQuotaExceeded: false,
    onTrigger: jest.fn(),
    onRetry: jest.fn(),
  };

  it('renders trigger button when no transcription', () => {
    render(<TranscriptionControls {...defaultProps} />);
    expect(screen.getByTestId('trigger-btn-scene-1')).toHaveTextContent('Transcrire');
  });

  it('disables trigger when quota exceeded', () => {
    render(<TranscriptionControls {...defaultProps} isQuotaExceeded={true} />);
    const btn = screen.getByTestId('trigger-btn-scene-1');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Quota atteint');
  });

  it('calls onTrigger when clicked', () => {
    const onTrigger = jest.fn();
    render(<TranscriptionControls {...defaultProps} onTrigger={onTrigger} />);
    fireEvent.click(screen.getByTestId('trigger-btn-scene-1'));
    expect(onTrigger).toHaveBeenCalledWith('scene-1');
  });

  it('shows spinner when processing', () => {
    render(<TranscriptionControls {...defaultProps} transcriptionStatus="processing" />);
    expect(screen.getByTestId('transcribing-scene-1')).toBeInTheDocument();
    expect(screen.getByText('Transcription en cours...')).toBeInTheDocument();
  });

  it('shows transcript text when completed', () => {
    render(<TranscriptionControls {...defaultProps} transcriptionStatus="completed" transcriptText="Bonjour le monde" />);
    expect(screen.getByTestId('transcript-scene-1')).toBeInTheDocument();
    expect(screen.getByText('Bonjour le monde')).toBeInTheDocument();
  });

  it('shows error and retry button when failed', () => {
    render(<TranscriptionControls {...defaultProps} transcriptionStatus="failed" error="Erreur test" />);
    expect(screen.getByTestId('failed-scene-1')).toBeInTheDocument();
    expect(screen.getByText('Erreur test')).toBeInTheDocument();
    expect(screen.getByTestId('retry-btn-scene-1')).toBeInTheDocument();
  });

  it('calls onRetry when retry clicked', () => {
    const onRetry = jest.fn();
    render(<TranscriptionControls {...defaultProps} transcriptionStatus="failed" error="Err" onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId('retry-btn-scene-1'));
    expect(onRetry).toHaveBeenCalledWith('scene-1');
  });

  it('disables retry when quota exceeded', () => {
    render(<TranscriptionControls {...defaultProps} transcriptionStatus="failed" error="Err" isQuotaExceeded={true} />);
    expect(screen.getByTestId('retry-btn-scene-1')).toBeDisabled();
  });
});
