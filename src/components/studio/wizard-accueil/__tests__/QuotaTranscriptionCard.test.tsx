import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuotaTranscriptionCard } from '../QuotaTranscriptionCard';

describe('QuotaTranscriptionCard', () => {
  it("rend les valeurs used / total", () => {
    render(<QuotaTranscriptionCard usedMin={8.5} totalMin={120} />);
    expect(screen.getByTestId('quota-numbers')).toHaveTextContent('8,5 / 120 min');
  });

  it("formate les minutes entières sans décimale", () => {
    render(<QuotaTranscriptionCard usedMin={50} totalMin={120} />);
    expect(screen.getByTestId('quota-numbers')).toHaveTextContent('50 / 120 min');
  });

  it("calcule la largeur de la barre proportionnellement (50/120 ≈ 41.67%)", () => {
    render(<QuotaTranscriptionCard usedMin={60} totalMin={120} />);
    const bar = screen.getByTestId('quota-bar') as HTMLDivElement;
    expect(bar.style.width).toBe('50%');
  });

  it('affiche le restant', () => {
    render(<QuotaTranscriptionCard usedMin={20} totalMin={120} />);
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText(/disponibles/)).toBeInTheDocument();
  });

  it("affiche 'Quota épuisé' quand 100% atteint", () => {
    render(<QuotaTranscriptionCard usedMin={120} totalMin={120} />);
    expect(screen.getByText(/Quota épuisé/)).toBeInTheDocument();
  });

  it("clamp à 100% pour un overshoot (used > total)", () => {
    render(<QuotaTranscriptionCard usedMin={150} totalMin={120} />);
    const bar = screen.getByTestId('quota-bar') as HTMLDivElement;
    expect(bar.style.width).toBe('100%');
  });

  it("affiche le mois quand fourni", () => {
    render(<QuotaTranscriptionCard usedMin={10} totalMin={100} monthLabel="avril" />);
    expect(screen.getByText(/avril/)).toBeInTheDocument();
    expect(screen.getByText(/ce mois-ci/)).toBeInTheDocument();
  });

  it("gère totalMin=0 sans crash", () => {
    render(<QuotaTranscriptionCard usedMin={0} totalMin={0} />);
    expect(screen.getByTestId('quota-numbers')).toBeInTheDocument();
  });
});
