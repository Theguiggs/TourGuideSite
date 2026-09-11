/**
 * Correspondance des routes publiques FR ↔ EN.
 *
 * Une seule table, lue dans les deux sens : la version précédente portait une
 * liste EN→FR et une chaîne de `if` FR→EN écrite à la main, à maintenir
 * deux fois — et `/guides/[slug]` n'y était pas, la bascule de langue y
 * restait muette. Les préfixes couvrent leurs sous-chemins
 * (`/catalogue/nice` → `/en/catalogue/nice`).
 */

export type PublicLocale = 'fr' | 'en';

/** [français, anglais], du plus spécifique au plus général. */
export const PUBLIC_ROUTE_PAIRS: ReadonlyArray<readonly [string, string]> = [
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
  const path = pathname || '/';
  const [fromIndex, toIndex] = locale === 'en' ? [0, 1] : [1, 0];
  // Le chemin est-il déjà dans la langue demandée ? On le garde tel quel.
  if (PUBLIC_ROUTE_PAIRS.some((pair) => matches(path, pair[toIndex]))) return path;
  const pair = PUBLIC_ROUTE_PAIRS.find((candidate) => matches(path, candidate[fromIndex]));
  if (!pair) return path;
  return swap(path, pair[fromIndex], pair[toIndex]);
}
