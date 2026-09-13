/**
 * Correspondance des routes publiques FR ↔ EN.
 *
 * Une seule table, lue dans les deux sens : la version précédente portait une
 * liste EN→FR et une chaîne de `if` FR→EN écrite à la main, à maintenir
 * deux fois — et `/guides/[slug]` n'y était pas, la bascule de langue y
 * restait muette. Les préfixes couvrent leurs sous-chemins
 * (`/catalogue/nice` → `/en/catalogue/nice`).
 */

import { requireInterfaceLocale, type InterfaceLocale } from './locales';

export type PublicLocale = InterfaceLocale;

/** [français, anglais], du plus spécifique au plus général. */
export const PUBLIC_ROUTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['/creer-des-visites', '/en/create-tours'],
  ['/connexion', '/en/sign-in'],
  ['/inscription', '/en/sign-up'],
  ['/mot-de-passe-oublie', '/en/reset-password'],
  ['/mes-achats', '/en/my-purchases'],
  ['/supprimer-mon-compte', '/en/delete-account'],
  ['/confidentialite', '/en/privacy'],
  ['/cgu', '/en/terms'],
  ['/aide', '/en/help'],
  ['/catalogue', '/en/catalogue'],
  ['/guides', '/en/guides'],
  ['/', '/en'],
];

function matches(path: string, prefix: string): boolean {
  if (prefix === '/') return path === '/';
  return path === prefix || path.startsWith(`${prefix}/`);
}

function swap(path: string, from: string, to: string): string {
  if (from === '/') return to;
  return `${to}${path.slice(from.length)}` || '/';
}

export function localizePublicPath(pathname: string, locale: PublicLocale): string {
  requireInterfaceLocale(locale);
  const input = pathname || '/';
  // Preserve filters, payment returns and fragments verbatim. Never interpret
  // an external URL as an application path.
  if (!input.startsWith('/') || input.startsWith('//') || input.includes('\\')) return input;
  const boundary = input.search(/[?#]/);
  const suffix = boundary < 0 ? '' : input.slice(boundary);
  let path = boundary < 0 ? input : input.slice(0, boundary);
  const newPrefix = path.match(/^\/(es|de|it|nl)(?=\/|$)/)?.[0];
  if (newPrefix) path = `/en${path.slice(newPrefix.length)}`;
  const pair = PUBLIC_ROUTE_PAIRS.find(([fr, en]) => matches(path, en) || matches(path, fr));
  if (!pair) return input;
  const from = matches(path, pair[1]) ? pair[1] : pair[0];
  const english = swap(path, from, pair[1]);
  const result = locale === 'fr' ? swap(path, from, pair[0])
    : locale === 'en' ? english : `/${locale}${english.slice(3)}`;
  return result + suffix;
}
