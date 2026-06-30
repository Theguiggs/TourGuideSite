import React from 'react';
import { render, screen } from '@testing-library/react';
import { MapStatsHeader } from '../MapStatsHeader';

describe('MapStatsHeader', () => {
  it("rend les 2 chiffres", () => {
    render(<MapStatsHeader totalPois={6} geolocated={5} />);
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it("singulariser les labels à 1", () => {
    const { container } = render(<MapStatsHeader totalPois={1} geolocated={1} />);
    expect(container.textContent).toMatch(/POI[^s]/);
    expect(container.textContent).toMatch(/géolocalisé[^s]/);
  });

  it("pluraliser les labels à 0 et 2+", () => {
    const { container } = render(<MapStatsHeader totalPois={0} geolocated={0} />);
    expect(container.textContent).toMatch(/POIs/);
  });
});
