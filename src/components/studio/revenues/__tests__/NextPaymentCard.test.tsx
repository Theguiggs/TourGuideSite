import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextPaymentCard } from '../NextPaymentCard';

describe('NextPaymentCard', () => {
  it("rend la date label et le 'dans X jours'", () => {
    render(<NextPaymentCard dateLabel="5 mai 2026" daysUntil={8} />);
    expect(screen.getByText('5 mai 2026')).toBeInTheDocument();
    expect(screen.getByText(/dans 8 jours/)).toBeInTheDocument();
  });

  it("affiche 'aujourd'hui' quand daysUntil = 0", () => {
    render(<NextPaymentCard dateLabel="5 mai" daysUntil={0} />);
    expect(screen.getByText(/aujourd'hui/)).toBeInTheDocument();
  });

  it("affiche 'demain' quand daysUntil = 1", () => {
    render(<NextPaymentCard dateLabel="5 mai" daysUntil={1} />);
    expect(screen.getByText('demain')).toBeInTheDocument();
  });

  it("affiche IBAN masqué quand fourni", () => {
    render(
      <NextPaymentCard dateLabel="5 mai 2026" daysUntil={8} ibanLast4="4287" bankLabel="BNP" />,
    );
    expect(screen.getByText(/IBAN •••• 4287/)).toBeInTheDocument();
    expect(screen.getByText(/BNP/)).toBeInTheDocument();
  });

  it("affiche un fallback quand IBAN absent", () => {
    render(<NextPaymentCard dateLabel="5 mai 2026" daysUntil={8} />);
    expect(screen.getByText(/IBAN à renseigner/)).toBeInTheDocument();
  });
});
