/**
 * Destination après connexion.
 *
 * `/guide/login?returnTo=…` était envoyé par « Mes achats » mais jamais lu :
 * tout le monde partait vers le Studio, et un voyageur y était aussitôt
 * rejeté vers le catalogue, loin de ses achats. `returnTo` n'est honoré que
 * s'il désigne un chemin DE CE SITE : jamais une autre origine (`//evil`,
 * `https:`), jamais la page de connexion elle-même.
 */

import { SITE_URL } from '@/lib/site';

export type LoginRole = 'admin' | 'guide' | 'tourist';

export const LOGIN_PATH = '/guide/login';

export function safeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Chemin absolu du site, sans second slash (protocol-relative) ni antislash,
  // sans caractère de contrôle, et pas la page de connexion (boucle).
  if (!/^\/(?![/\\])/.test(raw)) return null;
  if (/\s/.test(raw)) return null;
  for (const ch of raw) if (ch.charCodeAt(0) < 32) return null;
  // Normaliser avant de refuser les boucles et séparateurs encodés.
  try {
    const original = new URL(raw, SITE_URL);
    const decodedPath = decodeURIComponent(original.pathname);
    if (decodedPath.includes('\\') || /[\u0000-\u0020]/.test(decodedPath) || decodedPath.startsWith('//')) return null;
    const decoded = new URL(decodedPath, SITE_URL);
    for (const url of [original, decoded]) {
      if (url.origin !== SITE_URL) return null;
      if (/^\/(?:guide\/(?:login|signup|reset-password)|connexion|inscription|mot-de-passe-oublie|en\/(?:sign-in|sign-up|reset-password))\/?$/.test(url.pathname)) return null;
    }
  } catch { return null; }
  return raw;
}

/** Où envoyer l'utilisateur une fois connecté. */
export function loginDestination(role: LoginRole | undefined, returnTo: string | null): string {
  if (returnTo) return returnTo;
  if (role === 'admin') return '/admin/moderation';
  if (role === 'guide') return '/guide/studio';
  return '/mes-achats';
}

/** Pourquoi on renvoie à la connexion : affiché en bandeau sur la page. */
export type LoginReason = 'expired' | 'revoked';

/** URL de connexion qui ramènera sur `pathname`, avec le motif s'il y en a un. */
export function loginUrlFor(pathname: string | null | undefined, reason?: LoginReason | null): string {
  const target = safeReturnTo(pathname);
  const params = new URLSearchParams();
  if (target) params.set('returnTo', target);
  if (reason) params.set('reason', reason);
  const query = params.toString();
  return query ? `${LOGIN_PATH}?${query}` : LOGIN_PATH;
}
