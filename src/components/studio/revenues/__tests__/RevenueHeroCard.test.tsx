import React from 'react';
import { render, screen } from '@testing-library/react';
import { RevenueHeroCard } from '../RevenueHeroCard';

describe('RevenueHeroCard', () => {
  it('rend le montant et les écoutes', () => {
    render(<RevenueHeroCard amount={342} listens={1247} />);
    const amount = screen.getByTestId('revenue-hero-amount');
    expect(amount).toHaveTextContent('342');
    expect(screen.getByText(/1[\s ]247 écoutes payantes/)).toBeInTheDocument();
  });

  it("inclut le symbole € et la part 70%", () => {
    render(<RevenueHeroCard amount={342} listens={1247} />);
    expect(screen.getByText(/part de 70/)).toBeInTheDocument();
  });

  it("affiche le delta quand fourni", () => {
    render(<RevenueHeroCard amount={342} listens={100} delta={{ pct: 24, sign: '+' }} />);
    expect(screen.getByTestId('revenue-hero-delta')).toHaveTextContent('+24 %');
  });

  it("masque le delta si absent", () => {
    render(<RevenueHeroCard amount={342} listens={100} />);
    expect(screen.queryByTestId('revenue-hero-delta')).toBeNull();
  });

  it("affiche '=' quand sign est égal", () => {
    render(<RevenueHeroCard amount={1} listens={1} delta={{ pct: 0, sign: '=' }} />);
    expect(screen.getByTestId('revenue-hero-delta')).toHaveTextContent('=');
  });

  it("rend le label expectedLabel personnalisé", () => {
    render(<RevenueHeroCard amount={1} listens={1} expectedLabel="À recevoir le 5 mai" />);
    expect(screen.getByText('À recevoir le 5 mai')).toBeInTheDocument();
  });
});
