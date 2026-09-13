import { requireInterfaceLocale, type InterfaceLocale } from './locales';

/** Static, reviewable translations selected before rendering. */
export const CHECKOUT_COPY = {
  "Payment not completed.": { fr: 'Paiement non finalisé.', en: 'Payment not completed.', es: 'Pago no completado.', de: 'Zahlung nicht abgeschlossen.', it: 'Pagamento non completato.', nl: 'Betaling niet voltooid.' },
  "Get the pass": { fr: 'Prendre le forfait', en: 'Get the pass', es: 'Comprar el pase', de: 'Pass kaufen', it: 'Acquista il pass', nl: 'Pas kopen' },
  "Payment is temporarily unavailable. Please try again later.": {
    "fr": "Le paiement est momentanément indisponible. Réessayez dans quelques instants.",
    "en": "Payment is temporarily unavailable. Please try again later.",
    "es": "El pago no está disponible temporalmente. Inténtalo más tarde.",
    "de": "Die Zahlung ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.",
    "it": "Il pagamento è temporaneamente non disponibile. Riprova più tardi.",
    "nl": "Betalen is tijdelijk niet beschikbaar. Probeer het later opnieuw."
  },
  "Payment declined.": {
    "fr": "Paiement refusé.",
    "en": "Payment declined.",
    "es": "Pago rechazado.",
    "de": "Zahlung abgelehnt.",
    "it": "Pagamento rifiutato.",
    "nl": "Betaling geweigerd."
  },
  "Payment error": {
    "fr": "Erreur paiement",
    "en": "Payment error",
    "es": "Error de pago",
    "de": "Zahlungsfehler",
    "it": "Errore di pagamento",
    "nl": "Betalingsfout"
  },
  "Processing…": {
    "fr": "Paiement…",
    "en": "Processing…",
    "es": "Procesando…",
    "de": "Wird verarbeitet…",
    "it": "Elaborazione…",
    "nl": "Verwerken…"
  },
  "Pay": {
    "fr": "Payer",
    "en": "Pay",
    "es": "Pagar",
    "de": "Bezahlen",
    "it": "Paga",
    "nl": "Betalen"
  },
  "Payment is unavailable for this tour.": {
    "fr": "Paiement indisponible pour cette visite.",
    "en": "Payment is unavailable for this tour.",
    "es": "El pago no está disponible para esta visita.",
    "de": "Die Zahlung ist für diese Tour nicht verfügbar.",
    "it": "Il pagamento non è disponibile per questa visita.",
    "nl": "Betalen is niet beschikbaar voor deze tour."
  },
  "This payment is for another tour. Find it in My tours.": {
    "fr": "Ce paiement concerne une autre visite. Retrouvez-la dans Mes visites.",
    "en": "This payment is for another tour. Find it in My tours.",
    "es": "Este pago corresponde a otra visita. Búscala en Mis visitas.",
    "de": "Diese Zahlung gehört zu einer anderen Tour. Du findest sie unter Meine Touren.",
    "it": "Questo pagamento riguarda un’altra visita. La trovi in Le mie visite.",
    "nl": "Deze betaling hoort bij een andere tour. Je vindt deze onder Mijn tours."
  },
  "Your payment is being processed. The tour will unlock automatically once it is confirmed.": {
    "fr": "Votre paiement est en cours de traitement. La visite se débloquera automatiquement une fois confirmé.",
    "en": "Your payment is being processed. The tour will unlock automatically once it is confirmed.",
    "es": "Tu pago se está procesando. La visita se desbloqueará automáticamente cuando se confirme.",
    "de": "Deine Zahlung wird verarbeitet. Die Tour wird nach der Bestätigung automatisch freigeschaltet.",
    "it": "Il pagamento è in elaborazione. La visita si sbloccherà automaticamente dopo la conferma.",
    "nl": "Je betaling wordt verwerkt. De tour wordt automatisch ontgrendeld zodra deze is bevestigd."
  },
  "This tour can be purchased in the Murmure app.": {
    "fr": "Cette visite s'achète dans l'application Murmure.",
    "en": "This tour can be purchased in the Murmure app.",
    "es": "Puedes comprar esta visita en la aplicación Murmure.",
    "de": "Du kannst diese Tour in der Murmure-App kaufen.",
    "it": "Puoi acquistare questa visita nell’app Murmure.",
    "nl": "Je kunt deze tour kopen in de Murmure-app."
  },
  "Buy": {
    "fr": "Acheter",
    "en": "Buy",
    "es": "Comprar",
    "de": "Kaufen",
    "it": "Acquista",
    "nl": "Kopen"
  },
  "Buy this tour": {
    "fr": "Acheter cette visite",
    "en": "Buy this tour",
    "es": "Comprar esta visita",
    "de": "Diese Tour kaufen",
    "it": "Acquista questa visita",
    "nl": "Deze tour kopen"
  },
  "Tour unlocked": {
    "fr": "Visite débloquée",
    "en": "Tour unlocked",
    "es": "Visita desbloqueada",
    "de": "Tour freigeschaltet",
    "it": "Visita sbloccata",
    "nl": "Tour ontgrendeld"
  },
  "Your tour is ready to listen to on this site.": {
    "fr": "Votre visite est prête à être écoutée sur ce site.",
    "en": "Your tour is ready to listen to on this site.",
    "es": "Tu visita está lista para escucharla en este sitio.",
    "de": "Du kannst deine Tour jetzt auf dieser Website anhören.",
    "it": "La tua visita è pronta per essere ascoltata su questo sito.",
    "nl": "Je tour is klaar om op deze website te beluisteren."
  },
  "Listen now": {
    "fr": "Écouter maintenant",
    "en": "Listen now",
    "es": "Escuchar ahora",
    "de": "Jetzt anhören",
    "it": "Ascolta ora",
    "nl": "Nu luisteren"
  },
  "Secure payment": {
    "fr": "Paiement sécurisé",
    "en": "Secure payment",
    "es": "Pago seguro",
    "de": "Sichere Zahlung",
    "it": "Pagamento sicuro",
    "nl": "Veilig betalen"
  },
  "An error occurred.": {
    "fr": "Une erreur est survenue.",
    "en": "An error occurred.",
    "es": "Se ha producido un error.",
    "de": "Ein Fehler ist aufgetreten.",
    "it": "Si è verificato un errore.",
    "nl": "Er is een fout opgetreden."
  },
  "Try again": {
    "fr": "Réessayer",
    "en": "Try again",
    "es": "Reintentar",
    "de": "Erneut versuchen",
    "it": "Riprova",
    "nl": "Opnieuw proberen"
  },
  "Payment is unavailable.": {
    "fr": "Paiement indisponible.",
    "en": "Payment is unavailable.",
    "es": "El pago no está disponible.",
    "de": "Die Zahlung ist nicht verfügbar.",
    "it": "Il pagamento non è disponibile.",
    "nl": "Betalen is niet beschikbaar."
  },
  "Your payment is being processed. Use Check payment to confirm access.": {
    "fr": "Votre paiement est en cours de traitement. Utilisez Vérifier le paiement pour confirmer l’accès.",
    "en": "Your payment is being processed. Use Check payment to confirm access.",
    "es": "Tu pago se está procesando. Usa Comprobar el pago para confirmar el acceso.",
    "de": "Deine Zahlung wird verarbeitet. Verwende Zahlung prüfen, um den Zugang zu bestätigen.",
    "it": "Il pagamento è in elaborazione. Usa Verifica il pagamento per confermare l’accesso.",
    "nl": "Je betaling wordt verwerkt. Gebruik Betaling controleren om toegang te bevestigen."
  },
  "The pass can be purchased in the Murmure app.": {
    "fr": "Le forfait s'achète dans l'application Murmure.",
    "en": "The pass can be purchased in the Murmure app.",
    "es": "Puedes comprar el pase en la aplicación Murmure.",
    "de": "Du kannst den Pass in der Murmure-App kaufen.",
    "it": "Puoi acquistare il pass nell’app Murmure.",
    "nl": "Je kunt de pas kopen in de Murmure-app."
  },
  "Pass active": {
    "fr": "Forfait actif",
    "en": "Pass active",
    "es": "Pase activo",
    "de": "Pass aktiv",
    "it": "Pass attivo",
    "nl": "Pas actief"
  },
  "Open Murmure with the same account to listen to every tour.": {
    "fr": "Ouvrez Murmure avec le même compte pour écouter toutes les visites.",
    "en": "Open Murmure with the same account to listen to every tour.",
    "es": "Abre Murmure con la misma cuenta para escuchar todas las visitas.",
    "de": "Öffne Murmure mit demselben Konto, um alle Touren anzuhören.",
    "it": "Apri Murmure con lo stesso account per ascoltare tutte le visite.",
    "nl": "Open Murmure met hetzelfde account om alle tours te beluisteren."
  },
  "12 months, no auto-renewal — you will not be charged again.": {
    "fr": "12 mois, sans reconduction — vous ne serez pas prélevé à nouveau.",
    "en": "12 months, no auto-renewal — you will not be charged again.",
    "es": "12 meses, sin renovación automática: no se te volverá a cobrar.",
    "de": "12 Monate ohne automatische Verlängerung – es erfolgt keine weitere Abbuchung.",
    "it": "12 mesi, senza rinnovo automatico: non riceverai altri addebiti.",
    "nl": "12 maanden, zonder automatische verlenging: er wordt niet opnieuw afgeschreven."
  },
  "Find a tour to listen to": {
    "fr": "Trouver une visite à écouter",
    "en": "Find a tour to listen to",
    "es": "Buscar una visita para escuchar",
    "de": "Eine Tour zum Anhören finden",
    "it": "Trova una visita da ascoltare",
    "nl": "Een tour zoeken om te beluisteren"
  },
  "This payment is for another tour. Check My tours.": {
    "fr": "Ce paiement concerne une autre visite. Consultez Mes visites.",
    "en": "This payment is for another tour. Check My tours.",
    "es": "Este pago corresponde a otra visita. Consulta Mis visitas.",
    "de": "Diese Zahlung gehört zu einer anderen Tour. Sieh unter Meine Touren nach.",
    "it": "Questo pagamento riguarda un’altra visita. Consulta Le mie visite.",
    "nl": "Deze betaling hoort bij een andere tour. Bekijk Mijn tours."
  },
  "Confirmation is not available yet. Check again later or contact support before paying again.": {
    "fr": "La confirmation n’est pas encore disponible. Vérifiez plus tard ou contactez l’aide avant de payer à nouveau.",
    "en": "Confirmation is not available yet. Check again later or contact support before paying again.",
    "es": "La confirmación aún no está disponible. Vuelve a comprobarlo más tarde o contacta con ayuda antes de pagar de nuevo.",
    "de": "Die Bestätigung ist noch nicht verfügbar. Prüfe später erneut oder kontaktiere den Support, bevor du erneut bezahlst.",
    "it": "La conferma non è ancora disponibile. Ricontrolla più tardi o contatta l’assistenza prima di pagare di nuovo.",
    "nl": "De bevestiging is nog niet beschikbaar. Controleer later opnieuw of neem contact op met de ondersteuning voordat je opnieuw betaalt."
  },
  "Unable to check right now. Please try again.": {
    "fr": "Vérification impossible pour le moment. Réessayez.",
    "en": "Unable to check right now. Please try again.",
    "es": "No se puede comprobar ahora. Inténtalo de nuevo.",
    "de": "Die Prüfung ist momentan nicht möglich. Bitte versuche es erneut.",
    "it": "Impossibile verificare al momento. Riprova.",
    "nl": "Controleren is nu niet mogelijk. Probeer het opnieuw."
  },
  "Your payment needs confirmation. Check its status before starting another purchase.": {
    "fr": "Votre paiement reste à confirmer. Vérifiez son état avant de recommencer un achat.",
    "en": "Your payment needs confirmation. Check its status before starting another purchase.",
    "es": "Tu pago necesita confirmación. Comprueba su estado antes de iniciar otra compra.",
    "de": "Deine Zahlung muss bestätigt werden. Prüfe ihren Status, bevor du einen weiteren Kauf beginnst.",
    "it": "Il pagamento deve essere confermato. Controlla il suo stato prima di iniziare un altro acquisto.",
    "nl": "Je betaling moet worden bevestigd. Controleer de status voordat je een nieuwe aankoop begint."
  },
  "Checking…": {
    "fr": "Vérification…",
    "en": "Checking…",
    "es": "Comprobando…",
    "de": "Wird geprüft…",
    "it": "Verifica…",
    "nl": "Controleren…"
  },
  "Check payment": {
    "fr": "Vérifier le paiement",
    "en": "Check payment",
    "es": "Comprobar el pago",
    "de": "Zahlung prüfen",
    "it": "Verifica il pagamento",
    "nl": "Betaling controleren"
  },
  "My tours": {
    "fr": "Mes visites",
    "en": "My tours",
    "es": "Mis visitas",
    "de": "Meine Touren",
    "it": "Le mie visite",
    "nl": "Mijn tours"
  },
  "Sign in to continue": {
    "fr": "Se connecter pour continuer",
    "en": "Sign in to continue",
    "es": "Inicia sesión para continuar",
    "de": "Anmelden, um fortzufahren",
    "it": "Accedi per continuare",
    "nl": "Log in om door te gaan"
  },
  "Create an account": {
    "fr": "Créer un compte",
    "en": "Create an account",
    "es": "Crear una cuenta",
    "de": "Konto erstellen",
    "it": "Crea un account",
    "nl": "Account aanmaken"
  },
  "Forgot password?": {
    "fr": "Mot de passe oublié ?",
    "en": "Forgot password?",
    "es": "¿Has olvidado tu contraseña?",
    "de": "Passwort vergessen?",
    "it": "Password dimenticata?",
    "nl": "Wachtwoord vergeten?"
  }
} as const satisfies Record<string, Record<InterfaceLocale, string>>;

export function checkoutText(locale: InterfaceLocale, key: keyof typeof CHECKOUT_COPY): string {
  return CHECKOUT_COPY[key][requireInterfaceLocale(locale)];
}
