import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlayAllButton } from '../PlayAllButton';

describe('PlayAllButton', () => {
  it("affiche 'Écouter tout' quand non playing", () => {
    render(<PlayAllButton isPlaying={false} onClick={jest.fn()} />);
    expect(screen.getByTestId('play-all-btn')).toHaveTextContent('Écouter tout');
  });

  it("affiche 'Pause' quand playing", () => {
    render(<PlayAllButton isPlaying onClick={jest.fn()} />);
    expect(screen.getByTestId('play-all-btn')).toHaveTextContent('Pause');
  });

  it("appelle onClick", () => {
    const onClick = jest.fn();
    render(<PlayAllButton isPlaying={false} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('play-all-btn'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("affiche la durée quand fournie", () => {
    render(<PlayAllButton isPlaying={false} onClick={jest.fn()} duration="12 min" />);
    expect(screen.getByText(/12 min/)).toBeInTheDocument();
  });

  it("est désactivé quand disabled=true", () => {
    render(<PlayAllButton isPlaying={false} onClick={jest.fn()} disabled />);
    expect(screen.getByTestId('play-all-btn')).toBeDisabled();
  });

  it("aria-pressed reflète isPlaying", () => {
    render(<PlayAllButton isPlaying onClick={jest.fn()} />);
    expect(screen.getByTestId('play-all-btn')).toHaveAttribute('aria-pressed', 'true');
  });
});
