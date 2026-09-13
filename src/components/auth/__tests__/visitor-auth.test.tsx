import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VisitorAuth } from '../visitor-auth';

const mockPush = jest.fn();
let mockParams = new URLSearchParams();
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockConfirm = jest.fn();
const mockResend = jest.fn();
const mockReset = jest.fn();
const mockConfirmReset = jest.fn();
const mockAuth = { signIn: mockSignIn, isLoading: false, isAuthenticated: false, isGuide: false, isAdmin: false, user: null, signOut: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }), useSearchParams: () => mockParams }));
jest.mock('@/lib/auth/auth-context', () => ({ useAuth: () => mockAuth }));
jest.mock('@/lib/analytics', () => ({ AnalyticsEvents: {}, trackEvent: jest.fn() }));
jest.mock('aws-amplify/auth', () => ({ signUp: (...args: unknown[]) => mockSignUp(...args), confirmSignUp: (...args: unknown[]) => mockConfirm(...args), resendSignUpCode: (...args: unknown[]) => mockResend(...args), resetPassword: (...args: unknown[]) => mockReset(...args), confirmResetPassword: (...args: unknown[]) => mockConfirmReset(...args) }));

const failure = (name: string) => Object.assign(new Error('message privé non affichable'), { name });
function credentials(password = true) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'Visiteur@example.test' } });
  if (password) fireEvent.change(screen.getByLabelText(/^(Mot de passe|Password)$/), { target: { value: 'Visiteur1!' } });
}
function submit() { fireEvent.submit(document.querySelector('form')!); }

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, '', '/connexion');
  mockParams = new URLSearchParams({ returnTo: '/en/catalogue/nice/test?lang=en#scene-2' });
  mockSignIn.mockResolvedValue({ ok: true, role: 'tourist' });
  mockSignUp.mockResolvedValue({ isSignUpComplete: false });
  mockConfirm.mockResolvedValue({ isSignUpComplete: true });
  mockReset.mockResolvedValue({ nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' } });
});

it('revient à la fiche, ses paramètres et son ancre pour tout rôle connecté', async () => {
  mockSignIn.mockResolvedValue({ ok: true, role: 'guide' });
  render(<VisitorAuth locale="en" mode="login" />); credentials(); submit();
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en/catalogue/nice/test?lang=en#scene-2'));
});

it('refuse un retour externe et utilise la bibliothèque anglaise', async () => {
  mockParams = new URLSearchParams({ returnTo: '//evil.example' });
  render(<VisitorAuth locale="en" mode="login" />); credentials(); submit();
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en/my-purchases'));
});

it('inscrit seulement dans Cognito, efface le mot de passe et confirme avant connexion', async () => {
  render(<VisitorAuth locale="fr" mode="signup" />); credentials(); submit();
  await screen.findByRole('heading', { name: 'Confirmer mon email' });
  expect(mockSignUp).toHaveBeenCalledWith({ username: 'visiteur@example.test', password: 'Visiteur1!', options: { userAttributes: { email: 'visiteur@example.test' } } });
  expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument();
  expect(mockSignIn).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Code reçu par email'), { target: { value: '123456' } }); submit();
  await screen.findByRole('heading', { name: 'Se connecter' });
  expect(mockConfirm).toHaveBeenCalledWith({ username: 'visiteur@example.test', confirmationCode: '123456' });
  expect(screen.getByLabelText('Mot de passe')).toHaveValue('');
  expect(window.location.search).toContain('step=login');
  expect(screen.getByRole('link', { name: 'English' }).getAttribute('href')).toContain('step=login');
});

it('propose la confirmation et un renvoi pour un compte non confirmé', async () => {
  mockSignIn.mockResolvedValue({ ok: false, nextStep: 'confirmSignUp' });
  render(<VisitorAuth locale="fr" mode="login" />); credentials(); submit();
  await screen.findByRole('heading', { name: 'Confirmer mon email' });
  fireEvent.click(screen.getByRole('button', { name: 'Renvoyer le code' }));
  await waitFor(() => expect(mockResend).toHaveBeenCalledWith({ username: 'visiteur@example.test' }));
  expect(mockPush).not.toHaveBeenCalled();
});

it.each(['CodeMismatchException', 'ExpiredCodeException'])('traduit %s et permet de réessayer', async (name) => {
  mockParams.set('step', 'confirm'); mockConfirm.mockRejectedValueOnce(failure(name));
  render(<VisitorAuth locale="en" mode="signup" />); credentials(false);
  fireEvent.change(screen.getByLabelText('Code from your email'), { target: { value: '123456' } }); submit();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(name === 'CodeMismatchException' ? 'Incorrect code' : 'expired'));
  expect(screen.getByRole('button', { name: 'Confirm my account' })).toBeEnabled();
  expect(screen.queryByText('message privé non affichable')).not.toBeInTheDocument();
});

it('permet la récupération imposée puis retrouve la connexion et la destination', async () => {
  mockSignIn.mockResolvedValue({ ok: false, nextStep: 'resetPassword' });
  render(<VisitorAuth locale="fr" mode="login" />); credentials(); submit();
  await screen.findByRole('button', { name: 'Envoyer le code' }); submit();
  await screen.findByLabelText('Nouveau mot de passe');
  fireEvent.change(screen.getByLabelText('Code reçu par email'), { target: { value: '456789' } });
  fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'Nouveau1!' } }); submit();
  await screen.findByRole('heading', { name: 'Se connecter' });
  expect(mockConfirmReset).toHaveBeenCalledWith({ username: 'visiteur@example.test', confirmationCode: '456789', newPassword: 'Nouveau1!' });
  expect(screen.getByLabelText('Mot de passe')).toHaveValue('');
});

it('ne révèle pas un email inconnu pendant la récupération', async () => {
  mockReset.mockRejectedValueOnce(failure('UserNotFoundException'));
  render(<VisitorAuth locale="en" mode="reset" />); credentials(false); submit();
  await screen.findByLabelText('Code from your email');
  expect(screen.getByRole('alert')).toBeEmptyDOMElement();
});

it('protège le double envoi et ignore une redirection après démontage', async () => {
  let resolve!: (value: { ok: boolean }) => void;
  mockSignIn.mockReturnValue(new Promise(done => { resolve = done; }));
  const view = render(<VisitorAuth locale="fr" mode="login" />); credentials(); submit(); submit();
  expect(mockSignIn).toHaveBeenCalledTimes(1);
  const link = screen.getByRole('link', { name: 'Créer un compte visiteur' });
  expect(link).toHaveAttribute('aria-disabled', 'true');
  view.unmount(); await act(async () => resolve({ ok: true }));
  expect(mockPush).not.toHaveBeenCalled();
});

it('rend la main après une erreur réseau imprévue', async () => {
  mockSignIn.mockRejectedValueOnce(failure('NetworkError'));
  render(<VisitorAuth locale="en" mode="login" />); credentials(); submit();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No network connection'));
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
});

it('permet les allers-retours entre formulaires sur une même route', () => {
  render(<VisitorAuth locale="fr" mode="signup" />);
  fireEvent.click(screen.getByRole('link', { name: 'Déjà un compte ? Se connecter' }));
  expect(screen.getByRole('heading', { name: 'Se connecter' })).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: 'Créer un compte visiteur' }));
  expect(screen.getByRole('heading', { name: 'Créer mon compte' })).toBeVisible();
  fireEvent.click(screen.getByRole('link', { name: 'Mot de passe oublié ?' }));
  expect(screen.getByRole('button', { name: 'Envoyer le code' })).toBeVisible();
});

it('suit une nouvelle étape d’URL sans conserver le code secret', () => {
  mockParams.set('step', 'confirm');
  const view = render(<VisitorAuth locale="fr" mode="signup" />);
  fireEvent.change(screen.getByLabelText('Code reçu par email'), { target: { value: '123456' } });
  mockParams = new URLSearchParams();
  view.rerender(<VisitorAuth locale="fr" mode="signup" />);
  expect(screen.getByRole('heading', { name: 'Créer mon compte' })).toBeVisible();
  expect(screen.queryByLabelText('Code reçu par email')).not.toBeInTheDocument();
});
