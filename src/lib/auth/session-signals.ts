/**
 * Signaux de session (lot 6.4).
 *
 * Le proxy microservice répond 401 (jeton expiré ou absent) ou 403 (compte
 * qui n'est plus guide). Ces deux réponses étaient avalées comme un échec
 * quelconque de TTS ou de traduction. Ici, la couche API émet un événement
 * que `AuthProvider` écoute pour rediriger vers la connexion avec un motif,
 * et chaque composant affiche un libellé qui dit la vraie cause.
 */

import type { InterfaceLocale } from '@/lib/i18n/locales';
export type SessionRefusal = 'expired' | 'revoked';

export const SESSION_REFUSAL_EVENT = 'murmure:session-refusal';

export function refusalFromStatus(status: number): SessionRefusal | null {
  if (status === 401) return 'expired';
  if (status === 403) return 'revoked';
  return null;
}

export const REFUSAL_MESSAGES: Record<SessionRefusal, Record<InterfaceLocale, string>> = {
  expired: { fr: 'Session expirée : reconnectez-vous.', en: 'Session expired: sign in again.', es: 'Sesión caducada: vuelve a iniciar sesión.', de: 'Sitzung abgelaufen: bitte erneut anmelden.', it: 'Sessione scaduta: accedi di nuovo.', nl: 'Sessie verlopen: log opnieuw in.' },
  revoked: { fr: 'Accès guide retiré : cette action n’est plus autorisée.', en: 'Guide access revoked: this action is no longer allowed.', es: 'Acceso de guía revocado: esta acción ya no está permitida.', de: 'Guide-Zugang entzogen: diese Aktion ist nicht mehr erlaubt.', it: 'Accesso guida revocato: questa azione non è più consentita.', nl: 'Gidstoegang ingetrokken: deze actie is niet meer toegestaan.' },
};

export function refusalMessage(refusal: SessionRefusal, locale: InterfaceLocale = 'fr'): string {
  return REFUSAL_MESSAGES[refusal][locale];
}

/** Émet le signal (navigateur seulement) et rend le message FR pour la couche API. */
export function reportSessionRefusal(status: number): string | null {
  const refusal = refusalFromStatus(status);
  if (!refusal) return null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<SessionRefusal>(SESSION_REFUSAL_EVENT, { detail: refusal }));
  }
  return refusalMessage(refusal);
}
