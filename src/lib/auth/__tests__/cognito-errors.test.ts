import { describeAuthError, isUnknownUserError } from '../cognito-errors';

function cognito(name: string, message = 'Some AWS message.') {
  const e = new Error(message);
  e.name = name;
  return e;
}

describe('describeAuthError (lot 6.4)', () => {
  it('lit le nom Amplify v6 (error.name), pas seulement le message', () => {
    expect(describeAuthError(cognito('NotAuthorizedException', 'Incorrect username or password.'), 'signIn')).toBe('Email ou mot de passe incorrect.');
    expect(describeAuthError(cognito('UserNotFoundException'), 'signIn')).toBe('Email ou mot de passe incorrect.');
  });

  it('ne laisse jamais passer le message brut : repli générique', () => {
    const raw = new Error('PreSignUp failed with error Something internal.');
    expect(describeAuthError(raw, 'signUp')).not.toContain('PreSignUp');
    expect(describeAuthError('pas une Error', 'reset')).toMatch(/Réessayez/);
  });

  it('ne révèle pas qu’un email est connu à l’inscription', () => {
    const msg = describeAuthError(cognito('UsernameExistsException'), 'signUp');
    expect(msg).not.toMatch(/existe déjà/);
    expect(msg).toMatch(/connectez-vous/);
  });

  it('nomme « compte inconnu » pour que la réinitialisation l’absorbe', () => {
    expect(isUnknownUserError(cognito('UserNotFoundException'))).toBe(true);
    expect(isUnknownUserError(cognito('CodeMismatchException'))).toBe(false);
  });
});
