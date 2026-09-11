/**
 * Lot 0.4 — `returnTo` honoré, voyageurs chez eux, mot de passe oublié relié.
 */
const mockPush = jest.fn();
let search = '';
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(search),
}));

const mockSignIn = jest.fn();
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  GuideAnalyticsEvents: { GUIDE_PORTAL_LOGIN: 'login' },
}));

import { render, screen, fireEvent, act } from '@testing-library/react';
import GuideLoginPage from '../page';

async function submit() {
  fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'a@b.c' } });
  fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'secret' } });
  await act(async () => {
    fireEvent.click(screen.getByTestId('login-submit'));
  });
}

describe('GuideLoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    search = '';
  });

  it('ramène un voyageur sur ses achats (returnTo), et non sur le Studio', async () => {
    search = 'returnTo=%2Fmes-achats';
    mockSignIn.mockResolvedValue({ ok: true, role: 'tourist' });
    render(<GuideLoginPage />);
    await submit();
    expect(mockPush).toHaveBeenCalledWith('/mes-achats');
  });

  it('ignore un returnTo qui sort du site', async () => {
    search = 'returnTo=%2F%2Fevil.example';
    mockSignIn.mockResolvedValue({ ok: true, role: 'guide' });
    render(<GuideLoginPage />);
    await submit();
    expect(mockPush).toHaveBeenCalledWith('/guide/studio');
  });

  it('envoie chaque rôle chez lui sans returnTo', async () => {
    mockSignIn.mockResolvedValue({ ok: true, role: 'tourist' });
    render(<GuideLoginPage />);
    await submit();
    expect(mockPush).toHaveBeenCalledWith('/mes-achats');
  });

  it('relie « Mot de passe oublié ? » à la réinitialisation', () => {
    render(<GuideLoginPage />);
    expect(screen.getByRole('link', { name: /Mot de passe oublié/ })).toHaveAttribute('href', '/guide/reset-password');
  });
});
