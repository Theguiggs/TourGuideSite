/**
 * Lot 3.4 — les pages du catalogue sont dynamiques : sans squelette, chaque
 * navigation attendait AppSync sur un écran vide.
 */
import { render, screen } from '@testing-library/react';
import { CatalogueSkeleton } from '../CatalogueSkeleton';
import CatalogueLoading from '@/app/catalogue/loading';
import CityLoading from '@/app/catalogue/[city]/loading';
import TourLoading from '@/app/catalogue/[city]/[tourSlug]/loading';
import EnTourLoading from '@/app/en/catalogue/[city]/[tourSlug]/loading';

describe('CatalogueSkeleton', () => {
  it.each(['cities', 'city', 'tour'] as const)('annonce le chargement (%s)', (variant) => {
    render(<CatalogueSkeleton variant={variant} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-label', 'Chargement du catalogue');
    expect(screen.getByTestId(`catalogue-skeleton-${variant}`)).toBeInTheDocument();
  });

  it('parle anglais sur les pages EN', () => {
    render(<EnTourLoading />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading the catalogue');
  });

  it('chaque segment du catalogue a son squelette', () => {
    for (const Loading of [CatalogueLoading, CityLoading, TourLoading]) {
      const { unmount } = render(<Loading />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      unmount();
    }
  });
});
