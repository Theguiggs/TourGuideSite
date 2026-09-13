import type { StudioError } from '@/types/studio';
import { SITE_LOCALES, type InterfaceLocale } from '@/lib/i18n/locales';

const messages: Record<number, string[]> = {
  2301: ['Microphone permission was denied. Allow access in your browser settings.', 'Se denegó el permiso del micrófono. Permite el acceso en los ajustes del navegador.', 'Mikrofonzugriff wurde verweigert. Erlaube ihn in den Browsereinstellungen.', 'Permesso del microfono negato. Consenti l’accesso nelle impostazioni del browser.', 'Microfoontoegang geweigerd. Geef toestemming in je browserinstellingen.'],
  2302: ['Unable to start recording. Check the microphone and try again.', 'No se pudo iniciar la grabación. Comprueba el micrófono e inténtalo de nuevo.', 'Aufnahme konnte nicht gestartet werden. Prüfe das Mikrofon und versuche es erneut.', 'Impossibile avviare la registrazione. Controlla il microfono e riprova.', 'Kan de opname niet starten. Controleer de microfoon en probeer opnieuw.'],
  2303: ['The recording stopped or was empty and could not be saved. Check the microphone and record a new take.', 'La grabación se detuvo o estaba vacía y no pudo guardarse. Comprueba el micrófono y graba otra toma.', 'Die Aufnahme wurde unterbrochen oder war leer und konnte nicht gespeichert werden. Prüfe das Mikrofon und nimm erneut auf.', 'La registrazione si è interrotta o era vuota e non è stata salvata. Controlla il microfono e registra di nuovo.', 'De opname stopte of was leeg en kon niet worden opgeslagen. Controleer de microfoon en maak een nieuwe opname.'],
  2304: ['This browser does not support audio recording. Try another browser.', 'Este navegador no permite grabar audio. Prueba con otro.', 'Dieser Browser unterstützt keine Audioaufnahme. Versuche einen anderen Browser.', 'Questo browser non supporta la registrazione audio. Provane un altro.', 'Deze browser ondersteunt geen audio-opnamen. Probeer een andere browser.'],
};

export function recorderErrorCopy(error: StudioError, locale: InterfaceLocale): string {
  if (locale === 'fr') return error.message;
  return (messages[error.code] ?? messages[2302])[SITE_LOCALES.indexOf(locale) - 1];
}
