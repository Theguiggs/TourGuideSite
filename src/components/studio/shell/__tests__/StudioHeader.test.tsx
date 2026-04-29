import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudioHeader } from '../StudioHeader';

const mockSignOut = jest.fn();

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'g1',
      email: 'g1@test.fr',
      displayName: 'Steffen Guillaume',
      role: 'guide',
      guideId: 'guide-1',
    },
    isAuthenticated: true,
    isGuide: true,
    isAdmin: false,
    isLoading: false,
    signIn: jest.fn(),
    signOut: mockSignOut,
    refreshUser: jest.fn(),
  }),
}));

describe('StudioHeader', () => {
  beforeEach(() => mockSignOut.mockClear());

  it('rend le wordmark Murmure et le tag STUDIO', () => {
    render(<StudioHeader />);
    expect(screen.getByText('Murmure')).toBeInTheDocument();
    expect(screen.getByText(/Studio/i)).toBeInTheDocument();
  });

  it('rend les liens de navigation externe', () => {
    render(<StudioHeader />);
    expect(screen.getByRole('link', { name: /Catalogue public/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Aide/i })).toBeInTheDocument();
  });

  it("affiche l'avatar avec l'initiale et le nom du user", () => {
    render(<StudioHeader />);
    const userBtn = screen.getByTestId('studio-header-user');
    expect(userBtn).toHaveTextContent('S');
    expect(userBtn).toHaveTextContent('Steffen Guillaume');
  });

  it("ouvre/ferme le menu déroulant et déclenche signOut", () => {
    render(<StudioHeader />);
    const userBtn = screen.getByTestId('studio-header-user');

    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(userBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: /Se déconnecter/i }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
