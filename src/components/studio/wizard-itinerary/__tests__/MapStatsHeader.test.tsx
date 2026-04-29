import React from 'react';
import { render, screen } from '@testing-library/react';
import { MapStatsHeader } from '../MapStatsHeader';

describe('MapStatsHeader', () => {
  it("rend les 3 chiffres", () => {
    render(<MapStatsHeader totalPois={6} geolocated={5} validated={3} />);
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it("singulariser les labels à 1", () => {
    const { container } = render(<MapStatsHeader totalPois={1} geolocated={1} validated={1} />);
    expect(container.textContent).toMatch(/POI[^s]/);
    expect(container.textContent).toMatch(/géolocalisé[^s]/);
  });

  it("pluraliser les labels à 0 et 2+", () => {
    const { container } = render(<MapStatsHeader totalPois={0} geolocated={0} validated={0} />);
    expect(container.textContent).toMatch(/POIs/);
  });
});
