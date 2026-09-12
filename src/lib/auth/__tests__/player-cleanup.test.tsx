import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth-context';
import { resumeKey, writeResume, RESUME_CLEAR_KEY } from '@/components/catalogue/scene-player/resume-store';

const mockSignOut = jest.fn();
const mockProfile = jest.fn();
let mockHub: (event: { payload: { event: string } }) => void;
jest.mock('aws-amplify/auth', () => ({
  signOut: () => mockSignOut(), signIn: jest.fn(),
  getCurrentUser: async () => ({ userId: 'u1' }),
  fetchUserAttributes: async () => ({ email: 'test@example.com' }),
  fetchAuthSession: async () => ({ tokens: { accessToken: { payload: {} } } }),
}));
jest.mock('aws-amplify/utils', () => ({ Hub: { listen: (_: string, callback: typeof mockHub) => { mockHub = callback; return () => {}; } } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: jest.fn() }), usePathname: () => '/mes-achats' }));
jest.mock('@/lib/api/appsync-client', () => ({ getOwnGuideProfile: () => mockProfile() }));
jest.mock('@/lib/studio/studio-session-cleanup', () => ({ clearStudioLocalState: async () => {} }));

function Account() {
  const auth = useAuth();
  return <button onClick={() => void auth.signOut()}>{auth.user ? 'Déconnexion' : 'Anonyme'}</button>;
}

describe('LW-6 — déconnexion du compte', () => {
  beforeEach(() => { window.localStorage.clear(); mockSignOut.mockResolvedValue(undefined); mockProfile.mockResolvedValue(null); });

  it.each([false, true])('efface les reprises lors d’une déconnexion explicite (échec réseau=%s)', async (fails) => {
    if (fails) mockSignOut.mockRejectedValueOnce(new Error('réseau'));
    render(<AuthProvider><Account /></AuthProvider>);
    await screen.findByText('Déconnexion');
    writeResume('tour-1', { sceneId: 's1', position: 25 });
    fireEvent.click(screen.getByText('Déconnexion'));
    await waitFor(() => expect(screen.getByText('Anonyme')).toBeVisible());
    expect(window.localStorage.getItem(resumeKey('tour-1'))).toBeNull();
  });

  it('efface aussi les reprises sur le signal signedOut', async () => {
    render(<AuthProvider><Account /></AuthProvider>);
    await screen.findByText('Déconnexion');
    writeResume('tour-1', { sceneId: 's1', position: 25 });
    act(() => mockHub({ payload: { event: 'signedOut' } }));
    expect(window.localStorage.getItem(resumeKey('tour-1'))).toBeNull();
    expect(screen.getByText('Anonyme')).toBeVisible();
  });

  it('abandonne l’identité après déconnexion dans un autre onglet', async () => {
    render(<AuthProvider><Account /></AuthProvider>);
    await screen.findByText('Déconnexion');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: RESUME_CLEAR_KEY, newValue: 'session-suivante' })));
    expect(screen.getByText('Anonyme')).toBeVisible();
  });

  it('une restauration tardive ne réinstalle pas le compte après déconnexion distante', async () => {
    let resolve!: (value: null) => void;
    mockProfile.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<AuthProvider><Account /></AuthProvider>);
    await act(async () => {});
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: RESUME_CLEAR_KEY, newValue: 'session-suivante' })));
    await act(async () => resolve(null));
    expect(screen.getByText('Anonyme')).toBeVisible();
  });
});
