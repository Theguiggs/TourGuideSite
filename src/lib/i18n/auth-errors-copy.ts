import type { InterfaceLocale } from './locales';

/** Same account-enumeration policy in every interface language. */
export const AUTH_ERRORS_COPY: Record<string, Record<Exclude<InterfaceLocale, 'fr' | 'en'>, string>> = {
  'Unable to sign in right now. Please try again shortly.': {
    es: 'No se puede iniciar sesión ahora. Inténtalo de nuevo en unos instantes.', de: 'Die Anmeldung ist momentan nicht möglich. Bitte versuche es gleich erneut.', it: 'Impossibile accedere al momento. Riprova tra poco.', nl: 'Inloggen is nu niet mogelijk. Probeer het over een moment opnieuw.',
  },
  'Unable to create your account right now. Please try again shortly.': {
    es: 'No se puede crear tu cuenta ahora. Inténtalo de nuevo en unos instantes.', de: 'Dein Konto kann momentan nicht erstellt werden. Bitte versuche es gleich erneut.', it: 'Impossibile creare il tuo account al momento. Riprova tra poco.', nl: 'Je account kan nu niet worden aangemaakt. Probeer het over een moment opnieuw.',
  },
  'Unable to verify the code right now. Please try again shortly.': {
    es: 'No se puede verificar el código ahora. Inténtalo de nuevo en unos instantes.', de: 'Der Code kann momentan nicht geprüft werden. Bitte versuche es gleich erneut.', it: 'Impossibile verificare il codice al momento. Riprova tra poco.', nl: 'De code kan nu niet worden gecontroleerd. Probeer het over een moment opnieuw.',
  },
  'Unable to reset your password right now. Please try again shortly.': {
    es: 'No se puede restablecer tu contraseña ahora. Inténtalo de nuevo en unos instantes.', de: 'Dein Passwort kann momentan nicht zurückgesetzt werden. Bitte versuche es gleich erneut.', it: 'Impossibile reimpostare la password al momento. Riprova tra poco.', nl: 'Je wachtwoord kan nu niet opnieuw worden ingesteld. Probeer het over een moment opnieuw.',
  },
  'Incorrect email or password.': {
    es: 'Correo electrónico o contraseña incorrectos.', de: 'E-Mail-Adresse oder Passwort falsch.', it: 'Email o password errata.', nl: 'Onjuist e-mailadres of wachtwoord.',
  },
  'Invalid or expired code. Request a new code.': {
    es: 'Código no válido o caducado. Solicita uno nuevo.', de: 'Ungültiger oder abgelaufener Code. Fordere einen neuen Code an.', it: 'Codice non valido o scaduto. Richiedi un nuovo codice.', nl: 'Ongeldige of verlopen code. Vraag een nieuwe code aan.',
  },
  'Your account is not confirmed. Check your email for the confirmation code.': {
    es: 'Tu cuenta no está confirmada. Revisa tu correo para encontrar el código de confirmación.', de: 'Dein Konto ist noch nicht bestätigt. Prüfe deine E-Mails auf den Bestätigungscode.', it: 'Il tuo account non è confermato. Controlla l’email per il codice di conferma.', nl: 'Je account is niet bevestigd. Controleer je e-mail voor de bevestigingscode.',
  },
  'You need to reset your password. Use “Forgot your password?”.': {
    es: 'Debes restablecer tu contraseña. Usa «¿Has olvidado tu contraseña?».', de: 'Du musst dein Passwort zurücksetzen. Verwende „Passwort vergessen?“.', it: 'Devi reimpostare la password. Usa «Password dimenticata?».', nl: 'Je moet je wachtwoord opnieuw instellen. Gebruik ‘Wachtwoord vergeten?’.',
  },
  'Too many attempts. Please try again in a few minutes.': {
    es: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.', de: 'Zu viele Versuche. Bitte versuche es in einigen Minuten erneut.', it: 'Troppi tentativi. Riprova tra qualche minuto.', nl: 'Te veel pogingen. Probeer het over enkele minuten opnieuw.',
  },
  'This email cannot be used for a new account. If it is yours, sign in or reset your password.': {
    es: 'Este correo no se puede usar para una cuenta nueva. Si es tuyo, inicia sesión o restablece tu contraseña.', de: 'Diese E-Mail-Adresse kann nicht für ein neues Konto verwendet werden. Wenn sie dir gehört, melde dich an oder setze dein Passwort zurück.', it: 'Questa email non può essere usata per un nuovo account. Se è tua, accedi o reimposta la password.', nl: 'Dit e-mailadres kan niet voor een nieuw account worden gebruikt. Als het van jou is, log dan in of stel je wachtwoord opnieuw in.',
  },
  'Your password is too weak. Use at least 8 characters, including an uppercase letter and a number.': {
    es: 'Tu contraseña es demasiado débil. Usa al menos 8 caracteres, con una mayúscula y un número.', de: 'Dein Passwort ist zu schwach. Verwende mindestens 8 Zeichen, darunter einen Großbuchstaben und eine Zahl.', it: 'La password è troppo debole. Usa almeno 8 caratteri, con una maiuscola e un numero.', nl: 'Je wachtwoord is te zwak. Gebruik minstens 8 tekens, waaronder een hoofdletter en een cijfer.',
  },
  'Some information is invalid. Check your email and password.': {
    es: 'Algunos datos no son válidos. Revisa tu correo y contraseña.', de: 'Einige Angaben sind ungültig. Prüfe E-Mail-Adresse und Passwort.', it: 'Alcune informazioni non sono valide. Controlla email e password.', nl: 'Sommige gegevens zijn ongeldig. Controleer je e-mailadres en wachtwoord.',
  },
  'Incorrect code. Check the code in your email.': {
    es: 'Código incorrecto. Revisa el código recibido por correo.', de: 'Falscher Code. Prüfe den Code in deiner E-Mail.', it: 'Codice errato. Controlla il codice ricevuto via email.', nl: 'Onjuiste code. Controleer de code in je e-mail.',
  },
  'The code has expired. Request a new code.': {
    es: 'El código ha caducado. Solicita uno nuevo.', de: 'Der Code ist abgelaufen. Fordere einen neuen Code an.', it: 'Il codice è scaduto. Richiedi un nuovo codice.', nl: 'De code is verlopen. Vraag een nieuwe code aan.',
  },
  'The code could not be sent. Check your email address.': {
    es: 'No se ha podido enviar el código. Revisa tu dirección de correo.', de: 'Der Code konnte nicht gesendet werden. Prüfe deine E-Mail-Adresse.', it: 'Impossibile inviare il codice. Controlla l’indirizzo email.', nl: 'De code kon niet worden verzonden. Controleer je e-mailadres.',
  },
  'No network connection. Check your internet access.': {
    es: 'No hay conexión de red. Revisa tu acceso a internet.', de: 'Keine Netzwerkverbindung. Prüfe deinen Internetzugang.', it: 'Nessuna connessione di rete. Controlla l’accesso a internet.', nl: 'Geen netwerkverbinding. Controleer je internettoegang.',
  },
};
