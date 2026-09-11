/**
 * Destination après connexion.
 *
 * `/guide/login?returnTo=…` était envoyé par « Mes achats » mais jamais lu :
 * tout le monde partait vers le Studio, et un voyageur y était aussitôt
 * rejeté vers le catalogue, loin de ses achats. `returnTo` n'est honoré que
 * s'il désigne un chemin DE CE SITE : jamais une autre origine (`//evil`,
 * `https:`), jamais la page de connexion elle-même.
 */

export type LoginRole = 'admin' | 'guide' | 'tourist';

export const LOGIN_PATH = '/guide/login';

export function safeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Chemin absolu du site, sans second slash (protocol-relative) ni antislash,
  // sans caractère de contrôle, et pas la page de connexion (boucle).
  if (!/^\/(?![/\\])/.test(raw)) return null;
  if (/\s/.test(raw)) return null;
  for (const ch of raw) if (ch.charCodeAt(0) < 32) return null;
  if (raw === LOGIN_PATH || raw.startsWith(`${LOGIN_PATH}?`)) return null;
  return raw;
}

/** Où envoyer l'utilisateur une fois connecté. */
export function loginDestination(role: LoginRole | undefined, returnTo: string | null): string {
  if (returnTo) return returnTo;
  if (role === 'admin') return '/admin/moderation';
  if (role === 'guide') return '/guide/studio';
  return '/mes-achats';
}

/** URL de connexion qui ramènera sur `pathname`. */
export function loginUrlFor(pathname: string | null | undefined): string {
  const target = safeReturnTo(pathname);
  return target ? `${LOGIN_PATH}?returnTo=${encodeURIComponent(target)}` : LOGIN_PATH;
}
