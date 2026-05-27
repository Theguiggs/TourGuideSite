/**
 * Story 4.6 — Page d'accueil orientée guide (guide-first).
 */
import { render, screen } from '@testing-library/react';
import LandingPage from '../page';

// CitiesSection fetche via getCities() ; TrackPageView émet de l'analytics.
// On les neutralise pour isoler le rendu de la home.
jest.mock('@/components/CitiesSection', () => ({
  __esModule: true,
  default: () => <div data-testid="cities-section" />,
}));
jest.mock('@/components/TrackPageView', () => ({
  __esModule: true,
  default: () => null,
}));

beforeAll(() => {
  // HeroCta utilise window.matchMedia (absent de jsdom).
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  });
});

describe('LandingPage (guide-first)', () => {
  it('affiche le hero orienté guide (AC1)', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Donnez de la voix à votre ville/i,
      }),
    ).toBeInTheDocument();
  });

  it('expose un CTA « Devenir guide » vers /guide/signup (AC1)', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('link', { name: /Devenir guide/i }),
    ).toHaveAttribute('href', '/guide/signup');
  });

  it('lie les 4 étapes aux ancres de la page d’aide (AC2)', () => {
    render(<LandingPage />);
    expect(screen.getByRole('link', { name: /Créez/i })).toHaveAttribute('href', '/aide#creer');
    expect(screen.getByRole('link', { name: /Tracez/i })).toHaveAttribute('href', '/aide#tracer');
    expect(screen.getByRole('link', { name: /Racontez/i })).toHaveAttribute('href', '/aide#raconter');
    expect(screen.getByRole('link', { name: /Publiez/i })).toHaveAttribute('href', '/aide#publier');
  });

  it('conserve un bloc voyageur secondaire vers le catalogue (AC4)', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('link', { name: /Voir le catalogue/i }),
    ).toHaveAttribute('href', '/catalogue');
    expect(screen.getByTestId('cities-section')).toBeInTheDocument();
  });

  it('clôture avec un CTA création de parcours (AC5)', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('link', { name: /Créer mon premier parcours/i }),
    ).toHaveAttribute('href', '/guide/signup');
  });
});
