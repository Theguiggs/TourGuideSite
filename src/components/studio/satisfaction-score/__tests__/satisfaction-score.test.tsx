import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SatisfactionScore } from '../satisfaction-score';

describe('SatisfactionScore', () => {
  it('renders score buttons 1-5', () => {
    render(<SatisfactionScore sessionId="s1" onComplete={jest.fn()} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByTestId(`score-${i}`)).toBeInTheDocument();
    }
  });

  it('submit is disabled without score', () => {
    render(<SatisfactionScore sessionId="s1" onComplete={jest.fn()} />);
    expect(screen.getByTestId('satisfaction-submit')).toBeDisabled();
  });

  it('submit is enabled after selecting score', () => {
    render(<SatisfactionScore sessionId="s1" onComplete={jest.fn()} />);
    fireEvent.click(screen.getByTestId('score-4'));
    expect(screen.getByTestId('satisfaction-submit')).not.toBeDisabled();
  });

  it('shows thank you after submit', () => {
    render(<SatisfactionScore sessionId="s1" onComplete={jest.fn()} />);
    fireEvent.click(screen.getByTestId('score-5'));
    fireEvent.click(screen.getByTestId('satisfaction-submit'));
    expect(screen.getByTestId('satisfaction-thanks')).toBeInTheDocument();
  });

  it('has skip button', () => {
    const onComplete = jest.fn();
    render(<SatisfactionScore sessionId="s1" onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Passer'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('has optional comment field', () => {
    render(<SatisfactionScore sessionId="s1" onComplete={jest.fn()} />);
    expect(screen.getByTestId('satisfaction-comment')).toBeInTheDocument();
  });
});
