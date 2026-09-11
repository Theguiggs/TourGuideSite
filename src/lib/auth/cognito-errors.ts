/**
 * Un seul traducteur des erreurs Cognito (lot 6.4).
 *
 * Trois copies vivaient dans trois pages, toutes indexées sur `error.message`
 * alors qu'Amplify v6 met le nom de l'exception dans `error.name` : la plupart
 * des branches ne s'exécutaient jamais et le message anglais brut d'Amplify
 * arrivait dans le bandeau rouge. Le repli est un libellé générique, jamais
 * le message brut.
 *
 * Politique d'énumération, ALIGNÉE entre les trois écrans : aucun message ne
 * dit si un email est connu. La connexion confond « inconnu » et « mauvais
 * mot de passe » ; l'inscription et la réinitialisation renvoient vers la
 * connexion ou vers l'envoi d'un code sans confirmer l'existence du compte.
 */

export type AuthErrorContext = 'signIn' | 'signUp' | 'confirmSignUp' | 'reset';

const GENERIC: Record<AuthErrorContext, string> = {
  signIn: 'Connexion impossible pour le moment. Réessayez dans un instant.',
  signUp: 'Inscription impossible pour le moment. Réessayez dans un instant.',
  confirmSignUp: 'Vérification impossible pour le moment. Réessayez dans un instant.',
  reset: 'Réinitialisation impossible pour le moment. Réessayez dans un instant.',
};

/** Nom Cognito de l'erreur, quel que soit l'endroit où Amplify l'a rangé. */
export function cognitoErrorName(error: unknown): string {
  if (!(error instanceof Error)) return '';
  const known = [
    'UserNotFoundException', 'NotAuthorizedException', 'UserNotConfirmedException',
    'PasswordResetRequiredException', 'TooManyRequestsException', 'LimitExceededException',
    'UsernameExistsException', 'InvalidPasswordException', 'InvalidParameterException',
    'CodeMismatchException', 'ExpiredCodeException', 'UserAlreadyAuthenticatedException',
    'NetworkError', 'AliasExistsException', 'CodeDeliveryFailureException',
  ];
  if (known.includes(error.name)) return error.name;
  return known.find((n) => error.message.includes(n)) ?? error.name;
}

/** Vrai quand l'erreur signifie « compte inconnu » : à absorber selon le contexte. */
export function isUnknownUserError(error: unknown): boolean {
  return cognitoErrorName(error) === 'UserNotFoundException';
}

export function describeAuthError(error: unknown, context: AuthErrorContext): string {
  const name = cognitoErrorName(error);
  switch (name) {
    case 'UserNotFoundException':
    case 'NotAuthorizedException':
      if (context === 'signIn') return 'Email ou mot de passe incorrect.';
      if (context === 'reset') return 'Code invalide ou expiré. Demandez un nouveau code.';
      return GENERIC[context];
    case 'UserNotConfirmedException':
      return 'Compte non confirmé : vérifiez votre email pour le code de confirmation.';
    case 'PasswordResetRequiredException':
      return 'Réinitialisation du mot de passe requise : utilisez « Mot de passe oublié ».';
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'UsernameExistsException':
    case 'AliasExistsException':
      // Ne confirme pas l'existence du compte : renvoie vers les deux issues.
      return 'Cet email ne peut pas être utilisé pour une nouvelle inscription. Si c’est le vôtre, connectez-vous ou réinitialisez votre mot de passe.';
    case 'InvalidPasswordException':
      return 'Mot de passe trop faible : 8 caractères minimum, avec une majuscule et un chiffre.';
    case 'InvalidParameterException':
      return 'Une information est invalide. Vérifiez l’email et le mot de passe.';
    case 'CodeMismatchException':
      return 'Code incorrect. Vérifiez le code reçu par email.';
    case 'ExpiredCodeException':
      return 'Code expiré. Demandez un nouveau code.';
    case 'CodeDeliveryFailureException':
      return 'Le code n’a pas pu être envoyé. Vérifiez l’adresse email.';
    case 'NetworkError':
      return 'Pas de connexion réseau. Vérifiez votre accès à internet.';
    default:
      return GENERIC[context];
  }
}
