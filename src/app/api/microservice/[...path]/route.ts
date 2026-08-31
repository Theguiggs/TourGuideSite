import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole, ServerAuthError } from '@/lib/auth/server-token';
import {
  ENTETE_REFUS_DEPENSE,
  debiterSyntheseInterne,
  mesurerCorpsDeSynthese,
} from '@/lib/api/internal-spend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIMEOUT_MS = 30_000;
const MAX_REQUEST_BODY_BYTES = 1_000_000;
const JOB_PATH = /^v1\/jobs\/[a-z0-9-]{1,100}$/i;

/**
 * LE SEUL CHEMIN FACTURANT DE CE PROXY — story 16, tâche 5.
 *
 * `v1/tts/generate` fait facturer Azure au caractère. Les autres chemins
 * autorisés (`v1/translate/marianmt`, `v1/translate/batch`, `v1/silence-detect`,
 * les GET) tournent sur un modèle local gratuit ou ne facturent pas : les
 * débiter inventerait une dépense, ce qu'AD-16 §6 interdit autant que d'en
 * oublier une.
 */
const CHEMIN_FACTURANT = 'v1/tts/generate';

function isAllowedRequest(method: string, path: string): boolean {
  if (method === 'GET') {
    return path === 'health' || JOB_PATH.test(path);
  }
  if (method === 'POST') {
    return new Set([
      'v1/tts/generate',
      'v1/translate/marianmt',
      'v1/translate/batch',
      'v1/silence-detect',
    ]).has(path);
  }
  return false;
}

function getBaseUrl(): string {
  const raw = process.env.MICROSERVICE_URL ?? 'http://localhost:8000';
  return raw.replace(/\/+$/, '');
}

async function readBoundedBody(req: NextRequest): Promise<Uint8Array | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD' || !req.body) return undefined;

  const contentLength = req.headers.get('content-length');
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (!Number.isFinite(declaredBytes) || declaredBytes < 0) {
      throw new TypeError('Invalid Content-Length');
    }
    if (declaredBytes > MAX_REQUEST_BODY_BYTES) {
      throw new PayloadTooLargeError();
    }
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

class PayloadTooLargeError extends Error {}

/** Le jeton déjà vérifié par `requireServerRole`, tel quel — sans `Bearer`. */
function jetonPorteur(req: NextRequest): string {
  const brut = req.headers.get('authorization');
  const trouve = brut?.match(/^Bearer ([^\s]+)$/i);
  return trouve ? trouve[1] : '';
}

/**
 * UN REFUS QUI NOMME SA CAUSE — jamais un échec opaque.
 *
 * L'en-tête rend le refus TERMINAL côté client : `submitMicroserviceJob`
 * réessaie cinq fois sur 429, ce qui est juste face à la contre-pression du
 * microservice et faux face à une enveloppe épuisée, qui ne se vide pas d'elle-
 * même.
 */
function refusDeDepense(status: number, motif: string, message: string, code?: number) {
  return NextResponse.json(
    { ok: false, error: message, motif, ...(code === undefined ? {} : { code }) },
    { status, headers: { [ENTETE_REFUS_DEPENSE]: motif, 'cache-control': 'no-store' } },
  );
}

async function proxy(req: NextRequest, segments: string[]) {
  const requestedPath = segments.join('/');
  if (!isAllowedRequest(req.method, requestedPath)) {
    return NextResponse.json({ ok: false, error: 'Path not allowed' }, { status: 403 });
  }

  let verified: Awaited<ReturnType<typeof requireServerRole>>;
  try {
    verified = await requireServerRole(req, ['guide', 'admin']);
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'Authentication unavailable' }, { status: 503 });
  }

  const apiKey = process.env.MICROSERVICE_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json({ ok: false, error: 'Microservice unavailable' }, { status: 503 });
  }

  let body: Uint8Array | undefined;
  try {
    body = await readBoundedBody(req);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ ok: false, error: 'Payload too large' }, { status: 413 });
    }
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  // ─── DÉBITER D'ABORD, RELAYER ENSUITE ───
  //
  // AD-16 §2 : « un appel qui n'a pas débité ne part pas », panne comprise. Le
  // corps est mesuré sur une COPIE et relayé ensuite octet pour octet : le débit
  // ne réécrit rien. Il n'existe aucune mutation de relâchement pour ce chemin —
  // si le relais échoue après le débit, on sur-déclare, et c'est le sens
  // d'erreur voulu (le contraire effacerait le gaspillage que FR-21 veut voir).
  if (req.method === 'POST' && requestedPath === CHEMIN_FACTURANT) {
    const mesure = mesurerCorpsDeSynthese(body);
    if (!mesure.ok) {
      return refusDeDepense(
        400,
        mesure.motif,
        'Synthesis body carries no measurable "text" — refused rather than relayed uncounted (AD-16 §2).',
      );
    }

    const verdict = await debiterSyntheseInterne({
      jetonAcces: jetonPorteur(req),
      caracteres: mesure.caracteres,
      langue: mesure.langue,
      // LA TRACE EST LE COMPTE QUI DÉPENSE. Le proxy ne reçoit ni session Studio
      // ni segment — le corps ne porte que `text` et `language` —, et l'ajouter
      // au corps aurait changé ce qui est relayé. Le `sub` vérifié, lui, est déjà
      // là, tient dans les 64 caractères assainis du backend, et répond à la
      // seule question que le grand livre ne savait pas poser : QUI a dépensé.
      reference: verified.payload.sub ?? null,
    });

    if (!verdict.relayer) {
      return refusDeDepense(verdict.status, verdict.motif, verdict.message, verdict.code);
    }
  }

  const target = `${getBaseUrl()}/${requestedPath}`;
  const headers: Record<string, string> = { 'X-API-Key': apiKey };
  const contentType = req.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: body ? Buffer.from(body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    responseHeaders.set('cache-control', 'no-store');
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) responseHeaders.set('content-type', upstreamContentType);
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) responseHeaders.set('retry-after', retryAfter);

    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    return NextResponse.json(
      { ok: false, error: isAbort ? 'Microservice timeout' : 'Microservice unreachable' },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
