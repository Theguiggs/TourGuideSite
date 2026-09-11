/**
 * Pagination exhaustive d'une requête `list` AppSync.
 *
 * AppSync ne rend qu'une page par appel (100 éléments lus par défaut, et le
 * `filter` s'applique APRÈS la lecture de la page). Tout appelant qui veut
 * « toutes les lignes » doit boucler sur `nextToken` — sinon la vue se tronque
 * silencieusement dès que la table dépasse une page, comme le compte guide qui
 * n'affichait plus que 100 visites sur 118 (2026-09-11).
 *
 * Utilisable côté client comme côté serveur (aucune dépendance Amplify ici).
 */
export async function paginateAll<T>(
  fetcher: (nextToken: string | null | undefined) => Promise<{ data: T[]; nextToken?: string | null }>,
): Promise<T[]> {
  const all: T[] = [];
  let nextToken: string | null | undefined = null;
  do {
    const page = await fetcher(nextToken);
    all.push(...(page.data ?? []));
    nextToken = page.nextToken;
  } while (nextToken);
  return all;
}
