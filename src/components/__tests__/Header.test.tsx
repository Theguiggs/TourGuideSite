/**
 * Story 4.6 — Le Header expose un lien « Aide » (AC13).
 */
import { render, screen } from '@testing-library/react';
import Header from '../Header';

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    signOut: jest.fn(),
  }),
}));

describe('Header', () => {
  it('affiche un lien « Aide » vers /aide', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: 'Aide' })).toHaveAttribute('href', '/aide');
  });
});
