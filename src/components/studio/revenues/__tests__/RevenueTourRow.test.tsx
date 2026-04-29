import React from 'react';
import { render, screen } from '@testing-library/react';
import { RevenueTourRow } from '../RevenueTourRow';

describe('RevenueTourRow', () => {
  it("rend la ville en MAJ + le titre + plays + revenue + %", () => {
    render(
      <RevenueTourRow
        city="Nice"
        title="Nice Insolite"
        listens={287}
        revenue={86}
        percentage={25}
      />,
    );
    expect(screen.getByText('Nice')).toBeInTheDocument();
    expect(screen.getByText('Nice Insolite')).toBeInTheDocument();
    expect(screen.getByText('287')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it("formate le revenue en €", () => {
    render(
      <RevenueTourRow city="Nice" title="t" listens={1} revenue={86} percentage={1} />,
    );
    expect(screen.getByText(/86/)).toBeInTheDocument();
  });

  it("formate les listens avec séparateur français", () => {
    render(
      <RevenueTourRow city="Nice" title="t" listens={1247} revenue={1} percentage={1} />,
    );
    expect(screen.getByText(/1[\s ]247/)).toBeInTheDocument();
  });

  it("masque le border-bottom sur la dernière ligne", () => {
    const { container } = render(
      <RevenueTourRow city="Nice" title="t" listens={1} revenue={1} percentage={1} isLast />,
    );
    expect(container.querySelector('[data-testid="revenue-tour-row"]')?.className).not.toContain('border-b');
  });
});
