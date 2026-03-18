import React from 'react';
import { render, screen } from '@testing-library/react';
import { QualityFeedback } from '../quality-feedback';
import type { QualityResult } from '@/lib/studio/quality-analyzer';

describe('QualityFeedback', () => {
  it('renders nothing when result is null', () => {
    const { container } = render(<QualityFeedback result={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when overall is null', () => {
    const result: QualityResult = {
      overall: null,
      details: { averageVolume: 0, peakClipping: false, silenceRatio: 0 },
      message: 'Non disponible',
    };
    const { container } = render(<QualityFeedback result={result} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders good quality indicator', () => {
    const result: QualityResult = {
      overall: 'good',
      details: { averageVolume: -15, peakClipping: false, silenceRatio: 20 },
      message: 'Qualité : Bonne',
    };
    render(<QualityFeedback result={result} />);
    expect(screen.getByText('Bonne qualité')).toBeInTheDocument();
    expect(screen.getByTestId('quality-feedback')).toBeInTheDocument();
  });

  it('renders needs_improvement indicator', () => {
    const result: QualityResult = {
      overall: 'needs_improvement',
      details: { averageVolume: -35, peakClipping: false, silenceRatio: 10 },
      message: 'Volume trop bas',
    };
    render(<QualityFeedback result={result} />);
    expect(screen.getByText('À améliorer')).toBeInTheDocument();
    expect(screen.getByText('Volume trop bas')).toBeInTheDocument();
  });

  it('has accessible role=status', () => {
    const result: QualityResult = {
      overall: 'good',
      details: { averageVolume: -15, peakClipping: false, silenceRatio: 20 },
      message: 'OK',
    };
    render(<QualityFeedback result={result} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
