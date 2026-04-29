import React from 'react';
import { render, screen } from '@testing-library/react';
import { CityFamilyBadge } from '../CityFamilyBadge';

describe('CityFamilyBadge', () => {
  it("affiche 'Mer' pour Nice", () => {
    render(<CityFamilyBadge city="Nice" />);
    expect(screen.getByTestId('city-family-badge')).toHaveAttribute('data-family', 'mer');
    expect(screen.getByTestId('city-family-badge')).toHaveTextContent('Mer');
  });

  it("affiche 'Ocre' pour Grasse", () => {
    render(<CityFamilyBadge city="Grasse" />);
    expect(screen.getByTestId('city-family-badge')).toHaveAttribute('data-family', 'ocre');
  });

  it("affiche 'Olive' pour Vence", () => {
    render(<CityFamilyBadge city="Vence" />);
    expect(screen.getByTestId('city-family-badge')).toHaveAttribute('data-family', 'olive');
  });

  it("fallback Ardoise pour ville inconnue", () => {
    render(<CityFamilyBadge city="Tombouctou" />);
    expect(screen.getByTestId('city-family-badge')).toHaveAttribute('data-family', 'ardoise');
  });

  it("résiste à null/empty (fallback Ardoise)", () => {
    render(<CityFamilyBadge city="" />);
    expect(screen.getByTestId('city-family-badge')).toHaveAttribute('data-family', 'ardoise');
  });
});
