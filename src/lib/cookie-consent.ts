/**
 * Consentement à la mesure d'audience (Amplitude).
 *
 * Amplitude s'initialisait au premier rendu de chaque page, avec sessions et
 * attribution : des identifiants d'appareil écrits dans le navigateur avant
 * tout choix du visiteur. Ce n'est pas exempté de consentement. Le choix est
 * stocké ici, versionné : changer `CONSENT_VERSION` redemande le choix.
 *
 * SSR-safe : sans `window`, rien n'est lu ni écrit.
 */

export const CONSENT_VERSION = 1;
export const CONSENT_KEY = 'murmure:cookie-consent';
export const CONSENT_EVENT = 'murmure:cookie-consent-changed';

export type ConsentChoice = 'accepted' | 'refused';

interface StoredConsent {
  version: number;
  choice: ConsentChoice;
  at: string;
}

function canStore(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

/** Choix en vigueur, ou null s'il faut (re)demander. */
export function readCookieConsent(): ConsentChoice | null {
  if (!canStore()) return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed.choice === 'accepted' || parsed.choice === 'refused' ? parsed.choice : null;
  } catch {
    return null;
  }
}

export function writeCookieConsent(choice: ConsentChoice): void {
  if (!canStore()) return;
  try {
    const stored: StoredConsent = { version: CONSENT_VERSION, choice, at: new Date().toISOString() };
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(stored));
  } catch {
    /* mode privé, quota : le choix vaut pour la page courante seulement */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

/** Oublie le choix : le bandeau se représente. */
export function resetCookieConsent(): void {
  if (!canStore()) return;
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* ignoré */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}

export function subscribeCookieConsent(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CONSENT_EVENT, listener);
  return () => window.removeEventListener(CONSENT_EVENT, listener);
}
