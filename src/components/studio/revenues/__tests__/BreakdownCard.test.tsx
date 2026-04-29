import React from 'react';
import { render, screen } from '@testing-library/react';
import { BreakdownCard } from '../BreakdownCard';

describe('BreakdownCard', () => {
  it('rend les 5 lignes du calcul', () => {
    render(
      <BreakdownCard
        listens={1247}
        grossPerListen={0.39}
        grossTotal={489}
        sharePct={70}
        netAmount={342}
      />,
    );
    expect(screen.getByText(/Écoutes payantes/)).toBeInTheDocument();
    expect(screen.getByText(/× revenu brut moyen/)).toBeInTheDocument();
    expect(screen.getByText(/= revenu brut total/)).toBeInTheDocument();
    expect(screen.getByText(/× votre part/)).toBeInTheDocument();
    expect(screen.getByText(/Vous recevrez/)).toBeInTheDocument();
  });

  it("affiche '70 %' pour la part", () => {
    render(
      <BreakdownCard listens={1} grossPerListen={1} grossTotal={1} sharePct={70} netAmount={1} />,
    );
    expect(screen.getByText('70 %')).toBeInTheDocument();
  });

  it("affiche le net en grand", () => {
    const { container } = render(
      <BreakdownCard listens={1} grossPerListen={1} grossTotal={1} sharePct={70} netAmount={342} />,
    );
    const netLine = container.querySelector('.font-display');
    expect(netLine).toBeTruthy();
    expect(netLine?.textContent).toMatch(/342/);
  });

  it("formate les listens en français", () => {
    render(
      <BreakdownCard
        listens={1247}
        grossPerListen={1}
        grossTotal={1}
        sharePct={70}
        netAmount={1}
      />,
    );
    expect(screen.getByText(/1[\s ]247/)).toBeInTheDocument();
  });
});
