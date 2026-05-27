/**
 * Story 4.6 — Page d'aide (/aide).
 */
import { render, screen } from '@testing-library/react';
import AidePage from '../page';
import { STEPS, FAQ_GUIDES, FAQ_VOYAGEURS, SUPPORT_EMAIL } from '../_content';

describe('AidePage', () => {
  it('rend les 7 étapes avec leurs ancres HTML (AC9)', () => {
    const { container } = render(<AidePage />);
    expect(STEPS).toHaveLength(7);
    STEPS.forEach((step) => {
      expect(screen.getByText(step.title)).toBeInTheDocument();
      expect(container.querySelector(`#${step.id}`)).not.toBeNull();
    });
  });

  it('affiche une FAQ guides (≥6) et voyageurs (≥4) (AC11)', () => {
    const { container } = render(<AidePage />);
    expect(FAQ_GUIDES.length).toBeGreaterThanOrEqual(6);
    expect(FAQ_VOYAGEURS.length).toBeGreaterThanOrEqual(4);
    // Une <details> par question, tous groupes confondus.
    expect(container.querySelectorAll('details')).toHaveLength(
      FAQ_GUIDES.length + FAQ_VOYAGEURS.length,
    );
    // Échantillon de chaque groupe (texte importé → match exact garanti).
    expect(screen.getByText(FAQ_GUIDES[1].q)).toBeInTheDocument();
    expect(screen.getByText(FAQ_VOYAGEURS[0].q)).toBeInTheDocument();
  });

  it('fournit un contact mailto vers le support (AC12)', () => {
    render(<AidePage />);
    expect(
      screen.getByRole('link', { name: /Contacter le support/i }),
    ).toHaveAttribute('href', `mailto:${SUPPORT_EMAIL}`);
  });
});
