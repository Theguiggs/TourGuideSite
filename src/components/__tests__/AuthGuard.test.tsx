import { render, screen, waitFor } from '@testing-library/react';
import AuthGuard from '../AuthGuard';
import { useAuth } from '@/lib/auth/auth-context';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function authState(overrides: Partial<ReturnType<typeof useAuth>>) {
  return {
    user: null,
    isAuthenticated: false,
    isGuide: false,
    isAdmin: false,
    isTourist: false,
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    refreshUser: jest.fn(),
    ...overrides,
  };
}

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects an unauthenticated visitor to login', async () => {
    mockUseAuth.mockReturnValue(authState({}));
    render(<AuthGuard requireGuide>Studio</AuthGuard>);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/guide/login'));
    expect(screen.queryByText('Studio')).not.toBeInTheDocument();
  });

  it('redirects an authenticated tourist away from the Studio', async () => {
    mockUseAuth.mockReturnValue(
      authState({ isAuthenticated: true, isTourist: true }),
    );
    render(<AuthGuard requireGuide>Studio</AuthGuard>);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/catalogue'));
    expect(screen.queryByText('Studio')).not.toBeInTheDocument();
  });

  it.each([
    ['guide', { isAuthenticated: true, isGuide: true }],
    ['admin', { isAuthenticated: true, isGuide: true, isAdmin: true }],
  ])('renders the Studio for a %s', (_role, state) => {
    mockUseAuth.mockReturnValue(authState(state));
    render(<AuthGuard requireGuide>Studio</AuthGuard>);

    expect(screen.getByText('Studio')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
