/**
 * Story 4.6 — Le Header expose un lien « Aide » (AC13).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import Header from '../Header';
import { VisitorBottomNav } from '../auth/visitor-bottom-nav';
import { localizePublicPath } from '@/lib/i18n/public-routes';

let mockPath = '/';
let mockParams = new URLSearchParams();
jest.mock('next/navigation', () => ({ usePathname: () => mockPath, useSearchParams: () => mockParams }));

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    signOut: jest.fn(),
  }),
}));

describe('Header', () => {
  beforeEach(() => { mockPath = '/'; mockParams = new URLSearchParams(); window.history.replaceState(null, '', '/'); });
  it.each(['en', 'es', 'de', 'it', 'nl'] as const)('préserve le retour Stripe vers %s sans exposer le secret client', locale => {
    mockPath = '/catalogue/nice/promenade';
    mockParams = new URLSearchParams({payment_intent: 'pi_pending', murmure_pay: 'tour', redirect_status: 'processing', payment_intent_client_secret: 'pi_pending_secret_private'});
    render(<Header />);
    const link = screen.getByRole('link', {name: locale.toUpperCase()});
    const url = new URL(link.getAttribute('href')!, 'https://example.test');
    expect(url.pathname).toBe(localizePublicPath(mockPath, locale));
    expect(url.searchParams.get('payment_intent')).toBe('pi_pending');
    expect(url.searchParams.get('murmure_pay')).toBe('tour');
    expect(url.searchParams.get('redirect_status')).toBe('processing');
    expect(url.searchParams.has('payment_intent_client_secret')).toBe(false);
  });
  it('affiche un lien « Aide » vers /aide', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Aide' })).toHaveAttribute('href', '/aide');
  });
  it('expose connexion et Mes visites avant authentification', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Mes visites' })).toHaveAttribute('href', '/mes-achats');
    expect(screen.getAllByRole('link', { name: 'Se connecter' }).every(link => link.getAttribute('href')?.startsWith('/connexion'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    expect(screen.getByRole('button', { name: 'Fermer le menu' })).toHaveAttribute('aria-expanded', 'true');
  });
  it('partage le retour complet entre header et compte mobile', () => {
    mockPath = '/catalogue/nice/test'; mockParams = new URLSearchParams('lang=en');
    window.history.replaceState(null, '', '/catalogue/nice/test?lang=en#scene-2');
    render(<><Header /><VisitorBottomNav locale="fr" pathname={mockPath} /></>);
    const expected = '/connexion?returnTo=%2Fcatalogue%2Fnice%2Ftest%3Flang%3Den%23scene-2';
    expect(screen.getByRole('link', { name: 'Compte' })).toHaveAttribute('href', expected);
    expect(screen.getAllByRole('link', { name: 'Se connecter' })[0]).toHaveAttribute('href', expected);
  });
  it('transporte l’étape courante et le retour lors du changement de langue', () => {
    mockPath = '/inscription'; mockParams = new URLSearchParams({ step: 'login', returnTo: '/catalogue/nice/test?lang=en#scene' });
    render(<Header />);
    const href = screen.getByRole('link', { name: 'EN' }).getAttribute('href')!;
    const url = new URL(href, 'https://test.invalid');
    expect(url.searchParams.get('step')).toBe('login');
    expect(url.searchParams.get('returnTo')).toBe('/en/catalogue/nice/test?lang=en#scene');
  });
});
