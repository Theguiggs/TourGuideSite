/**
 * Content-Security-Policy du portail — UNE seule définition, consommée par
 * `src/proxy.ts` (qui la pose sur chaque réponse avec un nonce frais) et par
 * l'épreuve `csp.test.ts` (qui la confronte aux hôtes réellement référencés).
 *
 * ─── Ce qui change par rapport à la politique précédente ────────────────────
 *  - `script-src` portait `'unsafe-inline'` : la politique autorisait
 *    exactement ce qu'une CSP doit bloquer, et un XSS lisait le jeton Cognito
 *    (en localStorage) pour obtenir l'accès guide ou admin. Place à un NONCE
 *    par requête et `'strict-dynamic'` : seuls les scripts que Next émet avec
 *    le nonce, et ceux qu'ils chargent eux-mêmes, s'exécutent.
 *  - `connect-src` acceptait un joker sur tout le domaine AWS : n'importe quel bucket
 *    S3 d'un attaquant était une destination d'exfiltration valide. Les hôtes
 *    sont désormais EXACTS, lus dans `amplify_outputs.json` — ce que le portail
 *    déployé utilise réellement.
 *
 * Les hôtes de Stripe suivent la documentation Stripe (Payment Element) : sans
 * `*.js.stripe.com` et `m.stripe.network`, certains moyens de paiement et les
 * signaux anti-fraude étaient bloqués en silence.
 */

export interface CspInputs {
  nonce: string;
  isDevelopment: boolean;
  /** Contenu de `amplify_outputs.json` (les champs utiles seulement). */
  outputs: {
    data?: { url?: string; aws_region?: string };
    auth?: { aws_region?: string };
    storage?: { bucket_name?: string; aws_region?: string };
  };
}

/** Hôtes AWS EXACTS dérivés des sorties Amplify. Aucun joker. */
export function awsHosts(outputs: CspInputs['outputs']): {
  appsync: string | null;
  appsyncRealtime: string | null;
  cognitoIdp: string;
  cognitoIdentity: string;
  bucket: string | null;
} {
  const region = outputs.data?.aws_region ?? outputs.auth?.aws_region ?? 'us-east-1';
  let appsync: string | null = null;
  let appsyncRealtime: string | null = null;
  if (outputs.data?.url) {
    try {
      const host = new URL(outputs.data.url).host;
      appsync = `https://${host}`;
      appsyncRealtime = `wss://${host.replace('appsync-api', 'appsync-realtime-api')}`;
    } catch {
      appsync = null;
    }
  }
  const bucketRegion = outputs.storage?.aws_region ?? region;
  const bucket = outputs.storage?.bucket_name
    ? `https://${outputs.storage.bucket_name}.s3.${bucketRegion}.amazonaws.com`
    : null;
  return {
    appsync,
    appsyncRealtime,
    cognitoIdp: `https://cognito-idp.${region}.amazonaws.com`,
    cognitoIdentity: `https://cognito-identity.${region}.amazonaws.com`,
    bucket,
  };
}

const compact = (parts: Array<string | null | undefined | false>): string =>
  parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');

export function buildCsp({ nonce, isDevelopment, outputs }: CspInputs): string {
  const aws = awsHosts(outputs);
  const directives = [
    "default-src 'self'",
    compact([
      'script-src',
      `'nonce-${nonce}'`,
      // Avec `'strict-dynamic'`, les navigateurs modernes ignorent `'self'` et
      // les hôtes : ils ne servent qu'aux anciens navigateurs.
      "'strict-dynamic'",
      "'self'",
      'https://js.stripe.com',
      'https://*.js.stripe.com',
      isDevelopment && "'unsafe-eval'",
    ]),
    // Tailwind, Leaflet et les styles inline de Next : `'unsafe-inline'` reste
    // nécessaire pour les STYLES, ce qui n'ouvre pas l'exécution de script.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    compact([
      'img-src',
      "'self'",
      'data:',
      'blob:',
      aws.bucket,
      'https://*.tile.openstreetmap.org',
      'https://flagcdn.com',
      'https://api.qrserver.com',
      'https://*.stripe.com',
    ]),
    compact(['media-src', "'self'", 'data:', 'blob:', aws.bucket]),
    compact([
      'connect-src',
      "'self'",
      aws.appsync,
      aws.appsyncRealtime,
      aws.cognitoIdp,
      aws.cognitoIdentity,
      aws.bucket,
      'https://api2.amplitude.com',
      'https://api.eu.amplitude.com',
      // Configuration distante du SDK Amplitude (session replay / autocapture).
      // Absente de l'ancienne politique aussi : l'appel était bloqué en silence
      // à chaque page, révélé par la vérification navigateur du lot 2.
      'https://sr-client-cfg.amplitude.com',
      'https://sr-client-cfg.eu.amplitude.com',
      'https://api.stripe.com',
      'https://*.stripe.com',
      'https://nominatim.openstreetmap.org',
      isDevelopment && 'http://localhost:*',
      isDevelopment && 'ws://localhost:*',
    ]),
    compact([
      'frame-src',
      "'self'",
      'https://js.stripe.com',
      'https://*.js.stripe.com',
      'https://hooks.stripe.com',
      'https://m.stripe.network',
      'https://www.google.com',
    ]),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    !isDevelopment && 'upgrade-insecure-requests',
  ];
  return directives.filter((d): d is string => typeof d === 'string' && d.length > 0).join('; ');
}

/** Nonce base64 de 128 bits — utilisable dans le runtime edge comme en Node. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
