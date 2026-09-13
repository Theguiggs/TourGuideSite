import type {InterfaceLocale} from './locales';

export const LAUNCH_BANNER_COPY: Record<InterfaceLocale, {label: string; text: string; action: string}> = {
  fr: {label: 'Offre de lancement', text: 'Toutes les visites sont gratuites jusqu’au {date}. Créez votre compte pour en profiter.', action: 'Se connecter'},
  en: {label: 'Launch offer', text: 'All tours are free until {date}. Create your account to enjoy them.', action: 'Sign in'},
  es: {label: 'Oferta de lanzamiento', text: 'Todas las visitas son gratuitas hasta el {date}. Crea tu cuenta para disfrutarlas.', action: 'Iniciar sesión'},
  de: {label: 'Startangebot', text: 'Alle Touren sind bis zum {date} kostenlos. Erstelle dein Konto, um sie zu nutzen.', action: 'Anmelden'},
  it: {label: 'Offerta di lancio', text: 'Tutte le visite sono gratuite fino al {date}. Crea il tuo account per approfittarne.', action: 'Accedi'},
  nl: {label: 'Lanceringsaanbod', text: 'Alle tours zijn gratis tot {date}. Maak een account aan om ervan te genieten.', action: 'Inloggen'},
};

export const LAUNCH_CARD_COPY: Record<InterfaceLocale, {title: string; ready: string; login: string; listen: string}> = {
  fr: {title: 'Visite offerte pendant le lancement', ready: 'Votre compte vous donne accès à toutes les étapes jusqu’au {date}.', login: 'Connectez-vous gratuitement pour accéder à toutes les étapes jusqu’au {date}.', listen: 'Écouter maintenant'},
  en: {title: 'Tour included in the launch offer', ready: 'Your account gives you access to every stop until {date}.', login: 'Sign in for free to access every stop until {date}.', listen: 'Listen now'},
  es: {title: 'Visita incluida en la oferta de lanzamiento', ready: 'Tu cuenta te da acceso a todas las etapas hasta el {date}.', login: 'Inicia sesión gratis para acceder a todas las etapas hasta el {date}.', listen: 'Escuchar ahora'},
  de: {title: 'Tour im Startangebot enthalten', ready: 'Dein Konto gibt dir bis zum {date} Zugang zu allen Stationen.', login: 'Melde dich kostenlos an, um bis zum {date} auf alle Stationen zuzugreifen.', listen: 'Jetzt anhören'},
  it: {title: 'Visita inclusa nell’offerta di lancio', ready: 'Il tuo account ti dà accesso a tutte le tappe fino al {date}.', login: 'Accedi gratuitamente per visitare tutte le tappe fino al {date}.', listen: 'Ascolta ora'},
  nl: {title: 'Tour inbegrepen in het lanceringsaanbod', ready: 'Je account geeft je tot {date} toegang tot alle stops.', login: 'Log gratis in om tot {date} toegang te krijgen tot alle stops.', listen: 'Nu luisteren'},
};
