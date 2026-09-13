import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, type SignInResult } from '../auth-context';

const mockSignIn = jest.fn();
const mockProfile = jest.fn();
const mockCurrent = jest.fn();
const mockDone = jest.fn();
jest.mock('aws-amplify/auth', () => ({ signIn: (...args: unknown[]) => mockSignIn(...args), signOut: jest.fn(), getCurrentUser: () => mockCurrent(), fetchUserAttributes: async () => ({ email: 'visiteur@example.test' }), fetchAuthSession: async () => ({ tokens: { accessToken: { payload: {} } } }) }));
jest.mock('aws-amplify/utils', () => ({ Hub: { listen: () => () => {} } }));
jest.mock('next/navigation', () => ({ usePathname: () => '/connexion', useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@/lib/api/appsync-client', () => ({ getOwnGuideProfile: () => mockProfile() }));

function Account() {
  const auth = useAuth();
  return <button disabled={auth.isLoading} onClick={() => void auth.signIn('visiteur@example.test', 'Visiteur1!').then((result: SignInResult) => mockDone(result))}>{auth.isAuthenticated ? 'Connecté' : 'Connexion'}</button>;
}
beforeEach(() => {
  jest.clearAllMocks(); mockCurrent.mockRejectedValueOnce(new Error('pas de session')).mockResolvedValue({ userId: 'visitor' }); mockProfile.mockResolvedValue(null);
});
async function login() {
  render(<AuthProvider><Account /></AuthProvider>);
  await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
  await act(async () => fireEvent.click(screen.getByRole('button')));
}
it.each([['CONFIRM_SIGN_UP', 'confirmSignUp'], ['RESET_PASSWORD', 'resetPassword']])('retourne %s sans résoudre de profil', async (signInStep, nextStep) => {
  mockSignIn.mockResolvedValue({ isSignedIn: false, nextStep: { signInStep } }); await login();
  expect(mockDone).toHaveBeenCalledWith(expect.objectContaining({ ok: false, nextStep })); expect(mockProfile).not.toHaveBeenCalled();
});
it('refuse une étape supplémentaire non prise en charge', async () => {
  mockSignIn.mockResolvedValue({ isSignedIn: false, nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_TOTP_CODE' } }); await login();
  expect(mockDone).toHaveBeenCalledWith(expect.objectContaining({ ok: false, errorCode: 'AdditionalStepRequired' })); expect(mockProfile).not.toHaveBeenCalled();
});
it('reconnaît un visiteur après connexion complète sans créer de profil', async () => {
  mockSignIn.mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } }); await login();
  expect(mockDone).toHaveBeenCalledWith({ ok: true, role: 'tourist' }); expect(screen.getByRole('button')).toHaveTextContent('Connecté');
});
it('renvoie une erreur récupérable si la résolution du profil échoue', async () => {
  mockSignIn.mockResolvedValue({ isSignedIn: true }); mockProfile.mockRejectedValueOnce(new Error('réseau')); await login();
  expect(mockDone).toHaveBeenCalledWith(expect.objectContaining({ ok: false })); expect(screen.getByRole('button')).toHaveTextContent('Connexion');
});
