import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioProgressBar } from '../progress-bar';

describe('StudioProgressBar', () => {
  it('renders all 5 workflow steps', () => {
    render(<StudioProgressBar />);
    expect(screen.getByText('Général')).toBeInTheDocument();
    expect(screen.getByText('Itinéraire')).toBeInTheDocument();
    expect(screen.getByText('Scènes')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Publication')).toBeInTheDocument();
  });

  it('highlights current step with aria-current', () => {
    render(<StudioProgressBar currentStep="scenes" />);
    const step = screen.getByText('Scènes').closest('div');
    expect(step).toHaveAttribute('aria-current', 'step');
  });

  it('does not highlight non-current steps', () => {
    render(<StudioProgressBar currentStep="general" />);
    const step = screen.getByText('Scènes').closest('div');
    expect(step).not.toHaveAttribute('aria-current');
  });

  it('applies completed styles to completed steps', () => {
    render(<StudioProgressBar currentStep="scenes" completedSteps={['general', 'itinerary']} />);
    const generalStep = screen.getByText('Général').closest('div');
    expect(generalStep?.className).toContain('grenadine');
  });

  it('has accessible navigation role', () => {
    render(<StudioProgressBar />);
    expect(screen.getByRole('navigation', { name: /progression/i })).toBeInTheDocument();
  });
});
