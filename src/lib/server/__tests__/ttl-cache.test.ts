import { cacheTtlMs, cached, clearCache } from '../ttl-cache';

describe('ttl-cache', () => {
  beforeEach(() => {
    clearCache();
    delete process.env.CATALOGUE_CACHE_TTL_MS;
  });

  it('sert la valeur conservée tant qu’elle n’a pas expiré', async () => {
    const loader = jest.fn(async () => 'v1');
    expect(await cached('k', loader, { ttlMs: 1000 })).toBe('v1');
    expect(await cached('k', loader, { ttlMs: 1000 })).toBe('v1');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('ne charge qu’une fois quand plusieurs appels partent en même temps', async () => {
    let resolve: (v: string) => void = () => {};
    const loader = jest.fn(() => new Promise<string>((r) => { resolve = r; }));
    const a = cached('k', loader, { ttlMs: 0 });
    const b = cached('k', loader, { ttlMs: 0 });
    resolve('once');
    expect(await Promise.all([a, b])).toEqual(['once', 'once']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('avec une durée nulle, ne conserve rien entre deux appels successifs', async () => {
    const loader = jest.fn(async () => 'v');
    await cached('k', loader, { ttlMs: 0 });
    await cached('k', loader, { ttlMs: 0 });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('ne conserve pas ce que `keep` refuse (une liste vide née d’une panne)', async () => {
    const loader = jest.fn(async () => [] as string[]);
    await cached('k', loader, { ttlMs: 1000, keep: (v) => v.length > 0 });
    await cached('k', loader, { ttlMs: 1000, keep: (v) => v.length > 0 });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('expire', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const loader = jest.fn(async () => 'v');
    await cached('k', loader, { ttlMs: 100 });
    now.mockReturnValue(1_200);
    await cached('k', loader, { ttlMs: 100 });
    expect(loader).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });

  it('lit la durée dans l’environnement, 0 compris', () => {
    expect(cacheTtlMs()).toBe(300_000);
    process.env.CATALOGUE_CACHE_TTL_MS = '0';
    expect(cacheTtlMs()).toBe(0);
    process.env.CATALOGUE_CACHE_TTL_MS = 'abc';
    expect(cacheTtlMs()).toBe(300_000);
  });
});
