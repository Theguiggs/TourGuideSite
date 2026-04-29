import React from 'react';
import { render, screen } from '@testing-library/react';
import { KpiCard } from '../KpiCard';

describe('KpiCard', () => {
  it('rend le label, la valeur et l’icône', () => {
    render(<KpiCard label="Écoutes" value="1 247" color="mer" icon="◉" />);
    expect(screen.getByText('Écoutes')).toBeInTheDocument();
    expect(screen.getByText('1 247')).toBeInTheDocument();
  });

  it('affiche le delta quand fourni', () => {
    render(
      <KpiCard label="Revenus" value="342 €" delta="+24%" color="olive" icon="€" />,
    );
    expect(screen.getByTestId('kpi-delta')).toHaveTextContent('+24%');
  });

  it("masque le delta quand absent", () => {
    render(<KpiCard label="X" value="1" color="ocre" icon="x" />);
    expect(screen.queryByTestId('kpi-delta')).toBeNull();
  });

  it('rend le suffixe sub quand fourni', () => {
    render(<KpiCard label="Note" value="4,7" sub="/ 5" color="ocre" icon="★" />);
    expect(screen.getByText('/ 5')).toBeInTheDocument();
  });
});
