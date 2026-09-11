/**
 * Cache mémoire à durée de vie, avec dédoublonnage des lectures en vol.
 *
 * Le catalogue serveur relisait la table complète des visites publiées à
 * chaque appel — trois balayages par fiche affichée (métadonnées, page,
 * ville) — et gardait les profils de guide dans des Maps de module jamais
 * rafraîchies (un guide renommé restait invisible jusqu'au redémarrage).
 *
 * `unstable_cache` de Next est exclu : le client AppSync serveur lit les
 * cookies, interdits dans ce cache. Ce module fait le minimum utile, par
 * processus : une valeur par clé, expirée après `ttlMs`, et un seul chargement
 * à la fois par clé (les appels concurrents partagent la même promesse).
 *
 * `CATALOGUE_CACHE_TTL_MS=0` désactive la conservation (les E2E sèment une
 * visite puis l'attendent sur le catalogue dans la seconde) ; le dédoublonnage
 * des lectures en vol, lui, reste actif.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const store = new Map<string, { expires: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export function cacheTtlMs(): number {
  const raw = process.env.CATALOGUE_CACHE_TTL_MS;
  if (raw !== undefined && raw !== '') {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return DEFAULT_TTL_MS;
}

export interface CachedOptions<T> {
  ttlMs?: number;
  /** Ne conserver que les valeurs qui le méritent (ex. : pas une liste vide née d'une panne). */
  keep?: (value: T) => boolean;
}

export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  options: CachedOptions<T> = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? cacheTtlMs();
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = loader()
    .then((value) => {
      if (ttlMs > 0 && (options.keep?.(value) ?? true)) {
        store.set(key, { expires: Date.now() + ttlMs, value });
      }
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

/** Vide tout — tests, ou après une écriture qui doit se voir tout de suite. */
export function clearCache(): void {
  store.clear();
  inflight.clear();
}
