import { NextRequest, NextResponse } from 'next/server';
import { requireServerRole, ServerAuthError } from '@/lib/auth/server-token';
import { microserviceRateLimiter } from '@/lib/api/proxy-rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Relais serveur vers OpenRouteService.
 *
 * La clé ORS était `NEXT_PUBLIC_ORS_API_KEY`, donc inlinée dans le bundle
 * public : n'importe qui pouvait la lire dans le JavaScript servi et vider le
 * quota — les itinéraires piétons du Studio retombaient alors en « ligne
 * droite ». Elle vit désormais côté serveur (`ORS_API_KEY`, sans préfixe), et
 * seul un guide authentifié peut demander un tracé. La limite par compte du
 * proxy microservice est réutilisée : elle borne aussi ce relais.
 */
const ORS_BASE = 'https://api.openrouteservice.org';
const ORS_PROFILE = 'foot-hiking';
const TIMEOUT_MS = 15_000;

interface Point {
  lat: number;
  lng: number;
}

function isPoint(value: unknown): value is Point {
  return (
    !!value &&
    typeof value === 'object' &&
    Number.isFinite((value as Point).lat) &&
    Number.isFinite((value as Point).lng) &&
    Math.abs((value as Point).lat) <= 90 &&
    Math.abs((value as Point).lng) <= 180
  );
}

export async function POST(req: NextRequest) {
  let verified: Awaited<ReturnType<typeof requireServerRole>>;
  try {
    verified = await requireServerRole(req, ['guide', 'admin']);
  } catch (error) {
    if (error instanceof ServerAuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'Authentication unavailable' }, { status: 503 });
  }

  const verdict = microserviceRateLimiter.consume(`routing:${verified.payload.sub ?? 'anonyme'}`);
  if (!verdict.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Trop de demandes de tracé — réessayez dans quelques minutes.' },
      { status: 429, headers: { 'retry-after': String(verdict.retryAfterSeconds) } },
    );
  }

  const apiKey = process.env.ORS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'Routing unavailable' }, { status: 503 });
  }

  let payload: { from?: unknown; to?: unknown };
  try {
    payload = (await req.json()) as { from?: unknown; to?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!isPoint(payload.from) || !isPoint(payload.to)) {
    return NextResponse.json({ ok: false, error: 'from/to must be {lat,lng}' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(`${ORS_BASE}/v2/directions/${ORS_PROFILE}/geojson`, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/geo+json, application/json',
      },
      body: JSON.stringify({
        coordinates: [
          [payload.from.lng, payload.from.lat],
          [payload.to.lng, payload.to.lat],
        ],
        instructions: false,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError';
    return NextResponse.json(
      { ok: false, error: isAbort ? 'Routing timeout' : 'Routing unreachable' },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
