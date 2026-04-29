import React from 'react';
import { render, screen } from '@testing-library/react';
import { TopTourRow } from '../TopTourRow';

describe('TopTourRow', () => {
  it('rend la ville en MAJUSCULES + le titre', () => {
    render(
      <TopTourRow href="/x" city="Nice" title="Nice Insolite" plays={287} rating={4.8} />,
    );
    expect(screen.getByText('NICE')).toBeInTheDocument();
    expect(screen.getByText('Nice Insolite')).toBeInTheDocument();
  });

  it("pointe vers le bon href", () => {
    render(
      <TopTourRow
        href="/guide/studio/sess-1"
        city="Cannes"
        title="T"
        plays={100}
        rating={4.5}
      />,
    );
    expect(screen.getByTestId('top-tour-row')).toHaveAttribute(
      'href',
      '/guide/studio/sess-1',
    );
  });

  it("affiche '—' quand plays/rating sont null", () => {
    render(
      <TopTourRow href="/x" city="Paris" title="T" plays={null} rating={null} />,
    );
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it("formate le rating avec une virgule (FR)", () => {
    render(<TopTourRow href="/x" city="Nice" title="T" plays={1} rating={4.8} />);
    expect(screen.getByText('★4,8')).toBeInTheDocument();
  });

  it("rend une sparkline si sparkData fourni avec >1 point", () => {
    const { container } = render(
      <TopTourRow
        href="/x"
        city="Nice"
        title="T"
        plays={1}
        rating={4.5}
        sparkData={[1, 2, 3, 4, 5]}
      />,
    );
    expect(container.querySelector('svg polyline')).not.toBeNull();
  });

  it("ne rend pas de sparkline avec 0 ou 1 point", () => {
    const { container } = render(
      <TopTourRow href="/x" city="Nice" title="T" plays={1} rating={4.5} />,
    );
    expect(container.querySelector('svg polyline')).toBeNull();
  });
});
