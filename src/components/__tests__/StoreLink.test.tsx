/**
 * Lot 0.4 — sans URL de magasin au build, aucun bouton « Télécharger » ;
 * jamais un lien vers `#`.
 */
import { render, screen } from '@testing-library/react';
import StoreLink from '../StoreLink';
import SmartAppLink from '../SmartAppLink';

const mockGetStoreUrl = jest.fn();
const mockIsMobile = jest.fn();
jest.mock('@/lib/app-store', () => ({
  getStoreUrl: (...a: unknown[]) => mockGetStoreUrl(...a),
  isMobileUserAgent: (...a: unknown[]) => mockIsMobile(...a),
}));

describe('StoreLink', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ne rend rien sans magasin', () => {
    mockGetStoreUrl.mockReturnValue(null);
    render(<StoreLink>Télécharger</StoreLink>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('pointe vers le magasin du visiteur', () => {
    mockGetStoreUrl.mockReturnValue('https://apps.apple.com/app/id1');
    render(<StoreLink>Télécharger</StoreLink>);
    expect(screen.getByRole('link', { name: 'Télécharger' })).toHaveAttribute('href', 'https://apps.apple.com/app/id1');
    expect(mockGetStoreUrl).toHaveBeenLastCalledWith(navigator.userAgent);
  });
});

describe('SmartAppLink', () => {
  beforeEach(() => jest.clearAllMocks());

  it('disparaît sur ordinateur quand il n’y a pas de magasin', () => {
    mockIsMobile.mockReturnValue(false);
    mockGetStoreUrl.mockReturnValue(null);
    render(<SmartAppLink tourId="t1">Ouvrir dans l’app</SmartAppLink>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('sur ordinateur, est un lien ordinaire vers le magasin', () => {
    mockIsMobile.mockReturnValue(false);
    mockGetStoreUrl.mockReturnValue('https://play.google.com/x');
    render(<SmartAppLink tourId="t1">Ouvrir dans l’app</SmartAppLink>);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://play.google.com/x');
  });

  it('sur mobile, reste cliquable même sans magasin (le lien profond suffit)', () => {
    mockIsMobile.mockReturnValue(true);
    mockGetStoreUrl.mockReturnValue(null);
    render(<SmartAppLink tourId="t1">Ouvrir dans l’app</SmartAppLink>);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});
