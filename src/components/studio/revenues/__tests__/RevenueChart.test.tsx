import React from 'react';
import { render, screen } from '@testing-library/react';
import { RevenueChart } from '../RevenueChart';

const data = [
  { label: 'Mai 25', value: 142 },
  { label: 'Jun', value: 188 },
  { label: 'Jul', value: 312 },
  { label: 'Avr 26', value: 342 },
];

describe('RevenueChart', () => {
  it("rend une barre par mois", () => {
    render(<RevenueChart data={data} />);
    expect(screen.getAllByTestId('revenue-chart-bar')).toHaveLength(4);
  });

  it("highlight la dernière barre par défaut", () => {
    render(<RevenueChart data={data} />);
    const bars = screen.getAllByTestId('revenue-chart-bar');
    expect(bars[3]).toHaveAttribute('data-current', 'true');
    expect(bars[0]).not.toHaveAttribute('data-current');
  });

  it("respecte highlightIndex custom", () => {
    render(<RevenueChart data={data} highlightIndex={1} />);
    const bars = screen.getAllByTestId('revenue-chart-bar');
    expect(bars[1]).toHaveAttribute('data-current', 'true');
    expect(bars[3]).not.toHaveAttribute('data-current');
  });

  it("affiche le montant uniquement sur la barre highlightée", () => {
    render(<RevenueChart data={data} />);
    // 342 € sur la dernière, rien d'affiché sur les autres
    const bars = screen.getAllByTestId('revenue-chart-bar');
    expect(bars[3]).toHaveTextContent('342');
    // Les autres bar labels n'ont pas de montant
    expect(bars[0]).not.toHaveTextContent('142');
  });

  it("rend les labels mois sous les barres", () => {
    render(<RevenueChart data={data} />);
    expect(screen.getByText('Mai 25')).toBeInTheDocument();
    expect(screen.getByText('Avr 26')).toBeInTheDocument();
  });
});
