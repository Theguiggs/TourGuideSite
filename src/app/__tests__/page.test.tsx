import { render, screen } from '@testing-library/react';
import LandingPage, { metadata } from '../page';
import EnglishLanding from '../en/page';
import { CreatorHome } from '@/components/home/creator-home';

jest.mock('@/components/TrackPageView', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/home/home-catalogue', () => ({ HomeCatalogue: () => <div data-testid="published-selection" /> }));

describe('EV-2 — accueil visiteur', () => {
  it('place recherche et bibliothèque avant les suggestions et le parcours créateur', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Découvrez la ville autrement.');
    expect(screen.getByRole('search')).toHaveAttribute('action', '/catalogue');
    expect(screen.getByLabelText('Dans quelle ville ?')).toHaveAttribute('name', 'q');
    expect(screen.getByRole('link', { name: 'Mes visites' })).toHaveAttribute('href', '/mes-achats');
    expect(screen.getByRole('link', { name: 'Créer des visites' })).toHaveAttribute('href', '/creer-des-visites');
    expect(screen.queryByText('Devenir guide')).not.toBeInTheDocument();
  });
  it('propose le même parcours en anglais', () => {
    render(<EnglishLanding />);
    expect(screen.getByRole('search')).toHaveAttribute('action', '/en/catalogue');
    expect(screen.getByRole('button', { name: 'Find a tour' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My tours' })).toHaveAttribute('href', '/en/my-purchases');
    expect(screen.getByRole('link', { name: 'Create tours' })).toHaveAttribute('href', '/en/create-tours');
  });
  it('aligne les métadonnées sur la découverte et l’écoute', () => {
    expect(metadata.description).toContain('écoutez un extrait');
    expect(metadata.openGraph).toEqual(expect.objectContaining({ url: '/', locale: 'fr_FR' }));
    expect(metadata.twitter).toEqual(expect.objectContaining({ description: metadata.description }));
  });
  it('conserve les étapes, ancres et accès du créateur sur sa page dédiée', () => {
    render(<CreatorHome locale="fr" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Donnez de la voix à votre ville.');
    expect(screen.getByRole('link', { name: 'Devenir guide' })).toHaveAttribute('href', '/guide/signup');
    for (const [label, anchor] of [['Créez', 'creer'], ['Tracez', 'tracer'], ['Racontez', 'raconter'], ['Publiez', 'publier']]) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', '/aide#' + anchor);
    }
  });
});
