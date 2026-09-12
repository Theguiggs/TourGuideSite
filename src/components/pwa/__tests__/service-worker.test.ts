/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

function worker() {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const key = (r: string | Request) => typeof r === 'string' ? r : r.url;
  const cacheApi = {
    open: jest.fn(async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const data = stores.get(name)!;
      return { addAll: async (paths: string[]) => { for (const path of paths) data.set(path, new Response(path)); },
        match: async (r: string | Request) => data.get(key(r))?.clone(),
        put: async (r: Request, response: Response) => { data.set(key(r), response); },
        keys: async () => [...data.keys()], delete: async (r: string | Request) => data.delete(key(r)) };
    }),
    keys: async () => [...stores.keys()], delete: jest.fn(async (name: string) => stores.delete(name)),
  };
  const fetcher = jest.fn(async () => { const result = new Response('network'); Object.defineProperty(result, 'type', { value: 'basic' }); return result; });
  const skipWaiting = jest.fn(async () => {});
  const context = { URL, Response, caches: cacheApi, fetch: fetcher, self: { location: { origin: 'https://murmure.test' }, registration: { active: {} }, skipWaiting, clients: { claim: jest.fn() }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } } };
  runInNewContext(readFileSync(resolve('public/sw.js'), 'utf8'), context);
  async function event(name: string, fields = {}) {
    let result: Promise<unknown> | undefined;
    handlers[name]({ ...fields, waitUntil: (p: Promise<unknown>) => { result = p; }, respondWith: (p: Promise<unknown>) => { result = p; } });
    return result;
  }
  return { event, fetcher, stores, skipWaiting, cacheApi };
}

it.each([
  'https://bucket.s3.eu-west-1.amazonaws.com/audio?X-Amz-Signature=secret',
  'https://api.appsync-api.eu-west-1.amazonaws.com/graphql',
  'https://cognito-idp.eu-west-1.amazonaws.com/',
  'https://js.stripe.com/v3',
  'https://murmure.test/api/private',
  'https://murmure.test/_next/image?url=signed',
  'https://murmure.test/_next/static/a.js?X-Amz-Signature=secret',
  'https://murmure.test/account?_rsc=secret',
])('ne prend pas en charge ni ne stocke %s', async (url) => {
  const w = worker();
  expect(await w.event('fetch', { request: new Request(url) })).toBeUndefined();
  expect(w.cacheApi.open).not.toHaveBeenCalled();
});
it('ne cache ni Authorization ni POST même sous static', async () => {
  const w = worker();
  for (const options of [{ headers: { authorization: 'private' } }, { method: 'POST' }]) {
    await w.event('fetch', { request: new Request('https://murmure.test/_next/static/a.js', options) });
  }
  expect(w.cacheApi.open).not.toHaveBeenCalled();
});
it('précache le shell, attend le geste en mise à jour, ne supprime aucun cache étranger', async () => {
  const w = worker();
  await w.event('install');
  expect(w.skipWaiting).not.toHaveBeenCalled();
  expect([...w.stores.values()][0].has('/pwa/display.woff2')).toBe(true);
  w.stores.set('other-app', new Map());
  w.stores.set('murmure-shell-old', new Map());
  await w.event('activate');
  expect(w.stores.has('other-app')).toBe(true);
  expect(w.stores.has('murmure-shell-old')).toBe(false);
  await w.event('message', { data: { type: 'ACTIVATE_UPDATE' } });
  expect(w.skipWaiting).toHaveBeenCalledTimes(1);
});
it.each([['/mes-achats', '/offline/fr.html'], ['/en/account', '/offline/en.html']])('navigation %s sans réseau : shell localisé sans cache privé', async (path, offline) => {
  const w = worker();
  await w.event('install');
  w.fetcher.mockRejectedValue(new Error('offline'));
  const result = await w.event('fetch', { request: { url: `https://murmure.test${path}`, method: 'GET', mode: 'navigate', headers: new Headers() } }) as Response;
  expect(await result.text()).toBe(offline);
  expect([...w.stores.values()].some((data) => data.has(`https://murmure.test${path}`))).toBe(false);
});
it('une ressource statique publique est réutilisée, une page en ligne ne se conserve pas', async () => {
  const w = worker();
  const request = new Request('https://murmure.test/_next/static/chunk.js');
  await w.event('fetch', { request });
  await w.event('fetch', { request });
  expect(w.fetcher).toHaveBeenCalledTimes(1);
  await w.event('fetch', { request: { url: 'https://murmure.test/guide', method: 'GET', mode: 'navigate', headers: new Headers() } });
  expect([...w.stores.values()].some((data) => data.has('https://murmure.test/guide'))).toBe(false);
});

it.each(['private', 'no-store', 'redirect', 'error'])('ne conserve pas la réponse statique %s', async (kind) => {
  const w = worker();
  const result = new Response('response', { status: kind === 'error' ? 500 : 200, headers: { 'Cache-Control': kind } });
  Object.defineProperty(result, 'type', { value: 'basic' });
  if (kind === 'redirect') Object.defineProperty(result, 'redirected', { value: true });
  w.fetcher.mockResolvedValue(result);
  const request = new Request('https://murmure.test/_next/static/chunk.js');
  await w.event('fetch', { request });
  await w.event('fetch', { request });
  expect(w.fetcher).toHaveBeenCalledTimes(2);
  expect(w.stores.get('murmure-static-v1')?.size).toBe(0);
});
it.each([404, 503])('navigation HTTP %s : garde 404 et replie 5xx', async (status) => {
  const w = worker();
  await w.event('install');
  w.fetcher.mockResolvedValue(new Response('server', { status }));
  const result = await w.event('fetch', { request: { url: 'https://murmure.test/aide', method: 'GET', mode: 'navigate', headers: new Headers() } }) as Response;
  expect(result.status).toBe(status === 404 ? 404 : 200);
  expect(await result.text()).toBe(status === 404 ? 'server' : '/offline/fr.html');
});
it('borne les ressources à 120 et les conserve à l’activation suivante', async () => {
  const w = worker();
  for (let i = 0; i < 122; i++) await w.event('fetch', { request: new Request(`https://murmure.test/_next/static/${i}.js`) });
  expect(w.stores.get('murmure-static-v1')?.size).toBe(120);
  await w.event('activate');
  expect(w.stores.get('murmure-static-v1')?.size).toBe(120);
});
