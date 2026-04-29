import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudioSidebar } from '../StudioSidebar';

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

jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => true,
  shouldUseRealApi: () => false,
}));

jest.mock('@/lib/api/studio', () => ({
  listStudioSessions: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/api/tour-comments', () => ({
  listTourComments: jest.fn().mockResolvedValue([]),
}));

describe('StudioSidebar', () => {
  beforeEach(() => mockSignOut.mockClear());

  it('rend les 6 items de navigation', () => {
    render(<StudioSidebar active="dashboard" counts={{ tours: 0, reviews: 0 }} />);
    expect(screen.getByTestId('sidebar-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-tours')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-create')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-profile')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-revenus')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-reviews')).toBeInTheDocument();
  });

  it("marque l'item actif via aria-current", () => {
    render(<StudioSidebar active="tours" counts={{ tours: 5, reviews: 0 }} />);
    expect(screen.getByTestId('sidebar-tours')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('sidebar-dashboard')).not.toHaveAttribute('aria-current');
  });

  it("affiche le compteur 'Mes tours' quand >0", () => {
    render(<StudioSidebar active="dashboard" counts={{ tours: 12, reviews: 0 }} />);
    expect(screen.getByTestId('sidebar-tours-badge')).toHaveTextContent('12');
  });

  it("masque le compteur 'Mes tours' quand 0", () => {
    render(<StudioSidebar active="dashboard" counts={{ tours: 0, reviews: 0 }} />);
    expect(screen.queryByTestId('sidebar-tours-badge')).toBeNull();
  });

  it('affiche le badge avis (grenadine) quand >0', () => {
    render(<StudioSidebar active="dashboard" counts={{ tours: 0, reviews: 3 }} />);
    const badge = screen.getByTestId('sidebar-reviews-badge');
    expect(badge).toHaveTextContent('3');
  });

  it("affiche l'avatar avec l'initiale et le nom du user", () => {
    render(<StudioSidebar active="dashboard" counts={{ tours: 0, reviews: 0 }} />);
    expect(screen.getByText('Steffen Guillaume')).toBeInTheDocument();
    expect(screen.getByText('Guide')).toBeInTheDocument();
  });

  it('déclenche signOut au clic sur le footer', () => {
    render(<StudioSidebar active="dashboard" counts={{ tours: 0, reviews: 0 }} />);
    fireEvent.click(screen.getByTestId('sidebar-logout'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
