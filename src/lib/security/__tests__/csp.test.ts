/**
 * La CSP est confrontée à ce que le code référence RÉELLEMENT : tout hôte
 * externe employé dans `src/` (hors épreuves et hors code serveur) doit être
 * couvert par une directive, sinon la ressource est bloquée en silence — et
 * inversement la politique ne doit porter ni `'unsafe-inline'` sur les
 * scripts, ni joker AWS.
 */

import fs from 'node:fs';
import path from 'node:path';
import { awsHosts, buildCsp, generateNonce } from '../csp';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const outputs = JSON.parse(fs.readFileSync(path.join(ROOT, 'amplify_outputs.json'), 'utf8'));

/**
 * Hôtes que le code référence sans que la CSP ait à les connaître : liens
 * `<a href>` (navigation, pas chargement), vocabulaires JSON-LD/SVG, domaines
 * de la marque, exemples d'épreuves, et appels faits CÔTÉ SERVEUR (routes API)
 * que la politique du navigateur ne concerne pas.
 */
const NOT_A_BROWSER_LOAD = new Set([
  'schema.org',
  'www.w3.org',
  'www.openstreetmap.org', // attribution Leaflet (lien)
  'www.google.com', // Street View : lien et iframe (frame-src le couvre)
  'murmure-visit.com',
  'murmure.app',
  'api.openrouteservice.org', // relais serveur /api/routing
  'example.com',
  'media.example',
  'example.test',
  's3.example.com',
  'blocked.com',
]);

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__') continue;
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      yield full;
    }
  }
}

function referencedHosts(): Set<string> {
  const hosts = new Set<string>();
  for (const file of walk(path.join(ROOT, 'src'))) {
    if (file.includes(`${path.sep}app${path.sep}api${path.sep}`)) continue; // serveur
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?:https?|wss?):\/\/([a-zA-Z0-9.*-]+\.[a-zA-Z]{2,})/g)) {
      hosts.add(m[1]);
    }
  }
  return hosts;
}

const csp = buildCsp({ nonce: 'TESTNONCE', isDevelopment: false, outputs });

function directive(name: string): string[] {
  const d = csp.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name} `));
  return d ? d.split(/\s+/).slice(1) : [];
}

function covered(host: string, sources: string[]): boolean {
  return sources.some((src) => {
    const m = src.match(/^(?:https?|wss?):\/\/(.+)$/);
    if (!m) return false;
    const pattern = m[1];
    if (pattern.startsWith('*.')) return host.endsWith(pattern.slice(1)) || host === pattern.slice(2);
    return host === pattern;
  });
}

describe('Content-Security-Policy', () => {
  it('never allows inline or wildcard-AWS scripts', () => {
    const script = directive('script-src');
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(script).toContain("'nonce-TESTNONCE'");
    expect(script).toContain("'strict-dynamic'");
    expect(csp).not.toMatch(/\*\.amazonaws\.com/);
  });

  it('pins the AWS hosts to the deployed backend', () => {
    const aws = awsHosts(outputs);
    const connect = directive('connect-src');
    expect(aws.appsync).toMatch(/^https:\/\/[a-z0-9]+\.appsync-api\.[a-z0-9-]+\.amazonaws\.com$/);
    expect(connect).toContain(aws.appsync);
    expect(connect).toContain(aws.appsyncRealtime);
    expect(connect).toContain(aws.cognitoIdp);
    expect(connect).toContain(aws.bucket);
    expect(directive('img-src')).toContain(aws.bucket);
    expect(directive('media-src')).toContain(aws.bucket);
  });

  it('covers every external host the browser-side code references', () => {
    const allSources = [
      ...directive('img-src'),
      ...directive('media-src'),
      ...directive('connect-src'),
      ...directive('frame-src'),
      ...directive('script-src'),
    ];
    const missing = [...referencedHosts()]
      .filter((host) => !NOT_A_BROWSER_LOAD.has(host))
      .filter((host) => !covered(host, allSources));
    expect(missing).toEqual([]);
  });

  it('keeps the hardening directives', () => {
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('generates a fresh base64 nonce each time', () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(a).not.toBe(b);
  });
});
