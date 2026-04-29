import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSkeleton } from '../LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it("shape='rows' par défaut, 3 rangées", () => {
    const { container } = render(<LoadingSkeleton />);
    const rows = container.querySelectorAll('.animate-pulse');
    expect(rows).toHaveLength(3);
  });

  it("respecte count custom", () => {
    const { container } = render(<LoadingSkeleton count={5} />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5);
  });

  it("shape='card' rend un seul block", () => {
    const { container } = render(<LoadingSkeleton shape="card" />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(1);
  });

  it("shape='inline' rend un span", () => {
    const { container } = render(<LoadingSkeleton shape="inline" />);
    expect(container.querySelector('span.animate-pulse')).not.toBeNull();
  });

  it("aria-busy=true et aria-label par défaut", () => {
    render(<LoadingSkeleton />);
    const sk = screen.getByTestId('loading-skeleton');
    expect(sk).toHaveAttribute('aria-busy', 'true');
    expect(sk).toHaveAttribute('aria-label', 'Chargement…');
  });

  it("label custom respecté", () => {
    render(<LoadingSkeleton label="Veuillez patienter" />);
    expect(screen.getByTestId('loading-skeleton')).toHaveAttribute(
      'aria-label',
      'Veuillez patienter',
    );
  });
});
