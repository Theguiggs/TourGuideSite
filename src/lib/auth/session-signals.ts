/**
 * Signaux de session (lot 6.4).
 *
 * Le proxy microservice répond 401 (jeton expiré ou absent) ou 403 (compte
 * qui n'est plus guide). Ces deux réponses étaient avalées comme un échec
 * quelconque de TTS ou de traduction. Ici, la couche API émet un événement
 * que `AuthProvider` écoute pour rediriger vers la connexion avec un motif,
 * et chaque composant affiche un libellé qui dit la vraie cause.
 */

export type SessionRefusal = 'expired' | 'revoked';

export const SESSION_REFUSAL_EVENT = 'murmure:session-refusal';

export function refusalFromStatus(status: number): SessionRefusal | null {
  if (status === 401) return 'expired';
  if (status === 403) return 'revoked';
  return null;
}

export const REFUSAL_MESSAGES: Record<SessionRefusal, { fr: string; en: string }> = {
  expired: { fr: 'Session expirée : reconnectez-vous.', en: 'Session expired: sign in again.' },
  revoked: { fr: 'Accès guide retiré : cette action n’est plus autorisée.', en: 'Guide access revoked: this action is no longer allowed.' },
};

export function refusalMessage(refusal: SessionRefusal, locale: 'fr' | 'en' = 'fr'): string {
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
